// POST /api/admin/backup/scheduled/download — download one stored (encrypted) backup.
// Body: { key, password? , confirm? }
import { Readable } from "stream";
import { prisma } from "@/app/lib/prisma.js";
import { isRateLimited } from "@/app/lib/rate-limiter";
import { fail, requireAdmin, confirmIdentity, clientIp } from "@/lib/admin-guard";
import { getBackupDestination } from "@/lib/backup-destination";
import { BACKUP_PREFIX, isBackupKey } from "@/lib/scheduled-backup";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request) {
  const { admin, response } = await requireAdmin(request);
  if (response) return response;

  const limit = await isRateLimited(`db_backup_dl:${admin.id}`, 10, 60 * 60);
  if (limit.isLimited) return fail(429, "Too many downloads in the last hour. Please wait a little.");

  let body = {};
  try {
    body = await request.json();
  } catch {}
  if (!(await confirmIdentity(admin, body))) {
    return fail(403, admin.hashedPassword ? "Password is incorrect." : "Type BACKUP to confirm.");
  }
  if (!isBackupKey(body.key)) return fail(400, "Unknown backup.");

  let dest, stored, stream;
  try {
    dest = getBackupDestination();
    stored = (await dest.list(body.key)).find((i) => i.key === body.key);
    if (!stored) return fail(404, "That backup no longer exists.");
    stream = await dest.get(body.key);
  } catch (e) {
    console.error("Backup download failed:", e.message);
    return fail(502, "Could not read the backup from storage.");
  }

  const filename = body.key.slice(BACKUP_PREFIX.length);
  await prisma.log
    .create({
      data: {
        userId: admin.id,
        action: "DATABASE_BACKUP_DOWNLOAD",
        ipAddress: clientIp(request),
        os: request.headers.get("user-agent"),
        details: { filename, stored: true },
      },
    })
    .catch(() => {});

  return new Response(Readable.toWeb(stream), {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Length": String(stored.size),
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
      "X-Backup-Filename": filename,
    },
  });
}
