// instrumentation-node.js — Node.js-only background jobs, started from
// instrumentation.js. Kept in a separate file so the edge runtime build never
// sees Node built-ins.
export async function startBackgroundJobs() {
  await scheduleDatabaseBackups();
  // Only in the real server (Docker/production) with storage configured,
  // unless explicitly enabled for testing with PHOTO_CLEANUP=1.
  const enabled =
    process.env.PHOTO_CLEANUP === "1" ||
    (process.env.NODE_ENV === "production" && process.env.PHOTO_CLEANUP !== "0");
  if (!enabled || !process.env.B2_BUCKET_NAME) return;

  const { runPhotoCleanup } = await import("./lib/photo-cleanup.js");
  const SIX_HOURS = 6 * 60 * 60 * 1000;
  let running = false;
  const run = async () => {
    if (running) return;
    running = true;
    try {
      await runPhotoCleanup();
    } catch (e) {
      console.error("photo cleanup failed:", e);
    } finally {
      running = false;
    }
  };
  // First run a few minutes after start (let the app warm up), then every 6 h.
  setTimeout(run, 5 * 60 * 1000).unref?.();
  setInterval(run, SIX_HOURS).unref?.();
}

// Automatic encrypted database backups (see lib/scheduled-backup.js).
// Checks every 10 minutes whether today's backup is due, so a backup missed
// while the server was down runs as soon as it is back.
async function scheduleDatabaseBackups() {
  const { settings, tick } = await import("./lib/scheduled-backup.js");
  const cfg = settings();
  if (!cfg.scheduleEnabled) return;
  if (!cfg.passphraseOk) {
    console.warn("Automatic database backups are OFF: set BACKUP_PASSPHRASE (12+ characters) in .env.");
    return;
  }
  console.log(`Automatic database backups: daily at ${cfg.timeLabel}.`);
  const run = () => tick().catch((e) => console.error("backup scheduler:", e.message));
  setTimeout(run, 2 * 60 * 1000).unref?.();
  setInterval(run, 10 * 60 * 1000).unref?.();
}
