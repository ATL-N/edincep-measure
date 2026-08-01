"use client";

// Animated "how to measure" illustrations.
// Mirrors lib/src/features/measurements/presentation/widgets/measurement_guide.dart
// in the Flutter app: same keys, same 200x420 figure coordinates.

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { HelpCircle, X, ChevronLeft, ChevronRight, Lightbulb, Ruler, RefreshCw } from "lucide-react";

const HPS = [116, 76]; // high point of shoulder, beside the neck

export const MEASUREMENT_GUIDES = [
  // Vertical
  { key: "shoulderToChest", title: "Shoulder to Chest", shape: "line", a: HPS, b: [116, 102],
    howTo: "Start at the top of the shoulder, right beside the neck. Run the tape straight down to the upper chest, just above the fullest part of the bust." },
  { key: "shoulderToBust", title: "Shoulder to Bust", shape: "line", a: HPS, b: [116, 118],
    howTo: "From the top of the shoulder beside the neck, measure straight down to the bust point (the fullest part of the chest)." },
  { key: "shoulderToUnderbust", title: "Shoulder to Underbust", shape: "line", a: HPS, b: [116, 137],
    howTo: "From the top of the shoulder beside the neck, measure down over the bust to where the bust meets the ribcage." },
  { key: "shoulderToWaistFront", title: "Shoulder to Waist (Front)", shape: "line", a: HPS, b: [116, 164],
    howTo: "From the top of the shoulder beside the neck, run the tape down the front, over the bust, to the natural waist.",
    tip: "The natural waist is the narrowest part of the torso, usually just above the navel." },
  { key: "shoulderToWaistBack", title: "Shoulder to Waist (Back)", shape: "line", a: HPS, b: [116, 164], view: "back",
    howTo: "Measured on the back. From the top of the shoulder beside the neck, run the tape straight down the back to the natural waist." },
  { key: "waistToHip", title: "Waist to Hip", shape: "line", a: [129, 164], b: [140, 205],
    howTo: "On the side of the body, measure from the natural waist down to the fullest part of the hips." },
  { key: "shoulderToKnee", title: "Shoulder to Knee", shape: "line", a: HPS, b: [116, 315],
    howTo: "From the top of the shoulder beside the neck, measure straight down the front of the body to the middle of the knee." },
  { key: "shoulderToDressLength", title: "Dress Length", shape: "line", a: HPS, b: [116, 352],
    howTo: "From the top of the shoulder beside the neck, measure down to where you want the dress or gown to end.",
    tip: "Decide on the hemline with the shoes you plan to wear." },
  { key: "shoulderToAnkle", title: "Shoulder to Ankle", shape: "line", a: HPS, b: [116, 393],
    howTo: "From the top of the shoulder beside the neck, measure straight down to the ankle bone." },

  // Width
  { key: "shoulderWidth", title: "Shoulder Width", shape: "line", a: [57, 84], b: [143, 84], view: "back",
    howTo: "Measured across the back, from the tip of one shoulder bone to the tip of the other.",
    tip: "Shoulder tips are where the arm starts to drop away from the shoulder." },
  { key: "nippleToNipple", title: "Nipple to Nipple", shape: "line", a: [84, 118], b: [116, 118],
    howTo: "Measure straight across the chest from one bust point to the other." },
  { key: "offShoulder", title: "Off Shoulder", shape: "loop", a: [100, 96], rx: 64,
    howTo: "With arms relaxed, wrap the tape around the upper arms and body just below the shoulder bones — where an off-shoulder neckline would sit." },

  // Circumference
  { key: "bust", title: "Bust", shape: "loop", a: [100, 118], rx: 38,
    howTo: "Wrap the tape around the fullest part of the bust, keeping it level across the back and under the arms.",
    tip: "Keep the tape snug but not tight — you should fit one finger under it." },
  { key: "underBust", title: "Under Bust", shape: "loop", a: [100, 137], rx: 33,
    howTo: "Wrap the tape around the ribcage directly under the bust, keeping it level all the way round." },
  { key: "waist", title: "Waist", shape: "loop", a: [100, 164], rx: 29,
    howTo: "Wrap the tape around the natural waist — the narrowest part of the torso, usually just above the navel.",
    tip: "Breathe out normally; don't hold in your stomach." },
  { key: "hip", title: "Hip", shape: "loop", a: [100, 205], rx: 41,
    howTo: "With feet together, wrap the tape around the fullest part of the hips and buttocks." },
  { key: "thigh", title: "Thigh", shape: "loop", a: [119, 252], rx: 16,
    howTo: "Wrap the tape around the fullest part of one thigh, just below the crotch." },
  { key: "knee", title: "Knee", shape: "loop", a: [119, 315], rx: 11,
    howTo: "Wrap the tape around the knee with the leg straight." },
  { key: "ankle", title: "Ankle", shape: "loop", a: [117, 391], rx: 8,
    howTo: "Wrap the tape around the ankle, just above the ankle bone." },
  { key: "neck", title: "Neck", shape: "loop", a: [100, 69], rx: 10,
    howTo: "Wrap the tape around the base of the neck, where a shirt collar would sit.",
    tip: "Slip one finger under the tape for comfort." },

  // Arm
  { key: "shirtSleeve", title: "Shirt Sleeve", shape: "line", a: [143, 84], b: [151, 126],
    howTo: "From the shoulder tip, measure down the outside of the arm to where a short sleeve should end." },
  { key: "elbowLength", title: "Elbow Length", shape: "line", a: [143, 84], b: [157, 168],
    howTo: "From the shoulder tip, measure down the outside of the arm to the elbow." },
  { key: "longSleeves", title: "Long Sleeves", shape: "line", a: [143, 84], b: [163, 238],
    howTo: "With the arm slightly bent, measure from the shoulder tip, over the elbow, down to the wrist bone." },
  { key: "aroundArm", title: "Around Arm", shape: "loop", a: [151, 124], rx: 10,
    howTo: "Wrap the tape around the fullest part of the upper arm (bicep), with the arm relaxed." },
  { key: "elbow", title: "Elbow", shape: "loop", a: [157, 168], rx: 8,
    howTo: "Wrap the tape around the elbow with the arm slightly bent." },
  { key: "wrist", title: "Wrist", shape: "loop", a: [162, 234], rx: 6.5,
    howTo: "Wrap the tape around the wrist, just above the wrist bone." },

  // Leg
  { key: "inSeam", title: "In Seam", shape: "line", a: [103, 240], b: [111, 393],
    howTo: "Measure along the inside of the leg, from the crotch down to the ankle (or desired trouser length)." },
  { key: "outSeam", title: "Out Seam", shape: "line", a: [129, 164], b: [123, 393],
    howTo: "Measure along the outside of the leg, from the waist down to the ankle (or desired trouser length)." },
];

const BY_KEY = Object.fromEntries(MEASUREMENT_GUIDES.map((g) => [g.key, g]));

/** Accepts `bust`, `bustSnug`, `bustStatic`… */
export const guideFor = (fieldKey) =>
  fieldKey ? BY_KEY[String(fieldKey).replace(/(Snug|Static|Dynamic)$/, "")] : undefined;

// ---- figure geometry ------------------------------------------------------

const RIGHT_HALF = [
  [108, 58], [109, 72], [126, 77], [143, 83], [138, 100], [137, 118], [132, 138], [128, 163],
  [134, 186], [140, 205], [137, 232], [131, 265], [128, 315], [126, 350], [122, 392], [127, 404],
  [124, 410], [110, 410], [110, 392], [109, 350], [109, 315], [106, 262], [100, 238],
];
const RIGHT_ARM = [[139, 88], [151, 126], [157, 168], [160, 204], [163, 240]];
const mirror = ([x, y]) => [200 - x, y];
const OUTLINE = [...RIGHT_HALF, ...RIGHT_HALF.slice(0, -1).reverse().map(mirror)];

const f = (n) => Math.round(n * 100) / 100;

function smoothPath(pts, closed) {
  const n = pts.length;
  const at = (i) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${f(pts[0][0])} ${f(pts[0][1])}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = at(i - 1), p1 = at(i), p2 = at(i + 1), p3 = at(i + 2);
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${f(c1[0])} ${f(c1[1])} ${f(c2[0])} ${f(c2[1])} ${f(p2[0])} ${f(p2[1])}`;
  }
  return closed ? d + " Z" : d;
}

const BODY_PATH = smoothPath(OUTLINE, true);
const ARM_PATHS = [smoothPath(RIGHT_ARM, false), smoothPath(RIGHT_ARM.map(mirror), false)];

const STYLES = `
.mg-draw { stroke-dasharray: 1; stroke-dashoffset: 1; animation: mg-draw 2.6s cubic-bezier(.65,0,.35,1) infinite; }
.mg-draw-back { stroke-dasharray: 1; stroke-dashoffset: 1; animation: mg-draw-back 2.6s cubic-bezier(.65,0,.35,1) infinite; }
.mg-fade { opacity: 0; animation: mg-fade 2.6s ease-in-out infinite; }
.mg-pulse { transform-box: fill-box; transform-origin: center; animation: mg-pulse 1.3s ease-out infinite; }
@keyframes mg-draw { 0% { stroke-dashoffset: 1; } 60%, 100% { stroke-dashoffset: 0; } }
@keyframes mg-draw-back { 0%, 30% { stroke-dashoffset: 1; } 60%, 100% { stroke-dashoffset: 0; } }
@keyframes mg-fade { 0%, 55% { opacity: 0; } 62%, 100% { opacity: 1; } }
@keyframes mg-pulse { from { transform: scale(1); opacity: .55; } to { transform: scale(3.2); opacity: 0; } }
@media (prefers-reduced-motion: reduce) {
  .mg-draw, .mg-draw-back { animation: none; stroke-dashoffset: 0; }
  .mg-fade { animation: none; opacity: 1; }
  .mg-pulse { animation: none; opacity: 0; }
}`;

// ---- figure ---------------------------------------------------------------

export function MeasurementFigure({ guide, height = 260, className = "" }) {
  const maskId = useId().replace(/:/g, "");
  if (!guide) return null;
  const body = "hsl(var(--muted))";
  const outline = "hsl(var(--muted-foreground) / 0.55)";
  const accent = "hsl(var(--primary))";
  const detail = "hsl(var(--muted-foreground) / 0.45)";

  let tape;
  if (guide.shape === "line") {
    const [ax, ay] = guide.a;
    const [bx, by] = guide.b;
    const len = Math.hypot(bx - ax, by - ay) || 1;
    const nx = -(by - ay) / len, ny = (bx - ax) / len;
    const ticks = [];
    for (let d = 6; d < len; d += 6) {
      const px = ax + ((bx - ax) * d) / len, py = ay + ((by - ay) * d) / len;
      const h = Math.round(d / 6) % 5 === 0 ? 3.2 : 1.8;
      ticks.push(`M${f(px - nx * h)} ${f(py - ny * h)} L${f(px + nx * h)} ${f(py + ny * h)}`);
    }
    const line = `M${ax} ${ay} L${bx} ${by}`;
    tape = (
      <>
        <defs>
          <mask id={`m${maskId}`} maskUnits="userSpaceOnUse" x="0" y="0" width="200" height="420">
            <path d={line} pathLength={1} className="mg-draw" stroke="#fff" strokeWidth="10" strokeLinecap="round" fill="none" />
          </mask>
        </defs>
        <g mask={`url(#m${maskId})`}>
          <path d={line} stroke={accent} strokeOpacity=".25" strokeWidth="7" strokeLinecap="round" />
          <path d={line} stroke={accent} strokeWidth="2.2" strokeLinecap="round" />
          <path d={ticks.join(" ")} stroke={accent} strokeWidth=".9" />
        </g>
        <g className="mg-fade">
          <path d={`M${f(bx - nx * 5)} ${f(by - ny * 5)} L${f(bx + nx * 5)} ${f(by + ny * 5)}`} stroke={accent} strokeWidth="2" strokeLinecap="round" />
          <circle cx={bx} cy={by} r="2.6" fill={accent} />
        </g>
        <circle cx={ax} cy={ay} r="3" fill="none" stroke={accent} strokeWidth="1.2" className="mg-pulse" />
        <circle cx={ax} cy={ay} r="3.2" fill={accent} />
      </>
    );
  } else {
    const [cx, cy] = guide.a;
    const rx = guide.rx;
    const ry = Math.max(2.5, rx * 0.275);
    // Front (closer) half: right -> bottom -> left. Back half: left -> top -> right.
    const front = `M${cx + rx} ${cy} A${rx} ${ry} 0 0 1 ${cx - rx} ${cy}`;
    const back = `M${cx - rx} ${cy} A${rx} ${ry} 0 0 1 ${cx + rx} ${cy}`;
    tape = (
      <>
        <g className="mg-fade">
          <path d={back} fill="none" stroke={accent} strokeOpacity=".55" strokeWidth="1.6" strokeDasharray="3 3" />
        </g>
        <path d={front} pathLength={1} className="mg-draw" fill="none" stroke={accent} strokeOpacity=".22" strokeWidth="7" strokeLinecap="round" />
        <path d={front} pathLength={1} className="mg-draw" fill="none" stroke={accent} strokeWidth="2.2" strokeLinecap="round" />
        <circle cx={cx + rx} cy={cy} r="3" fill="none" stroke={accent} strokeWidth="1.2" className="mg-pulse" />
        <circle cx={cx + rx} cy={cy} r="3" fill={accent} />
      </>
    );
  }

  return (
    <svg
      viewBox="0 0 200 420"
      height={height}
      width={(height * 200) / 420}
      role="img"
      aria-label={`Illustration: how to measure ${guide.title}`}
      className={className}
    >
      <style>{STYLES}</style>
      {ARM_PATHS.map((d, i) => (
        <g key={i} fill="none" strokeLinecap="round" strokeLinejoin="round">
          <path d={d} stroke={outline} strokeWidth="16.4" />
          <path d={d} stroke={body} strokeWidth="14" />
        </g>
      ))}
      <path d={BODY_PATH} fill={body} stroke={outline} strokeWidth="1.2" strokeLinejoin="round" />
      <circle cx="100" cy="36" r="22" fill={body} stroke={outline} strokeWidth="1.2" />
      {guide.view === "back" ? (
        <g fill="none" stroke={detail} strokeWidth="1">
          <path d="M100 74 L100 226" strokeDasharray="4 3" />
          <path d="M77 116 A12 12 0 0 1 80 99" />
          <path d="M123 116 A12 12 0 0 0 120 99" />
        </g>
      ) : (
        <g>
          <circle cx="84" cy="118" r="1.6" fill={detail} />
          <circle cx="116" cy="118" r="1.6" fill={detail} />
          <circle cx="100" cy="172" r="1.3" fill={detail} />
          <path d="M96 126 A13 13 0 0 1 72 128" fill="none" stroke={detail} />
          <path d="M128 126 A13 13 0 0 1 104 128" fill="none" stroke={detail} />
        </g>
      )}
      <path d="M73 164 Q100 168 127 164" fill="none" stroke={outline} strokeOpacity=".4" strokeWidth=".8" strokeDasharray="2 3" />
      {tape}
    </svg>
  );
}

// ---- modal with prev/next -------------------------------------------------

export function MeasurementGuideModal({ startKey, onClose }) {
  const startIndex = Math.max(0, MEASUREMENT_GUIDES.findIndex((g) => g.key === guideFor(startKey)?.key));
  const [index, setIndex] = useState(startIndex);
  const closeRef = useRef(null);
  const guide = MEASUREMENT_GUIDES[index];
  const last = MEASUREMENT_GUIDES.length - 1;

  const go = useCallback((delta) => setIndex((i) => Math.min(last, Math.max(0, i + delta))), [last]);

  useEffect(() => {
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight") go(1);
      if (e.key === "ArrowLeft") go(-1);
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [onClose, go]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm p-0 sm:p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="mg-title"
        className="w-full sm:max-w-md max-h-[92vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-card text-card-foreground border border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 px-5 pt-4">
          <Ruler className="w-5 h-5 text-primary" aria-hidden />
          <span className="font-semibold">How to measure</span>
          <span className="ml-auto text-xs text-muted-foreground tabular-nums">
            {index + 1} / {MEASUREMENT_GUIDES.length}
          </span>
          <button
            ref={closeRef}
            onClick={onClose}
            className="ml-2 p-1.5 rounded-full hover:bg-muted focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close guide"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-5 py-4">
          <div className="flex justify-center rounded-2xl bg-primary/5 py-3">
            {/* key forces the CSS animation to restart for each guide */}
            <MeasurementFigure key={guide.key} guide={guide} height={250} />
          </div>

          <h2 id="mg-title" className="mt-4 text-xl font-bold">{guide.title}</h2>
          <div className="mt-2 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1 rounded-full border border-border px-2.5 py-0.5 text-muted-foreground">
              {guide.shape === "loop" ? <RefreshCw className="w-3 h-3" aria-hidden /> : <Ruler className="w-3 h-3" aria-hidden />}
              {guide.shape === "loop" ? "All the way round" : "Straight length"}
            </span>
            <span className="inline-flex items-center rounded-full border border-border px-2.5 py-0.5 text-muted-foreground">
              {guide.view === "back" ? "Back" : "Front"}
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed">{guide.howTo}</p>
          {guide.tip && (
            <div className="mt-3 flex gap-2 rounded-xl bg-secondary p-3 text-sm text-secondary-foreground">
              <Lightbulb className="w-4 h-4 mt-0.5 shrink-0" aria-hidden />
              <span>{guide.tip}</span>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between px-5 pb-5">
          <button
            onClick={() => go(-1)}
            disabled={index === 0}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-2 text-sm hover:bg-muted disabled:opacity-40 disabled:pointer-events-none"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <button
            onClick={() => (index < last ? go(1) : onClose())}
            className="inline-flex items-center gap-1 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            {index < last ? (<>Next <ChevronRight className="w-4 h-4" /></>) : "Done"}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Small "?" button that opens the guide for one field. */
export function MeasurementGuideButton({ fieldKey, label, className = "" }) {
  const [open, setOpen] = useState(false);
  if (!guideFor(fieldKey)) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`inline-flex items-center justify-center rounded-full p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring ${className}`}
        aria-label={`How to measure ${label || guideFor(fieldKey).title}`}
        title="How to measure"
      >
        <HelpCircle className="w-4 h-4" />
      </button>
      {open && <MeasurementGuideModal startKey={fieldKey} onClose={() => setOpen(false)} />}
    </>
  );
}

/** Banner that opens the full walkthrough from the first measurement. */
export function MeasurementGuideBanner({ className = "" }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`w-full flex items-center gap-3 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-left text-sm hover:bg-primary/10 transition-colors ${className}`}
      >
        <Ruler className="w-5 h-5 text-primary shrink-0" aria-hidden />
        <span className="flex-1">
          Not sure where to measure? Tap <HelpCircle className="inline w-3.5 h-3.5 -mt-0.5" aria-label="the help icon" /> on any field, or walk through the animated guide.
        </span>
        <ChevronRight className="w-4 h-4 text-primary" aria-hidden />
      </button>
      {open && <MeasurementGuideModal onClose={() => setOpen(false)} />}
    </>
  );
}
