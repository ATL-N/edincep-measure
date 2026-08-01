// lib/scheduled-backup.js
// Automatic, encrypted database backups to the configured destination
// (Backblaze B2 by default, see lib/backup-destination.js).
//
// Settings (.env):
//   BACKUP_PASSPHRASE   required — encrypts every automatic backup (12+ chars).
//                       Keep a copy somewhere other than the server!
//   BACKUP_TIME         daily time in UTC, "HH:MM" (default 02:00)
//   BACKUP_SCHEDULE     "off" disables the schedule; "on" forces it outside production
//   BACKUP_KEEP_DAILY / BACKUP_KEEP_WEEKLY / BACKUP_KEEP_MONTHLY
//                       how many of each to keep (default 14 / 8 / 12)
//   BACKUP_DESTINATION, BACKUP_B2_BUCKET, BACKUP_LOCAL_DIR — see backup-destination.js
import crypto from "crypto";
import { Transform } from "stream";

export const BACKUP_PREFIX = "db-backups/";
const KEY_RE = /^db-backups\/edmeasure-(\d{8})-(\d{6})-[a-f0-9]{8,}\.sql\.gz\.enc$/;

export function isBackupKey(key) {
  return typeof key === "string" && KEY_RE.test(key);
}

/** Backup time encoded in the file name (UTC), or null. */
export function keyDate(key) {
  const m = KEY_RE.exec(key);
  if (!m) return null;
  const [d, t] = [m[1], m[2]];
  return new Date(
    Date.UTC(+d.slice(0, 4), +d.slice(4, 6) - 1, +d.slice(6, 8), +t.slice(0, 2), +t.slice(2, 4), +t.slice(4, 6)),
  );
}

/** New object key. The random suffix keeps names unguessable even in a public bucket. */
export function newBackupKey(now = new Date()) {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
  return `${BACKUP_PREFIX}edmeasure-${stamp}-${crypto.randomBytes(8).toString("hex")}.sql.gz.enc`;
}

export function settings(env = process.env) {
  const time = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(env.BACKUP_TIME || "02:00") || [null, "2", "0"];
  const int = (v, d) => (Number.isFinite(parseInt(v, 10)) && parseInt(v, 10) >= 0 ? parseInt(v, 10) : d);
  const passphrase = env.BACKUP_PASSPHRASE || "";
  const mode = (env.BACKUP_SCHEDULE || "").toLowerCase();
  return {
    hour: +time[1],
    minute: +time[2],
    timeLabel: `${String(+time[1]).padStart(2, "0")}:${time[2].padStart(2, "0")} UTC`,
    passphrase,
    passphraseOk: passphrase.length >= 12,
    keep: {
      daily: int(env.BACKUP_KEEP_DAILY, 14),
      weekly: int(env.BACKUP_KEEP_WEEKLY, 8),
      monthly: int(env.BACKUP_KEEP_MONTHLY, 12),
    },
    scheduleEnabled: mode === "off" ? false : mode === "on" || env.NODE_ENV === "production",
  };
}

/** The most recent scheduled time at or before `now` (UTC). */
export function lastScheduledTime(now, hour, minute) {
  const t = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), hour, minute));
  if (t > now) t.setUTCDate(t.getUTCDate() - 1);
  return t;
}

export function nextScheduledTime(now, hour, minute) {
  const t = lastScheduledTime(now, hour, minute);
  t.setUTCDate(t.getUTCDate() + 1);
  return t;
}

/**
 * Whether a backup should run now: none has succeeded since the last
 * scheduled time, and (after a failure) at least an hour has passed.
 */
export function isDue(now, lastSuccessAt, lastAttemptAt, hour, minute) {
  const slot = lastScheduledTime(now, hour, minute);
  if (lastSuccessAt && lastSuccessAt >= slot) return false;
  if (lastAttemptAt && now - lastAttemptAt < 60 * 60 * 1000) return false;
  return true;
}

const isoWeek = (d) => {
  const t = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y = t.getUTCFullYear();
  const week = Math.ceil(((t - Date.UTC(y, 0, 1)) / 86400000 + 1) / 7);
  return `${y}-W${week}`;
};

/**
 * Grandfather-father-son retention. Keeps everything from the last 48 hours
 * (so a manual "back up now" isn't replaced by that night's backup), then the
 * newest backup of each of the last `daily` days, `weekly` ISO weeks and
 * `monthly` months. Returns { keep: Map<key, reasons[]>, remove: key[] }.
 * Never removes the newest backup, and ignores files that aren't backups.
 */
export function planRetention(items, keep, now = new Date()) {
  const backups = items
    .map((i) => ({ ...i, date: keyDate(i.key) }))
    .filter((i) => i.date)
    .sort((a, b) => b.date - a.date);
  const kept = new Map();
  const tag = (key, why) => kept.set(key, [...(kept.get(key) || []), why]);
  const bucket = (fn, limit, label) => {
    const seen = new Set();
    for (const b of backups) {
      const k = fn(b.date);
      if (seen.has(k)) continue;
      if (seen.size >= limit) break;
      seen.add(k);
      tag(b.key, label);
    }
  };
  bucket((d) => d.toISOString().slice(0, 10), keep.daily, "daily");
  bucket(isoWeek, keep.weekly, "weekly");
  bucket((d) => d.toISOString().slice(0, 7), keep.monthly, "monthly");
  if (backups[0]) tag(backups[0].key, "latest");
  for (const b of backups) if (now - b.date < 48 * 60 * 60 * 1000) tag(b.key, "recent");
  return { keep: kept, remove: backups.filter((b) => !kept.has(b.key)).map((b) => b.key) };
}

function byteCounter() {
  const counter = new Transform({
    transform(chunk, _e, cb) {
      counter.bytes += chunk.length;
      cb(null, chunk);
    },
  });
  counter.bytes = 0;
  return counter;
}

// ---------------------------------------------------------------------------
// Running a backup

const state = globalThis.__edmBackupState ?? (globalThis.__edmBackupState = {
  running: false,
  lastAttemptAt: null,
  lastSuccessAt: null, // cached from the destination listing
  lastResult: null,
  lastAlertAt: 0,
});

export function backupState() {
  return state;
}

/**
 * Makes one backup, uploads it, checks it arrived intact, and prunes old ones.
 * deps lets tests replace the database dump, destination and log writer.
 */
export async function runScheduledBackup({ trigger = "schedule", userId = null, deps } = {}) {
  if (state.running) return { ok: false, skipped: true, error: "A backup is already running." };
  state.running = true;
  state.lastAttemptAt = new Date();
  const started = Date.now();
  const cfg = settings();
  let d;
  let key;
  try {
    d = deps || (await realDeps());
    if (!cfg.passphraseOk) throw new Error("BACKUP_PASSPHRASE is missing or shorter than 12 characters.");
    key = newBackupKey();
    const backup = await d.startBackup({ passphrase: cfg.passphrase });
    const counter = byteCounter();
    // A failed dump must abort the upload (not leave it waiting forever).
    backup.stream.on("error", (err) => counter.destroy(err));
    const uploading = d.destination.put(key, backup.stream.pipe(counter));
    try {
      await Promise.all([uploading, backup.done]);
    } catch (err) {
      backup.abort?.();
      counter.destroy();
      await uploading.catch(() => {});
      throw err;
    }

    // Verify: the stored file must exist with exactly the bytes we produced.
    const stored = (await d.destination.list(key)).find((i) => i.key === key);
    if (!stored || stored.size !== counter.bytes) {
      await d.destination.remove([key]).catch(() => {});
      throw new Error(`Uploaded file check failed (expected ${counter.bytes} bytes, found ${stored?.size ?? "none"}).`);
    }

    let removed = [];
    try {
      const all = await d.destination.list(BACKUP_PREFIX);
      removed = planRetention(all, cfg.keep).remove;
      if (removed.length) await d.destination.remove(removed);
    } catch (e) {
      console.error("Backup retention cleanup failed:", e.message); // the backup itself is fine
    }

    const result = { ok: true, key, size: counter.bytes, removed: removed.length, ms: Date.now() - started, at: new Date(), trigger };
    state.lastSuccessAt = new Date(started);
    state.lastResult = result;
    await d
      .log("DATABASE_BACKUP_SCHEDULED", userId, { key, size: counter.bytes, removed: removed.length, trigger, destination: d.destination.name })
      .catch(() => {});
    console.log(`Database backup stored: ${key} (${counter.bytes} bytes, ${removed.length} old removed)`);
    return result;
  } catch (e) {
    const result = { ok: false, error: e.message, ms: Date.now() - started, at: new Date(), trigger };
    state.lastResult = result;
    console.error("Database backup failed:", e.message);
    if (key && d) await d.destination.remove([key]).catch(() => {});
    await d?.log("DATABASE_BACKUP_FAILED", userId, { error: e.message.slice(0, 500), trigger }).catch(() => {});
    if (d?.alert && Date.now() - state.lastAlertAt > 20 * 60 * 60 * 1000) {
      state.lastAlertAt = Date.now();
      await d.alert(e.message).catch((err) => console.error("Backup failure alert not sent:", err.message));
    }
    return result;
  } finally {
    state.running = false;
  }
}

async function realDeps() {
  const [{ prisma }, { startBackup }, { getBackupDestination }] = await Promise.all([
    import("@/app/lib/prisma.js"),
    import("@/lib/db-backup"),
    import("@/lib/backup-destination"),
  ]);
  return {
    startBackup,
    destination: getBackupDestination(),
    log: (action, userId, details) => prisma.log.create({ data: { action, userId, details } }),
    alert: async (message) => {
      if (!process.env.RESEND_API_KEY) return;
      const admins = await prisma.user.findMany({
        where: { role: "ADMIN", status: "ACTIVE", email: { not: null } },
        select: { email: true },
      });
      if (!admins.length) return;
      const { Resend } = await import("resend");
      await new Resend(process.env.RESEND_API_KEY).emails.send({
        from: process.env.FROM_EMAIL || "onboarding@resend.dev",
        to: admins.map((a) => a.email),
        subject: "EdMeasure: automatic database backup failed",
        text:
          `Last night's automatic database backup failed:\n\n${message}\n\n` +
          `It will be retried automatically. You can also open Admin → Backup to run one now.`,
      });
    },
  };
}

/** Latest successful backup time, from the destination (cached in memory). */
export async function lastSuccessfulBackup(destination) {
  if (state.lastSuccessAt) return state.lastSuccessAt;
  const items = await destination.list(BACKUP_PREFIX);
  const dates = items.map((i) => keyDate(i.key)).filter(Boolean).sort((a, b) => b - a);
  state.lastSuccessAt = dates[0] || null;
  return state.lastSuccessAt;
}

/** Called periodically by instrumentation.js. */
export async function tick(now = new Date()) {
  const cfg = settings();
  if (!cfg.scheduleEnabled || state.running) return;
  if (!cfg.passphraseOk) return; // reported on the admin page
  const { getBackupDestination } = await import("@/lib/backup-destination");
  const last = await lastSuccessfulBackup(getBackupDestination());
  if (isDue(now, last, state.lastAttemptAt, cfg.hour, cfg.minute)) await runScheduledBackup();
}
