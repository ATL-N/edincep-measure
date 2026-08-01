// instrumentation.js — runs once when the Next.js server starts.
// Schedules background housekeeping inside the app container (there is no
// separate cron service in docker-compose): photo cleanup and automatic
// database backups. See instrumentation-node.js.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { startBackgroundJobs } = await import("./instrumentation-node.js");
    await startBackgroundJobs();
  }
}
