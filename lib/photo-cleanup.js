// lib/photo-cleanup.js
// Removes body photos that are no longer needed:
//  1. ABANDONED: uploaded (share link or designer) but never attached to a
//     saved measurement within ABANDON_AFTER_DAYS (e.g. the client closed the
//     form without submitting).
//  2. ORPHANED FILES: objects in storage under body-photos/ with no database
//     row (e.g. the row was cascade-deleted with its client). Only files older
//     than ABANDON_AFTER_DAYS are touched, so in-flight uploads are safe.
//  3. DELETED ORDERS: photos of measurements soft-deleted more than
//     DELETED_RETENTION_DAYS ago (privacy: body photos aren't kept forever).
//
// Storage and database access are injected so the logic can be tested
// without Backblaze or Postgres.

export const ABANDON_AFTER_DAYS = 3;
export const DELETED_RETENTION_DAYS = 30;
const PREFIX = "body-photos/";
const BATCH = 200;

const daysAgo = (now, days) => new Date(now.getTime() - days * 24 * 60 * 60 * 1000);

/**
 * @param {{
 *   db: { findPhotos(where, take): Promise<{id:string, storageKey:string}[]>,
 *         deletePhotos(ids: string[]): Promise<number>,
 *         existingKeys(keys: string[]): Promise<Set<string>> },
 *   storage: { list(prefix: string, token?: string): Promise<{ items: {key:string, lastModified: Date}[], next?: string }>,
 *              remove(keys: string[]): Promise<void> },
 *   now?: Date,
 *   dryRun?: boolean,
 *   log?: (msg: string) => void,
 * }} deps
 */
export async function cleanupPhotos({ db, storage, now = new Date(), dryRun = false, log = () => {} }) {
  const report = { abandoned: 0, deletedOrders: 0, orphanFiles: 0, errors: 0 };
  const abandonCutoff = daysAgo(now, ABANDON_AFTER_DAYS);
  const deletedCutoff = daysAgo(now, DELETED_RETENTION_DAYS);

  async function purge(where, counter) {
    // Loop in batches until nothing matches (or, in a dry run, count once).
    for (;;) {
      const rows = await db.findPhotos(where, BATCH);
      if (!rows.length) break;
      if (dryRun) { report[counter] += rows.length; break; }
      try {
        // Storage first: if that fails the row stays and we retry next run,
        // so we never lose track of a file.
        await storage.remove(rows.map((r) => r.storageKey));
        report[counter] += await db.deletePhotos(rows.map((r) => r.id));
      } catch (e) {
        report.errors++;
        log(`photo cleanup: ${counter} batch failed: ${e.message}`);
        break;
      }
      if (rows.length < BATCH) break;
    }
  }

  // 1. Never attached to a measurement.
  await purge({ measurementId: null, createdAt: { lt: abandonCutoff } }, "abandoned");

  // 3. Orders deleted (soft) long enough ago.
  await purge(
    { measurement: { status: "DELETED", updatedAt: { lt: deletedCutoff } } },
    "deletedOrders",
  );

  // 2. Files in storage nobody references any more.
  let token;
  do {
    let page;
    try {
      page = await storage.list(PREFIX, token);
    } catch (e) {
      report.errors++;
      log(`photo cleanup: listing storage failed: ${e.message}`);
      break;
    }
    const old = page.items.filter((i) => i.lastModified < abandonCutoff).map((i) => i.key);
    if (old.length) {
      const known = await db.existingKeys(old);
      const orphans = old.filter((k) => !known.has(k));
      if (orphans.length) {
        if (!dryRun) {
          try {
            await storage.remove(orphans);
          } catch (e) {
            report.errors++;
            log(`photo cleanup: removing orphans failed: ${e.message}`);
            break;
          }
        }
        report.orphanFiles += orphans.length;
      }
    }
    token = page.next;
  } while (token);

  log(`photo cleanup${dryRun ? " (dry run)" : ""}: ${JSON.stringify(report)}`);
  return report;
}

// ---------------------------------------------------------------------------
// Real implementations (Prisma + Backblaze B2 via the S3 API)
// ---------------------------------------------------------------------------

export async function realDeps() {
  const [{ prisma }, b2] = await Promise.all([import("@/app/lib/prisma.js"), import("@/lib/b2-storage")]);
  const s3 = b2.b2Client();
  const Bucket = process.env.B2_BUCKET_NAME;

  return {
    db: {
      findPhotos: (where, take) =>
        prisma.measurementPhoto.findMany({ where, take, select: { id: true, storageKey: true } }),
      deletePhotos: async (ids) => (await prisma.measurementPhoto.deleteMany({ where: { id: { in: ids } } })).count,
      existingKeys: async (keys) =>
        new Set(
          (await prisma.measurementPhoto.findMany({ where: { storageKey: { in: keys } }, select: { storageKey: true } }))
            .map((r) => r.storageKey),
        ),
    },
    storage: {
      list: (prefix, token) => b2.listPage(s3, Bucket, prefix, token),
      remove: (keys) => b2.removeAllVersions(s3, Bucket, keys),
    },
  };
}

/** Runs the cleanup against the real database and storage. */
export async function runPhotoCleanup({ dryRun = false } = {}) {
  const deps = await realDeps();
  return cleanupPhotos({ ...deps, dryRun, log: (m) => console.log(m) });
}
