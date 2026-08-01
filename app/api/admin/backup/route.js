// POST /api/admin/backup — download a full database backup (admins only).
// Body (JSON): { password?: string, confirm?: "BACKUP", passphrase?: string }
// The response is a gzip-compressed SQL dump, encrypted when a passphrase is given.
import { Readable } from "stream";
import { prisma } from "@/app/lib/prisma.js";
import { isRateLimited } from "@/app/lib/rate-limiter";
import { startBackup } from "@/lib/db-backup";
import { fail, requireAdmin, confirmIdentity, clientIp } from "@/lib/admin-guard";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const { admin, response } = await requireAdmin(request);
  if (response) return response;

  const limit = await isRateLimited(`db_backup:${admin.id}`, 5, 60 * 60);
  if (limit.isLimited) return fail(429, "Too many backups in the last hour. Please wait a little.");

  let body = {};
  try {
    body = await request.json();
  } catch {}

  // Re-confirm identity: a backup contains every client's data and all
  // password hashes, so a left-open session alone must not be enough.
  if (!(await confirmIdentity(admin, body))) {
    return fail(403, admin.hashedPassword ? "Password is incorrect." : "Type BACKUP to confirm.");
  }

  const passphrase = typeof body.passphrase === "string" && body.passphrase.length > 0 ? body.passphrase : null;
  if (passphrase && passphrase.length < 12) return fail(400, "Use a passphrase of at least 12 characters.");

  let backup;
  try {
    backup = await startBackup({ passphrase });
  } catch (e) {
    console.error("Backup failed to start:", e.message);
    return fail(500, e.message.includes("not installed") ? e.message : "Could not start the backup. Check the server logs.");
  }
  backup.done.catch((e) => console.error("Backup failed while streaming:", e.message));

  const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
  const filename = `edmeasure-backup-${stamp}.sql.gz${passphrase ? ".enc" : ""}`;

  await prisma.log
    .create({
      data: {
        userId: admin.id,
        action: "DATABASE_BACKUP_DOWNLOAD",
        ipAddress: clientIp(request),
        os: request.headers.get("user-agent"),
        details: { filename, encrypted: !!passphrase },
      },
    })
    .catch(() => {});

  return new Response(Readable.toWeb(backup.stream), {
    status: 200,
    headers: {
      "Content-Type": passphrase ? "application/octet-stream" : "application/gzip",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Backup-Filename": filename,
    },
  });
}
