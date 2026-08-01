// lib/backup-destination.js
// Where scheduled database backups are stored. Chosen with BACKUP_DESTINATION:
//   b2     (default) Backblaze B2, bucket BACKUP_B2_BUCKET or B2_BUCKET_NAME
//   local  a folder on the server (BACKUP_LOCAL_DIR), e.g. a mounted drive
// To move backups somewhere else later, add another destination with the
// same four methods and select it with BACKUP_DESTINATION.
//
// Interface:
//   name: string
//   put(key, readableStream): Promise<void>
//   list(prefix): Promise<{ key, size, lastModified }[]>
//   get(key): Promise<Readable>
//   remove(keys): Promise<void>
import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";

export function b2Destination() {
  const bucket = process.env.BACKUP_B2_BUCKET || process.env.B2_BUCKET_NAME;
  if (!bucket) throw new Error("No Backblaze bucket configured (BACKUP_B2_BUCKET or B2_BUCKET_NAME).");
  let s3;
  const client = async () => {
    const b2 = await import("@/lib/b2-storage");
    s3 ??= b2.b2Client();
    return { s3, b2 };
  };
  return {
    name: `Backblaze B2 (${bucket})`,
    async put(key, stream) {
      const { s3 } = await client();
      // Managed upload: streams in parts, aborts the multipart upload on error.
      await s3
        .upload(
          { Bucket: bucket, Key: key, Body: stream, ContentType: "application/octet-stream" },
          { partSize: 16 * 1024 * 1024, queueSize: 2 },
        )
        .promise();
    },
    async list(prefix) {
      const { s3, b2 } = await client();
      return b2.listAll(s3, bucket, prefix);
    },
    async get(key) {
      const { s3 } = await client();
      return s3.getObject({ Bucket: bucket, Key: key }).createReadStream();
    },
    async remove(keys) {
      if (!keys.length) return;
      const { s3, b2 } = await client();
      await b2.removeAllVersions(s3, bucket, keys);
    },
  };
}

export function localDestination(dir = process.env.BACKUP_LOCAL_DIR) {
  if (!dir) throw new Error("BACKUP_LOCAL_DIR is not set.");
  const full = (key) => {
    const p = path.resolve(dir, key);
    if (!p.startsWith(path.resolve(dir) + path.sep)) throw new Error("Invalid backup key");
    return p;
  };
  return {
    name: `Server folder (${dir})`,
    async put(key, stream) {
      const target = full(key);
      await fs.promises.mkdir(path.dirname(target), { recursive: true });
      const tmp = `${target}.partial`;
      try {
        await pipeline(stream, fs.createWriteStream(tmp, { mode: 0o600 }));
        await fs.promises.rename(tmp, target);
      } catch (e) {
        await fs.promises.rm(tmp, { force: true });
        throw e;
      }
    },
    async list(prefix) {
      const base = full(prefix.endsWith("/") ? `${prefix}x` : prefix);
      const folder = path.dirname(base);
      const entries = await fs.promises.readdir(folder).catch(() => []);
      const out = [];
      for (const name of entries) {
        if (name.endsWith(".partial")) continue;
        const st = await fs.promises.stat(path.join(folder, name));
        if (st.isFile()) out.push({ key: path.posix.join(path.posix.dirname(prefix + "x"), name), size: st.size, lastModified: st.mtime });
      }
      return out;
    },
    async get(key) {
      return fs.createReadStream(full(key));
    },
    async remove(keys) {
      for (const k of keys) await fs.promises.rm(full(k), { force: true });
    },
  };
}

export function getBackupDestination() {
  const kind = (process.env.BACKUP_DESTINATION || "b2").toLowerCase();
  if (kind === "b2") return b2Destination();
  if (kind === "local") return localDestination();
  throw new Error(`Unknown BACKUP_DESTINATION "${kind}"`);
}
