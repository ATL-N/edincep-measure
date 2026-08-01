"use client";

// Shows a body photo with the measuring lines the estimator used drawn on
// top (bust, waist, hip …), plus the head/feet marks used for scale.
// Used both in the capture preview and on the designer's measurement page,
// so a designer can see exactly where a number came from.

import { LEVEL_LABELS } from "@/lib/photo-measure/estimate";

export default function PhotoOverlay({ src, analysis, alt = "Body photo", className = "" }) {
  const runs = analysis?.runs || {};
  const levels = analysis?.levels || {};
  const pct = (v) => `${(v * 100).toFixed(2)}%`;

  return (
    <div className={`relative overflow-hidden rounded-xl bg-muted ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="block w-full h-auto select-none" draggable={false} />
      {analysis && (
        <>
          {/* Head and feet marks (used for scale). */}
          {["top", "bottom"].map((k) =>
            typeof analysis[k] === "number" ? (
              <div
                key={k}
                className="absolute left-0 right-0 border-t border-dashed border-sky-400/90"
                style={{ top: pct(analysis[k]) }}
              >
                <span className="absolute right-1 -translate-y-1/2 rounded bg-sky-500/90 px-1 text-[10px] font-semibold text-white">
                  {k === "top" ? "top of head" : "feet"}
                </span>
              </div>
            ) : null,
          )}
          {/* Measuring lines. */}
          {Object.entries(runs).map(([key, r]) => {
            const y = levels[key];
            if (typeof y !== "number") return null;
            return (
              <div key={key} className="absolute" style={{ top: pct(y), left: pct(r.x1), width: pct(r.x2 - r.x1) }}>
                <div className="h-[3px] -translate-y-1/2 rounded-full bg-fuchsia-500 shadow-[0_0_0_1px_rgba(255,255,255,0.8)]" />
                <span className="absolute left-full ml-1 -translate-y-1/2 whitespace-nowrap rounded bg-fuchsia-600/90 px-1 text-[10px] font-semibold text-white">
                  {LEVEL_LABELS[key] || key}
                </span>
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}
