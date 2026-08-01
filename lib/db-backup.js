// lib/db-backup.js
// Streams a full PostgreSQL backup (plain SQL from pg_dump), gzip-compressed
// and optionally encrypted with a passphrase.
//
// Encryption uses the OpenSSL "enc" file format (AES-256-CBC, PBKDF2-SHA256),
// so a backup can be decrypted on any machine without this app:
//   openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -md sha256 \
//     -in backup.sql.gz.enc -out backup.sql.gz
import { spawn } from "child_process";
import crypto from "crypto";
import zlib from "zlib";
import { Transform } from "stream";

export const PBKDF2_ITERATIONS = 200_000;

/** pg_dump connection settings from DATABASE_URL (password via env, never argv). */
export function pgEnv(databaseUrl = process.env.DATABASE_URL) {
  if (!databaseUrl) throw new Error("DATABASE_URL is not set");
  const u = new URL(databaseUrl);
  return {
    PGHOST: u.hostname,
    PGPORT: u.port || "5432",
    PGUSER: decodeURIComponent(u.username),
    PGPASSWORD: decodeURIComponent(u.password),
    PGDATABASE: decodeURIComponent(u.pathname.replace(/^\//, "")),
    // Prisma's ?schema=public is not a libpq option; the default schema is used.
  };
}

/**
 * Removes settings that newer pg_dump versions emit but older servers reject
 * on restore (e.g. PostgreSQL 17's `SET transaction_timeout`), so the file
 * restores cleanly into the PostgreSQL 15 server used here.
 */
function compatFilter() {
  let head = "";
  let passthrough = false;
  return new Transform({
    transform(chunk, _enc, cb) {
      if (passthrough) return cb(null, chunk);
      head += chunk.toString("utf8");
      // The SET lines are all in the first few KB.
      if (head.length < 16_384) return cb();
      passthrough = true;
      cb(null, Buffer.from(clean(head), "utf8"));
    },
    flush(cb) {
      if (!passthrough && head) this.push(Buffer.from(clean(head), "utf8"));
      cb();
    },
  });
  function clean(text) {
    return text.replace(/^SET transaction_timeout = 0;\r?\n/m, "");
  }
}

/** OpenSSL-compatible AES-256-CBC + PBKDF2 encryption stream. */
export function encryptStream(passphrase) {
  const salt = crypto.randomBytes(8);
  const keyIv = crypto.pbkdf2Sync(passphrase, salt, PBKDF2_ITERATIONS, 48, "sha256");
  const cipher = crypto.createCipheriv("aes-256-cbc", keyIv.subarray(0, 32), keyIv.subarray(32, 48));
  let headerSent = false;
  return new Transform({
    transform(chunk, _enc, cb) {
      const out = cipher.update(chunk);
      if (!headerSent) {
        headerSent = true;
        return cb(null, Buffer.concat([Buffer.from("Salted__", "ascii"), salt, out]));
      }
      cb(null, out);
    },
    flush(cb) {
      const last = cipher.final();
      this.push(headerSent ? last : Buffer.concat([Buffer.from("Salted__", "ascii"), salt, last]));
      cb();
    },
  });
}

/**
 * Starts pg_dump and resolves once it has produced output (or rejects if it
 * fails before that, e.g. wrong credentials / server unreachable), so the
 * caller can still answer with a proper error status.
 *
 * @returns {Promise<{ stream: import('stream').Readable, done: Promise<void>, abort: () => void }>}
 */
export function startBackup({ passphrase } = {}) {
  return new Promise((resolve, reject) => {
    let env;
    try {
      env = { ...process.env, ...pgEnv() };
    } catch (e) {
      return reject(e);
    }
    const child = spawn(
      "pg_dump",
      ["--format=plain", "--no-owner", "--no-privileges", "--clean", "--if-exists", "--encoding=UTF8"],
      { env, stdio: ["ignore", "pipe", "pipe"] },
    );
    let stderr = "";
    child.stderr.on("data", (d) => (stderr = (stderr + d.toString()).slice(-4000)));

    const filtered = child.stdout.pipe(compatFilter());
    const gz = filtered.pipe(zlib.createGzip({ level: 6 }));
    const out = passphrase ? gz.pipe(encryptStream(passphrase)) : gz;

    let started = false;
    const done = new Promise((res, rej) => {
      child.on("close", (code) => {
        if (code === 0) return res();
        const err = new Error(`pg_dump exited with code ${code}: ${stderr.trim()}`);
        if (started) out.destroy(err); // abort the download instead of sending a truncated file
        rej(err);
      });
    });

    child.on("error", (e) => {
      reject(e.code === "ENOENT" ? new Error("pg_dump is not installed on the server") : e);
    });
    child.stdout.once("data", () => {
      started = true;
      resolve({ stream: out, done, abort: () => child.kill("SIGTERM") });
    });
    done.catch((e) => {
      if (!started) reject(e);
    });
  });
}
