// GET  /api/admin/backup/scheduled — automatic backup settings, status and stored backups.
// POST /api/admin/backup/scheduled — start a backup to the destination now.
import { NextResponse } from "next/server";
import { prisma } from "@/app/lib/prisma.js";
import { isRateLimited } from "@/app/lib/rate-limiter";
import { fail, requireAdmin, clientIp } from "@/lib/admin-guard";
import { getBackupDestination } from "@/lib/backup-destination";
import {
  BACKUP_PREFIX, backupState, keyDate, nextScheduledTime, planRetention, runScheduledBackup, settings,
} from "@/lib/scheduled-backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request) {
  const { response } = await requireAdmin(request);
  if (response) return response;

  const cfg = settings();
  const state = backupState();
  let destination = null;
  let backups = [];
  let listError = null;
  try {
    const dest = getBackupDestination();
    destination = dest.name;
    const items = await dest.list(BACKUP_PREFIX);
    const { keep } = planRetention(items, cfg.keep);
    backups = items
      .map((i) => ({ key: i.key, size: i.size, date: keyDate(i.key), kept: keep.get(i.key) || [] }))
      .filter((b) => b.date)
      .sort((a, b) => b.date - a.date);
  } catch (e) {
    listError = e.message;
  }

  // Persisted history (survives restarts): last success and last failure.
  const [lastOk, lastFail] = await Promise.all(
    ["DATABASE_BACKUP_SCHEDULED", "DATABASE_BACKUP_FAILED"].map((action) =>
      prisma.log.findFirst({ where: { action }, orderBy: { createdAt: "desc" }, select: { createdAt: true, details: true } }),
    ),
  );

  return NextResponse.json(
    {
      configured: cfg.passphraseOk && !listError,
      passphraseOk: cfg.passphraseOk,
      scheduleEnabled: cfg.scheduleEnabled,
      time: cfg.timeLabel,
      nextRun: cfg.scheduleEnabled && cfg.passphraseOk ? nextScheduledTime(new Date(), cfg.hour, cfg.minute) : null,
      keep: cfg.keep,
      destination,
      listError,
      running: state.running,
      lastSuccess: lastOk ? { at: lastOk.createdAt, ...lastOk.details } : null,
      lastFailure:
        lastFail && (!lastOk || lastFail.createdAt > lastOk.createdAt)
          ? { at: lastFail.createdAt, error: lastFail.details?.error }
          : null,
      backups,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(request) {
  const { admin, response } = await requireAdmin(request);
  if (response) return response;

  const limit = await isRateLimited(`db_backup_run:${admin.id}`, 4, 60 * 60);
  if (limit.isLimited) return fail(429, "Too many backups in the last hour. Please wait a little.");
  if (backupState().running) return fail(409, "A backup is already running.");
  if (!settings().passphraseOk) return fail(400, "Set BACKUP_PASSPHRASE (12+ characters) on the server first.");

  await prisma.log
    .create({ data: { userId: admin.id, action: "DATABASE_BACKUP_RUN_NOW", ipAddress: clientIp(request) } })
    .catch(() => {});
  // Runs in the background; the page polls GET for the result.
  runScheduledBackup({ trigger: "manual", userId: admin.id }).catch(() => {});
  return NextResponse.json({ started: true }, { status: 202 });
}
