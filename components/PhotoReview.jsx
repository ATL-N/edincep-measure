"use client";

// Designer view: the photos a client (or the designer) used to estimate a
// measurement, with the measuring lines drawn on them, the height that was
// entered and the warnings shown at the time — to diagnose odd numbers.

import { useEffect, useState } from "react";
import { Camera, AlertTriangle, X } from "lucide-react";
import PhotoOverlay from "@/components/PhotoOverlay";

export default function PhotoReview({ measurementId, unit = "INCH" }) {
  const [photos, setPhotos] = useState(null);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/measurements/${measurementId}/photos`)
      .then((r) => (r.ok ? r.json() : { photos: [] }))
      .then((d) => !cancelled && setPhotos(d.photos || []))
      .catch(() => !cancelled && setPhotos([]));
    return () => {
      cancelled = true;
    };
  }, [measurementId]);

  if (!photos || photos.length === 0) return null; // nothing to show

  const first = photos[0];
  const heightCm = first.analysis?.heightCm;
  const height =
    heightCm == null
      ? null
      : unit === "CENTIMETER"
      ? `${Math.round(heightCm)} cm`
      : `${Math.floor(heightCm / 30.48)} ft ${Math.round((heightCm / 2.54) % 12)} in`;
  const warnings = [...new Set(photos.flatMap((p) => p.analysis?.warnings || []))];

  return (
    <section className="glass rounded-xl border p-6">
      <div className="flex flex-wrap items-center gap-2 mb-1">
        <Camera className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Measured from photos</h3>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {first.takenBy === "client" ? "taken by the client" : "taken by you"}
        </span>
      </div>
      <p className="text-sm text-muted-foreground mb-4">
        These numbers were estimated from the photos below{height ? `, using a height of ${height}` : ""}. Pink lines
        show where each measurement was taken. If a line is in the wrong place (e.g. waist too low, arms touching
        the body), that measurement is likely off.
      </p>
      {warnings.length > 0 && (
        <ul className="mb-4 space-y-1 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
          {warnings.map((w) => (
            <li key={w} className="flex gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{w}</li>
          ))}
        </ul>
      )}
      <div className="grid grid-cols-2 gap-4 max-w-xl">
        {photos.map((p) => (
          <button key={p.id} onClick={() => setOpen(p)} className="text-left">
            <PhotoOverlay src={p.url} analysis={p.analysis} alt={`${p.kind} photo`} />
            <span className="mt-1 block text-xs font-medium text-muted-foreground">
              {p.kind === "FRONT" ? "Front" : "Side"} · tap to enlarge
            </span>
          </button>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={() => setOpen(null)}>
          <div className="relative max-h-full max-w-lg w-full overflow-auto" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={() => setOpen(null)}
              className="absolute right-2 top-2 z-10 rounded-full bg-black/60 p-2 text-white"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
            <PhotoOverlay src={open.url} analysis={open.analysis} alt={`${open.kind} photo`} />
          </div>
        </div>
      )}
    </section>
  );
}
