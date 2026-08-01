"use client";

// "Measure from photos": the person enters their height, takes a FRONT and a
// SIDE photo, and gets estimated measurements to review before using them.
//
// Everything runs in the browser (MediaPipe Pose Landmarker, loaded from a
// CDN on first use). Photos are resized to ≤1280 px and re-encoded as JPEG,
// which also strips location/EXIF data, before anything is uploaded.

import { useEffect, useRef, useState } from "react";
import { Camera, ImagePlus, X, ChevronRight, RotateCcw, AlertTriangle, Loader2, Ruler, Check } from "lucide-react";
import PhotoOverlay from "@/components/PhotoOverlay";
import { MEASUREMENT_GUIDES } from "@/components/MeasurementGuide";
import { analysePhoto, estimateMeasurements } from "@/lib/photo-measure/estimate";

const MP_VERSION = "0.10.14";
const MP_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task";
const MAX_SIDE = 1280;

let landmarkerPromise = null;
function getLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await import(/* webpackIgnore: true */ `${MP_BASE}/vision_bundle.mjs`);
      const fileset = await vision.FilesetResolver.forVisionTasks(`${MP_BASE}/wasm`);
      const options = (delegate) => ({
        baseOptions: { modelAssetPath: MODEL_URL, delegate },
        runningMode: "IMAGE",
        numPoses: 1,
        outputSegmentationMasks: true,
      });
      try {
        return await vision.PoseLandmarker.createFromOptions(fileset, options("GPU"));
      } catch {
        return await vision.PoseLandmarker.createFromOptions(fileset, options("CPU"));
      }
    })().catch((e) => {
      landmarkerPromise = null; // allow retry
      throw e;
    });
  }
  return landmarkerPromise;
}

/** Resize + re-encode the photo (strips EXIF/GPS). */
async function prepareImage(file) {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  const blob = await new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.85));
  return { canvas, blob, url: URL.createObjectURL(blob) };
}

/** Runs pose detection on one photo and analyses it. */
export async function analyseFile(file, kind, heightCm) {
  const img = await prepareImage(file);
  const landmarker = await getLandmarker();
  const result = landmarker.detect(img.canvas);
  const landmarks = result.landmarks?.[0];
  const maskObj = result.segmentationMasks?.[0];
  if (!landmarks || !maskObj) {
    maskObj?.close?.();
    return { ...img, analysis: { error: "We couldn't find a person in this photo. Try again with your whole body visible." } };
  }
  const mask = { data: new Float32Array(maskObj.getAsFloat32Array()), width: maskObj.width, height: maskObj.height };
  maskObj.close();
  const analysis = analysePhoto({ landmarks, mask, kind, heightCm });
  return { ...img, analysis };
}

const LABEL = Object.fromEntries(MEASUREMENT_GUIDES.map((g) => [g.key, g.title]));
const ORDER = MEASUREMENT_GUIDES.map((g) => g.key);

export function cmToUnit(cm, unit) {
  return unit === "CENTIMETER" ? Math.round(cm * 2) / 2 : Math.round((cm / 2.54) * 4) / 4;
}

const PHOTO_STEPS = {
  FRONT: {
    title: "Photo 1: from the front",
    tips: [
      "Wear fitted clothes (no jackets or loose dresses).",
      "Stand straight, feet slightly apart, arms a little away from your body, with a gap under the arms.",
      "Tie long hair or braids up so your neck and back are clear.",
      "Whole body in the photo, from the top of your head to your feet.",
      "Ask someone to take it from about 2–3 metres away, at waist height.",
    ],
  },
  SIDE: {
    title: "Photo 2: from the side",
    tips: [
      "Turn 90° so your side faces the camera.",
      "Arms relaxed by your sides, stand straight.",
      "Keep your hair off your back (tie it up).",
      "Same distance and height as the first photo.",
    ],
  },
};

export default function PhotoMeasure({ unit = "INCH", onApply, onClose }) {
  const [step, setStep] = useState("height"); // height | FRONT | SIDE | review
  const [heightUnit, setHeightUnit] = useState(unit === "CENTIMETER" ? "cm" : "ft");
  const [cmValue, setCmValue] = useState("");
  const [ft, setFt] = useState("");
  const [inch, setInch] = useState("");
  const [shots, setShots] = useState({}); // kind -> { url, blob, canvas, analysis }
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const urls = useRef([]);

  useEffect(() => {
    getLandmarker().catch(() => {}); // start downloading the model early
    const list = urls.current;
    return () => list.forEach((u) => URL.revokeObjectURL(u));
  }, []);

  const heightCm =
    heightUnit === "cm"
      ? parseFloat(cmValue)
      : (parseFloat(ft || "0") * 12 + parseFloat(inch || "0")) * 2.54;
  const heightOk = Number.isFinite(heightCm) && heightCm >= 100 && heightCm <= 230;

  async function onFile(kind, file) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const shot = await analyseFile(file, kind, heightCm);
      urls.current.push(shot.url);
      setShots((s) => ({ ...s, [kind]: shot }));
    } catch (e) {
      console.error(e);
      setError("Could not analyse the photo. Check your internet connection and try again.");
    } finally {
      setBusy(false);
    }
  }

  const front = shots.FRONT?.analysis?.error ? null : shots.FRONT?.analysis;
  const side = shots.SIDE?.analysis?.error ? null : shots.SIDE?.analysis;
  const estimate = front ? estimateMeasurements(front, side) : null;

  function apply() {
    const valuesCm = estimate?.valuesCm || {};
    const photos = ["FRONT", "SIDE"]
      .filter((k) => shots[k] && !shots[k].analysis?.error)
      .map((k) => ({
        kind: k,
        blob: shots[k].blob,
        width: shots[k].canvas.width,
        height: shots[k].canvas.height,
        analysis: { ...shots[k].analysis, estimatesCm: valuesCm },
      }));
    onApply({ valuesCm, photos, heightCm });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Measure from photos"
        className="w-full sm:max-w-lg max-h-[94vh] overflow-y-auto rounded-t-2xl sm:rounded-2xl bg-card text-card-foreground border border-border shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 z-10 flex items-center gap-2 border-b border-border bg-card px-5 py-3">
          <Camera className="w-5 h-5 text-primary" aria-hidden />
          <span className="font-semibold">Measure from photos</span>
          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">BETA</span>
          <button onClick={onClose} className="ml-auto rounded-full p-1.5 hover:bg-muted" aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="flex gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" /> {error}
            </div>
          )}

          {step === "height" && (
            <>
              <p className="text-sm text-muted-foreground">
                Take two photos and we'll estimate your measurements. You can check and correct every number
                before saving. Your photos are only shared with your designer.
              </p>
              <label className="block text-sm font-medium">How tall are you?</label>
              <div className="flex gap-2">
                {heightUnit === "cm" ? (
                  <input
                    type="number" inputMode="decimal" placeholder="e.g. 165"
                    value={cmValue} onChange={(e) => setCmValue(e.target.value)}
                    className="w-full rounded-lg border border-border bg-background px-3 py-2"
                  />
                ) : (
                  <>
                    <input type="number" inputMode="numeric" placeholder="ft" value={ft} onChange={(e) => setFt(e.target.value)}
                      className="w-24 rounded-lg border border-border bg-background px-3 py-2" />
                    <input type="number" inputMode="decimal" placeholder="in" value={inch} onChange={(e) => setInch(e.target.value)}
                      className="w-24 rounded-lg border border-border bg-background px-3 py-2" />
                  </>
                )}
                <select value={heightUnit} onChange={(e) => setHeightUnit(e.target.value)}
                  className="rounded-lg border border-border bg-background px-2">
                  <option value="cm">cm</option>
                  <option value="ft">ft / in</option>
                </select>
              </div>
              <p className="text-xs text-muted-foreground">Your height sets the scale, so the more exact it is, the better the estimates.</p>
              <button
                disabled={!heightOk}
                onClick={() => setStep("FRONT")}
                className="w-full inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground disabled:opacity-40"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </>
          )}

          {(step === "FRONT" || step === "SIDE") && (
            <PhotoStep
              kind={step}
              shot={shots[step]}
              busy={busy}
              onFile={(f) => onFile(step, f)}
              onRetake={() => setShots((s) => ({ ...s, [step]: undefined }))}
              onNext={() => setStep(step === "FRONT" ? "SIDE" : "review")}
              onSkip={step === "SIDE" ? () => setStep("review") : null}
            />
          )}

          {step === "review" && estimate && (
            <>
              <div className="grid grid-cols-2 gap-2">
                {["FRONT", "SIDE"].map((k) =>
                  shots[k] && !shots[k].analysis?.error ? (
                    <PhotoOverlay key={k} src={shots[k].url} analysis={shots[k].analysis} alt={`${k} photo`} />
                  ) : null,
                )}
              </div>
              {estimate.warnings.length > 0 && (
                <ul className="space-y-1 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
                  {estimate.warnings.map((w) => (
                    <li key={w} className="flex gap-2"><AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{w}</li>
                  ))}
                </ul>
              )}
              <div>
                <h3 className="mb-2 flex items-center gap-2 font-semibold"><Ruler className="w-4 h-4 text-primary" /> Estimated measurements</h3>
                <div className="divide-y divide-border rounded-lg border border-border">
                  {ORDER.filter((k) => estimate.valuesCm[k] != null).map((k) => (
                    <div key={k} className="flex justify-between px-3 py-2 text-sm">
                      <span>{LABEL[k]}</span>
                      <span className="font-semibold tabular-nums">
                        {cmToUnit(estimate.valuesCm[k], unit)} {unit === "CENTIMETER" ? "cm" : "in"}
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Estimates are usually within a few cm. Please check them, especially bust, waist and hip, and
                  correct any that look wrong in the form. Dress length isn't estimated because it depends on the style.
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setStep("FRONT")} className="flex-1 rounded-lg border border-border px-4 py-2.5 text-sm">
                  Retake photos
                </button>
                <button onClick={apply} className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground">
                  <Check className="w-4 h-4" /> Use these numbers
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PhotoStep({ kind, shot, busy, onFile, onRetake, onNext, onSkip }) {
  const info = PHOTO_STEPS[kind];
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);
  const failed = shot?.analysis?.error;

  return (
    <>
      <h3 className="font-semibold">{info.title}</h3>
      {!shot && (
        <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
          {info.tips.map((t) => <li key={t}>{t}</li>)}
        </ul>
      )}

      {busy && (
        <div className="flex items-center justify-center gap-2 rounded-lg bg-muted py-10 text-sm">
          <Loader2 className="w-5 h-5 animate-spin" /> Analysing the photo…
        </div>
      )}

      {!busy && shot && (
        <>
          <PhotoOverlay src={shot.url} analysis={failed ? null : shot.analysis} alt={`${kind} photo`} className="max-h-[50vh]" />
          {failed && (
            <p className="flex gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />{shot.analysis.error}
            </p>
          )}
          {!failed && shot.analysis.warnings?.length > 0 && (
            <ul className="space-y-1 rounded-lg bg-amber-500/10 p-3 text-sm text-amber-700 dark:text-amber-300">
              {shot.analysis.warnings.map((w) => <li key={w}>{w}</li>)}
            </ul>
          )}
          {!failed && (
            <p className="text-xs text-muted-foreground">
              The pink lines show where we measured. If a line is in the wrong place, retake the photo.
            </p>
          )}
        </>
      )}

      <input ref={cameraRef} type="file" accept="image/*" capture="environment" hidden
        onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />
      <input ref={galleryRef} type="file" accept="image/*" hidden
        onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = ""; }} />

      {!busy && (!shot || failed) && (
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => cameraRef.current?.click()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground">
            <Camera className="w-4 h-4" /> Take photo
          </button>
          <button onClick={() => galleryRef.current?.click()} className="inline-flex items-center justify-center gap-2 rounded-lg border border-border px-4 py-2.5">
            <ImagePlus className="w-4 h-4" /> Choose photo
          </button>
        </div>
      )}
      {!busy && shot && !failed && (
        <div className="flex gap-2">
          <button onClick={onRetake} className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg border border-border px-4 py-2.5 text-sm">
            <RotateCcw className="w-4 h-4" /> Retake
          </button>
          <button onClick={onNext} className="flex-1 inline-flex items-center justify-center gap-1 rounded-lg bg-primary px-4 py-2.5 font-medium text-primary-foreground">
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
      {onSkip && !shot && !busy && (
        <button onClick={onSkip} className="w-full text-sm text-muted-foreground underline">
          Skip the side photo (fewer measurements)
        </button>
      )}
    </>
  );
}

/** Uploads the prepared photos; returns their ids. */
export async function uploadPhotos(photos, url) {
  const ids = [];
  for (const p of photos) {
    const form = new FormData();
    form.append("file", p.blob, `${p.kind.toLowerCase()}.jpg`);
    form.append("kind", p.kind);
    form.append("width", String(p.width));
    form.append("height", String(p.height));
    form.append("analysis", JSON.stringify(p.analysis));
    const res = await fetch(url, { method: "POST", body: form });
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error || "Photo upload failed");
    ids.push((await res.json()).id);
  }
  return ids;
}
