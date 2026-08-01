"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  DatabaseBackup, Download, Lock, ShieldCheck, Loader2, AlertCircle, CheckCircle2, Copy, CloudUpload, Clock, Play, RefreshCw,
} from "lucide-react";

const fmtBytes = (n) =>
  n < 1024 ? `${n} B` : n < 1024 ** 2 ? `${(n / 1024).toFixed(1)} KB` : `${(n / 1024 ** 2).toFixed(1)} MB`;

async function sha256Hex(blob) {
  const buf = await blob.arrayBuffer();
  const hash = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function CopyBlock({ text }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="relative">
      <pre className="overflow-x-auto rounded-lg bg-muted p-3 pr-12 text-xs leading-relaxed">{text}</pre>
      <button
        type="button"
        onClick={() => navigator.clipboard.writeText(text).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); })}
        className="absolute right-2 top-2 rounded-md p-1.5 hover:bg-background"
        aria-label="Copy"
      >
        {copied ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
      </button>
    </div>
  );
}

const fmtDate = (d) =>
  d ? new Date(d).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—";

async function saveResponse(res, fallbackName) {
  const filename = res.headers.get("X-Backup-Filename") || fallbackName;
  const blob = await res.blob();
  const checksum = await sha256Hex(blob);
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return { filename, size: blob.size, checksum };
}

function AutomaticBackups() {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [starting, setStarting] = useState(false);
  const [pendingKey, setPendingKey] = useState(null); // backup waiting for password
  const [password, setPassword] = useState("");
  const [downloading, setDownloading] = useState(false);
  const [downloaded, setDownloaded] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/backup/scheduled", { cache: "no-store" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not load backup status");
      setStatus(data);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);
  // While a backup runs, refresh every few seconds.
  useEffect(() => {
    if (!status?.running && !starting) return;
    const t = setInterval(load, 4000);
    return () => clearInterval(t);
  }, [status?.running, starting, load]);

  async function runNow() {
    setStarting(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/backup/scheduled", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "Could not start the backup");
      await new Promise((r) => setTimeout(r, 1500));
      await load();
    } catch (e) {
      setError(e.message);
    } finally {
      setStarting(false);
    }
  }

  async function download(e) {
    e.preventDefault();
    setDownloading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/backup/scheduled/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: pendingKey,
          password,
          confirm: password.trim().toUpperCase() === "BACKUP" ? "BACKUP" : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Download failed (${res.status})`);
      }
      setDownloaded(await saveResponse(res, "edmeasure-backup.sql.gz.enc"));
      setPendingKey(null);
      setPassword("");
    } catch (e) {
      setError(e.message);
    } finally {
      setDownloading(false);
    }
  }

  const s = status;
  const healthy = s?.configured && s?.scheduleEnabled && !s?.lastFailure;

  return (
    <section className="glass space-y-4 rounded-xl border p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <CloudUpload className="h-6 w-6 text-primary" />
          <div>
            <h2 className="text-lg font-semibold">Automatic backups</h2>
            <p className="text-sm text-muted-foreground">
              {s?.destination ? `Encrypted and stored in ${s.destination}.` : "Encrypted copies stored off the server."}
            </p>
          </div>
        </div>
        <button type="button" onClick={load} className="rounded-md p-2 hover:bg-muted" aria-label="Refresh">
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
        </button>
      </div>

      {s && !s.passphraseOk && (
        <p className="rounded-lg bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
          Automatic backups are <strong>off</strong>: add <code>BACKUP_PASSPHRASE</code> (12+ characters) to the server&apos;s{" "}
          <code>.env</code> and restart the app. Keep a copy of the passphrase somewhere other than the server.
        </p>
      )}
      {s?.listError && (
        <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">Storage problem: {s.listError}</p>
      )}
      {s && s.passphraseOk && !s.scheduleEnabled && (
        <p className="rounded-lg bg-muted p-3 text-sm">The daily schedule is turned off on this server (BACKUP_SCHEDULE).</p>
      )}

      {s && (
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Status</p>
            <p className={`flex items-center gap-1.5 font-medium ${healthy ? "text-green-700 dark:text-green-400" : "text-amber-700 dark:text-amber-300"}`}>
              {s.running ? <Loader2 className="h-4 w-4 animate-spin" /> : healthy ? <CheckCircle2 className="h-4 w-4" /> : <AlertCircle className="h-4 w-4" />}
              {s.running ? "Backing up…" : healthy ? "Working" : s.lastFailure ? "Last backup failed" : "Not active"}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Last successful</p>
            <p className="font-medium">{fmtDate(s.lastSuccess?.at)}</p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-xs text-muted-foreground">Next</p>
            <p className="flex items-center gap-1.5 font-medium">
              <Clock className="h-4 w-4" /> {s.nextRun ? fmtDate(s.nextRun) : "—"}
            </p>
          </div>
        </div>
      )}

      {s?.lastFailure && (
        <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
          Failed {fmtDate(s.lastFailure.at)}: {s.lastFailure.error}. It is retried automatically every hour.
        </p>
      )}
      {error && <p className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={runNow}
          disabled={!s?.passphraseOk || s?.running || starting}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
        >
          {s?.running || starting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4" />}
          Back up now
        </button>
        {s && (
          <p className="text-xs text-muted-foreground">
            Daily at {s.time}. Keeps {s.keep.daily} daily, {s.keep.weekly} weekly and {s.keep.monthly} monthly backups.
          </p>
        )}
      </div>

      {s?.backups?.length > 0 && (
        <div className="overflow-hidden rounded-lg border">
          <ul className="max-h-80 divide-y overflow-y-auto">
            {s.backups.map((b) => (
              <li key={b.key} className="flex items-center justify-between gap-3 px-3 py-2 text-sm">
                <div className="min-w-0">
                  <p className="font-medium">{fmtDate(b.date)}</p>
                  <p className="text-xs text-muted-foreground">
                    {fmtBytes(b.size)}
                    {b.kept.length > 0 && ` · ${b.kept.filter((k) => k !== "latest").join(", ")}`}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setPendingKey(b.key); setDownloaded(null); }}
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs hover:bg-muted"
                >
                  <Download className="h-3.5 w-3.5" /> Download
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {s && !s.listError && s.backups?.length === 0 && s.passphraseOk && (
        <p className="text-sm text-muted-foreground">No automatic backups stored yet.</p>
      )}

      {pendingKey && (
        <form onSubmit={download} className="space-y-2 rounded-lg border p-3">
          <p className="text-sm">
            Download <code className="break-all text-xs">{pendingKey.split("/").pop()}</code>
          </p>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              type="password"
              autoFocus
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password (or BACKUP)"
              className="flex-1 rounded-lg border border-border bg-background px-3 py-2"
            />
            <button
              type="submit"
              disabled={!password || downloading}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-40"
            >
              {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Download
            </button>
            <button type="button" onClick={() => setPendingKey(null)} className="rounded-lg px-3 py-2 text-sm hover:bg-muted">
              Cancel
            </button>
          </div>
        </form>
      )}
      {downloaded && (
        <div className="space-y-1 rounded-lg bg-green-500/10 p-3 text-sm">
          <p className="flex items-center gap-2 font-medium text-green-700 dark:text-green-300">
            <CheckCircle2 className="h-4 w-4" /> Saved {downloaded.filename} ({fmtBytes(downloaded.size)})
          </p>
          <p className="text-xs text-muted-foreground">
            SHA-256: <code className="break-all">{downloaded.checksum}</code>. Decrypt it with the server&apos;s
            BACKUP_PASSPHRASE (see the commands below).
          </p>
        </div>
      )}
    </section>
  );
}

export default function BackupPage() {
  const { data: session } = useSession();
  const [password, setPassword] = useState("");
  const [encrypt, setEncrypt] = useState(true);
  const [passphrase, setPassphrase] = useState("");
  const [passphrase2, setPassphrase2] = useState("");
  const [busy, setBusy] = useState(false);
  const [received, setReceived] = useState(0);
  const [error, setError] = useState(null);
  const [result, setResult] = useState(null);

  const passphraseError =
    encrypt && passphrase.length > 0 && passphrase.length < 12
      ? "At least 12 characters."
      : encrypt && passphrase2.length > 0 && passphrase !== passphrase2
      ? "The two passphrases don’t match."
      : null;
  const canStart = !busy && password.length > 0 && (!encrypt || (passphrase.length >= 12 && passphrase === passphrase2));

  async function download(e) {
    e.preventDefault();
    if (!canStart) return;
    setBusy(true);
    setError(null);
    setResult(null);
    setReceived(0);
    try {
      const isConfirmWord = password.trim().toUpperCase() === "BACKUP";
      const res = await fetch("/api/admin/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password,
          confirm: isConfirmWord ? "BACKUP" : undefined,
          passphrase: encrypt ? passphrase : undefined,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `Backup failed (${res.status})`);
      }
      const filename = res.headers.get("X-Backup-Filename") || "edmeasure-backup.sql.gz";
      // Read with progress.
      const reader = res.body.getReader();
      const chunks = [];
      let total = 0;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
        total += value.length;
        setReceived(total);
      }
      const blob = new Blob(chunks, { type: "application/octet-stream" });
      const checksum = await sha256Hex(blob);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
      setResult({ filename, size: total, checksum, encrypted: encrypt });
      setPassword("");
    } catch (err) {
      setError(
        err.name === "TypeError"
          ? "The download was interrupted (the backup may have failed on the server). Please try again."
          : err.message,
      );
    } finally {
      setBusy(false);
    }
  }

  if (session && session.user?.role !== "ADMIN") {
    return <p className="p-8">Only administrators can back up the database.</p>;
  }

  const file = result?.filename || "edmeasure-backup-YYYYMMDD-HHMMSS.sql.gz.enc";
  const plain = file.replace(/\.enc$/, "");

  return (
    <div className="min-h-screen px-4 pb-24 pt-6 md:pt-28 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="flex items-center gap-3">
          <DatabaseBackup className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Database backup</h1>
            <p className="text-sm text-muted-foreground">
              Automatic daily copies off the server, plus on-demand downloads to this computer.
            </p>
          </div>
        </header>

        <AutomaticBackups />

        <form onSubmit={download} className="glass space-y-5 rounded-xl border p-6">
          <div>
            <h2 className="text-lg font-semibold">Download a backup now</h2>
            <p className="text-sm text-muted-foreground">Made on the spot and saved straight to this computer.</p>
          </div>
          <div className="flex gap-3 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-800 dark:text-amber-200">
            <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              The backup contains <strong>all</strong> data: clients, measurements, finances and password hashes.
              Keep it somewhere safe. Encrypting it is strongly recommended.
            </p>
          </div>

          <label className="block space-y-1">
            <span className="text-sm font-medium">Your password</span>
            <input
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-border bg-background px-3 py-2"
              placeholder="Confirm it’s you"
            />
            <span className="block text-xs text-muted-foreground">
              If you sign in with a phone code and have no password, type <code>BACKUP</code> instead.
            </span>
          </label>

          <label className="flex items-center gap-2">
            <input type="checkbox" checked={encrypt} onChange={(e) => setEncrypt(e.target.checked)} />
            <Lock className="h-4 w-4" />
            <span className="text-sm font-medium">Encrypt the file with a passphrase</span>
          </label>

          {encrypt && (
            <div className="grid gap-3 sm:grid-cols-2">
              <input
                type="password"
                autoComplete="new-password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2"
                placeholder="Passphrase (12+ characters)"
              />
              <input
                type="password"
                autoComplete="new-password"
                value={passphrase2}
                onChange={(e) => setPassphrase2(e.target.value)}
                className="rounded-lg border border-border bg-background px-3 py-2"
                placeholder="Repeat passphrase"
              />
              <p className="text-xs text-muted-foreground sm:col-span-2">
                Write the passphrase down somewhere safe. <strong>Without it the backup cannot be restored</strong>, and
                it is not stored anywhere.
              </p>
              {passphraseError && <p className="text-sm text-destructive sm:col-span-2">{passphraseError}</p>}
            </div>
          )}

          {error && (
            <p className="flex gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
            </p>
          )}

          <button
            type="submit"
            disabled={!canStart}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground disabled:opacity-40"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            {busy ? `Creating backup… ${fmtBytes(received)}` : "Download backup"}
          </button>

          {result && (
            <div className="space-y-1 rounded-lg bg-green-500/10 p-3 text-sm">
              <p className="flex items-center gap-2 font-medium text-green-700 dark:text-green-300">
                <CheckCircle2 className="h-4 w-4" /> Saved {result.filename} ({fmtBytes(result.size)})
                {result.encrypted ? ", encrypted" : ""}
              </p>
              <p className="text-xs text-muted-foreground">SHA-256 fingerprint (to check the copy on the other machine):</p>
              <code className="block break-all text-xs">{result.checksum}</code>
            </div>
          )}
        </form>

        <section className="glass space-y-3 rounded-xl border p-6 text-sm">
          <h2 className="text-lg font-semibold">Checking and restoring a backup</h2>
          <p>On the computer that holds the backup, check the file wasn’t damaged while copying (it should print the fingerprint shown above):</p>
          <CopyBlock text={`sha256sum ${file}`} />
          <p>
            If it’s encrypted (<code>.enc</code>), decrypt it first. It asks for the passphrase: the one you chose, or the
            server&apos;s <code>BACKUP_PASSPHRASE</code> for automatic backups.
          </p>
          <CopyBlock text={`openssl enc -d -aes-256-cbc -pbkdf2 -iter 200000 -md sha256 \\\n  -in ${file} -out ${plain}`} />
          <p>
            Restore into a PostgreSQL database. <strong>This replaces the tables in that database</strong>, so restore into a new,
            empty database first if you only want to look at the data:
          </p>
          <CopyBlock text={`gunzip -c ${plain} | psql "postgresql://USER:PASSWORD@HOST:5432/DATABASE"`} />
          <p className="text-muted-foreground">
            To restore the live server, stop the app container first, restore into the database container, then start the app again.
            Restoring is deliberately not available from this website.
          </p>
        </section>
      </div>
    </div>
  );
}
