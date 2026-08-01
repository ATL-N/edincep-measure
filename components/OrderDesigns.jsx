"use client";

// Designs linked to an order (made in the app's Design tab and synced).
import { useEffect, useState } from "react";
import { Shirt } from "lucide-react";

const LABELS = {
  garment: { dress: "dress", top: "top", skirt: "skirt" },
  neckline: { round: "Round neck", scoop: "Scoop neck", vNeck: "V-neck", boat: "Boat neck" },
  sleeve: { none: "Sleeveless", short: "Short sleeves", puff: "Puff sleeves", elbow: "Elbow sleeves", long: "Long sleeves" },
  skirt: { pencil: "Pencil", aLine: "A-line", flared: "Flared" },
  length: { mini: "mini", knee: "knee length", midi: "midi", maxi: "maxi" },
  pocket: { none: null, patch: "Patch pockets", inSeam: "In-seam pockets" },
};

function summary(c = {}) {
  const parts = [];
  const g = c.garment || "dress";
  parts.push(g === "top" ? "Top" : `${LABELS.skirt[c.skirt] || "A-line"} ${LABELS.garment[g]}`);
  if (g !== "skirt") parts.push(LABELS.neckline[c.neckline] || "Round neck", LABELS.sleeve[c.sleeve] || "Short sleeves");
  if (g !== "top") parts.push(LABELS.length[c.length] || "knee length");
  if (LABELS.pocket[c.pocket]) parts.push(LABELS.pocket[c.pocket]);
  return parts.join(" · ");
}

const hex = (argb) => (typeof argb === "number" ? `#${(argb & 0xffffff).toString(16).padStart(6, "0")}` : null);

export default function OrderDesigns({ measurementId }) {
  const [designs, setDesigns] = useState(null);
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/designs?measurementId=${encodeURIComponent(measurementId)}`)
      .then((r) => (r.ok ? r.json() : { designs: [] }))
      .then((d) => !cancelled && setDesigns(d.designs || []))
      .catch(() => !cancelled && setDesigns([]));
    return () => {
      cancelled = true;
    };
  }, [measurementId]);

  if (!designs || designs.length === 0) return null;
  return (
    <section className="glass rounded-xl border p-6">
      <div className="flex items-center gap-2 mb-3">
        <Shirt className="w-5 h-5 text-primary" />
        <h3 className="text-lg font-semibold">Designs for this order</h3>
      </div>
      <ul className="space-y-2">
        {designs.map((d) => {
          const c = d.config || {};
          const swatch = c.fabricKind === "lines" ? null : hex(c.fabricColor);
          return (
            <li key={d.id} className="flex items-center gap-3 rounded-lg border border-border/60 p-3">
              <span
                className="h-8 w-8 shrink-0 rounded-full border border-border"
                style={{ background: swatch || "transparent" }}
                title={c.fabricKind === "materialPrint" ? "Material print" : swatch || "No colour"}
              />
              <div className="min-w-0">
                <p className="font-medium truncate">{d.name}</p>
                <p className="text-sm text-muted-foreground">{summary(c)}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">Open the EdMeasure app’s Design tab to see the sketch, pattern and sewing steps.</p>
    </section>
  );
}
