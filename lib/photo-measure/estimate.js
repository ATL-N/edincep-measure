// lib/photo-measure/estimate.js
// Turns pose landmarks + body outline (segmentation mask) from a FRONT and a
// SIDE photo into estimated body measurements, in centimetres.
//
// How it works
//  * Scale: the person's height in pixels (top of head to sole, from the
//    outline) is matched to their real height  ->  cm per pixel.
//  * Levels: bust, waist, hip … are placed between landmarks using typical
//    body proportions (e.g. bust ≈ 27% of the way from shoulders to hips).
//  * Circumference at a level: ellipse whose width comes from the FRONT
//    outline and whose depth comes from the SIDE outline.
//  * Lengths come from landmark distances (shoulder→elbow→wrist, hip→ankle …).
//
// These are estimates (typically within a few cm). The UI always lets the
// person correct them, and the analysis is stored so a designer can see
// exactly which lines were measured on the photos.

// MediaPipe Pose landmark indices
const L = {
  nose: 0, lShoulder: 11, rShoulder: 12, lElbow: 13, rElbow: 14, lWrist: 15, rWrist: 16,
  lHip: 23, rHip: 24, lKnee: 25, rKnee: 26, lAnkle: 27, rAnkle: 28, lHeel: 29, rHeel: 30,
};

const MIN_VIS = 0.5;
const round1 = (v) => Math.round(v * 10) / 10;

const vis = (lm, i) => (lm?.[i] && (lm[i].visibility ?? 1) >= MIN_VIS ? lm[i] : null);
const avg = (a, b) => (a && b ? { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } : a || b || null);
const dist = (a, b, W, H) => Math.hypot((a.x - b.x) * W, (a.y - b.y) * H);

/** True when a limb segment is closer to vertical than horizontal (needed to
 *  measure its thickness with a horizontal line). */
const upright = (a, b, W, H) => a && b && Math.abs((b.y - a.y) * H) > 1.5 * Math.abs((b.x - a.x) * W);

/** Ramanujan's approximation of an ellipse perimeter (a, b = half axes). */
/** x (0..1) of an arm's centre line at height y (shoulder → elbow → wrist); null outside the arm. */
const armX = (S, E, Wr, y) => {
  if (y < S.y) return null;
  if (y <= E.y) return E.y === S.y ? S.x : S.x + ((E.x - S.x) * (y - S.y)) / (E.y - S.y);
  if (Wr && y <= Wr.y) return Wr.y === E.y ? E.x : E.x + ((Wr.x - E.x) * (y - E.y)) / (Wr.y - E.y);
  return null;
};

export const ellipse = (width, depth) => {
  const a = width / 2, b = depth / 2;
  return Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));
};

// ---------------------------------------------------------------------------
// Mask helpers. mask = { data: Float32Array(w*h) in 0..1, width, height }
// ---------------------------------------------------------------------------

const on = (m, x, y) => m.data[y * m.width + x] > 0.5;

/** Topmost and bottom-most body rows near the person's centre line. */
function verticalExtent(m, centerXn, halfBandN = 0.18) {
  const x0 = Math.max(0, Math.floor((centerXn - halfBandN) * m.width));
  const x1 = Math.min(m.width - 1, Math.ceil((centerXn + halfBandN) * m.width));
  const rowHas = (y) => {
    let n = 0;
    for (let x = x0; x <= x1; x++) if (on(m, x, y) && ++n >= 2) return true;
    return false;
  };
  let top = -1, bottom = -1;
  for (let y = 0; y < m.height; y++) if (rowHas(y)) { top = y; break; }
  for (let y = m.height - 1; y >= 0; y--) if (rowHas(y)) { bottom = y; break; }
  return top < 0 ? null : { top, bottom };
}

/**
 * Width of the continuous body region on a row, grown outwards from x.
 * Median over a few neighbouring rows to ignore single-row noise.
 * Returns pixel coordinates { x1, x2 } or null.
 */
function runAt(m, yN, xN) {
  const yc = Math.round(yN * m.height);
  const runs = [];
  for (let dy = -2; dy <= 2; dy += 2) {
    const y = Math.min(m.height - 1, Math.max(0, yc + dy));
    let x = Math.round(xN * m.width);
    // If the seed point is just outside the outline, look nearby.
    if (!on(m, x, y)) {
      const span = Math.round(0.04 * m.width);
      let found = -1;
      for (let d = 1; d <= span && found < 0; d++) {
        if (x - d >= 0 && on(m, x - d, y)) found = x - d;
        else if (x + d < m.width && on(m, x + d, y)) found = x + d;
      }
      if (found < 0) continue;
      x = found;
    }
    let a = x, b = x;
    while (a > 0 && on(m, a - 1, y)) a--;
    while (b < m.width - 1 && on(m, b + 1, y)) b++;
    runs.push({ x1: a, x2: b });
  }
  if (!runs.length) return null;
  runs.sort((p, q) => (p.x2 - p.x1) - (q.x2 - q.x1));
  return runs[Math.floor(runs.length / 2)];
}

// ---------------------------------------------------------------------------
// One photo
// ---------------------------------------------------------------------------

/**
 * Analyses one photo. Returns geometry used by `estimateMeasurements` and
 * stored for the designer, or { error } when the photo can't be used.
 */
export function analysePhoto({ landmarks, mask, kind, heightCm }) {
  const W = mask.width, H = mask.height;
  const lm = landmarks;
  const nose = vis(lm, L.nose);
  const shoulder = avg(vis(lm, L.lShoulder), vis(lm, L.rShoulder));
  const hip = avg(vis(lm, L.lHip), vis(lm, L.rHip));
  const knee = avg(vis(lm, L.lKnee), vis(lm, L.rKnee));
  const ankle = avg(vis(lm, L.lAnkle), vis(lm, L.rAnkle));

  if (!nose || !shoulder || !hip || !knee || !ankle) {
    return { error: 'We could not see your whole body. Stand back so your head and feet are both in the photo.' };
  }

  const centerX = (shoulder.x + hip.x) / 2;
  const ext = verticalExtent(mask, centerX);
  if (!ext) return { error: 'We could not find your outline. Try a plain background with good light.' };

  const bodyPx = ext.bottom - ext.top;
  const warnings = [];
  if (bodyPx < 0.45 * H) warnings.push('You look small in the photo. Stand a little closer so your body fills more of it.');
  if (ext.top <= 1) warnings.push('The top of your head may be cut off.');
  if (ext.bottom >= H - 2) warnings.push('Your feet may be cut off.');

  const cmPerPx = heightCm / bodyPx;
  const torso = hip.y - shoulder.y;
  const thighLen = knee.y - hip.y;

  // Measuring levels (normalised y).
  const levels = {
    neck: shoulder.y - 0.32 * (shoulder.y - nose.y),
    hps: shoulder.y - 0.08 * (shoulder.y - nose.y),
    offShoulder: shoulder.y + 0.08 * torso,
    upperChest: shoulder.y + 0.13 * torso,
    bust: shoulder.y + 0.27 * torso,
    underBust: shoulder.y + 0.41 * torso,
    waist: shoulder.y + 0.63 * torso,
    hip: hip.y + 0.13 * thighLen,
    crotch: hip.y + 0.2 * thighLen,
    thigh: hip.y + 0.3 * thighLen,
    knee: knee.y,
    ankle: ankle.y - 0.05 * (ankle.y - knee.y),
  };

  // The neck is the narrowest part between the chin and the shoulders. Try a
  // few heights (never above the usual neck line, or a wide neck of braids
  // would lose to the head) so the jaw isn't measured instead.
  {
    const seedX = (nose.x + shoulder.x) / 2;
    let bestW = Infinity;
    for (const f of [0.15, 0.22, 0.32]) {
      const y = shoulder.y - f * (shoulder.y - nose.y);
      const r = runAt(mask, y, seedX);
      if (r && r.x2 - r.x1 < bestW) {
        bestW = r.x2 - r.x1;
        levels.neck = y;
      }
    }
  }

  // Horizontal runs (body widths) at each level, in pixels.
  const torsoX = (shoulder.x + hip.x) / 2;
  const lHip = vis(lm, L.lHip) || hip, lKnee = vis(lm, L.lKnee) || knee, lAnkle = vis(lm, L.lAnkle) || ankle;
  const legX = (t) => lHip.x + (lKnee.x - lHip.x) * t;
  const seeds = {
    neck: (nose.x + shoulder.x) / 2,
    offShoulder: torsoX, upperChest: torsoX, bust: torsoX, underBust: torsoX, waist: torsoX, hip: torsoX,
    thigh: kind === 'FRONT' ? legX(0.3) : (hip.x + knee.x) / 2,
    knee: kind === 'FRONT' ? lKnee.x : knee.x,
    ankle: kind === 'FRONT' ? lAnkle.x : ankle.x,
  };
  const legUpright =
    upright(lHip, lKnee, W, H) && upright(lKnee, lAnkle, W, H);
  if (!legUpright) {
    delete seeds.thigh;
    delete seeds.knee;
    delete seeds.ankle;
  }
  const runs = {};
  for (const [key, xN] of Object.entries(seeds)) {
    const r = runAt(mask, levels[key], xN);
    if (r) runs[key] = { x1: r.x1 / W, x2: r.x2 / W, widthCm: round1((r.x2 - r.x1) * cmPerPx) };
  }

  // Thighs (and knees, ankles) that touch show up as one shape in the front
  // photo: measure one leg only, up to the middle between the hips.
  const rHip = vis(lm, L.rHip);
  if (kind === 'FRONT' && rHip) {
    const c = (lHip.x + rHip.x) / 2;
    for (const key of ['thigh', 'knee', 'ankle']) {
      const t = runs[key];
      if (!t || !(t.x1 < c && t.x2 > c)) continue;
      const left = seeds[key] < c;
      const x1 = left ? t.x1 : c, x2 = left ? c : t.x2;
      runs[key] = { x1, x2, widthCm: round1((x2 - x1) * W * cmPerPx) };
    }
  }

  // Arms (front photo only): widths across the upper arm, elbow and wrist.
  const arm = {};
  const armLines = []; // centre line + width (px), to separate arms from the body
  if (kind === 'FRONT') {
    for (const [s, e, w] of [[L.lShoulder, L.lElbow, L.lWrist], [L.rShoulder, L.rElbow, L.rWrist]]) {
      const S = vis(lm, s), E = vis(lm, e), Wr = vis(lm, w);
      if (!S || !E) continue;
      const upper = dist(S, E, W, H) * cmPerPx;
      const lower = Wr ? dist(E, Wr, W, H) * cmPerPx : null;
      const armDown = upright(S, E, W, H) && (!Wr || upright(E, Wr, W, H));
      // Where the upper arm touches the body the outline is one shape; move
      // down the arm to the first place it stands free.
      const tx = Math.round(torsoX * W);
      const free = (A, B, t) => {
        const r = runAt(mask, A.y + (B.y - A.y) * t, A.x + (B.x - A.x) * t);
        return !r || (r.x1 <= tx && r.x2 >= tx) ? null : r;
      };
      let bicep = null;
      if (armDown) for (const t of [0.45, 0.55, 0.65, 0.75, 0.85]) if ((bicep = free(S, E, t))) break;
      // A horizontal cut across a slanted arm is a little wider than the arm.
      const len = dist(S, E, W, H);
      const slant = len === 0 ? 1 : Math.abs((E.y - S.y) * H) / len;
      let armWidthPx = bicep ? bicep.x2 - bicep.x1 : null;
      if (armWidthPx == null && armDown && Wr) {
        const fore = free(E, Wr, 0.4); // forearm, a little thinner than the upper arm
        if (fore) armWidthPx = (fore.x2 - fore.x1) * 1.25;
      }
      if (armWidthPx != null) armLines.push({ S, E, Wr, widthPx: armWidthPx });
      const elbowRun = armDown ? runAt(mask, E.y, E.x) : null;
      const wristRun = armDown && Wr ? runAt(mask, Wr.y - 0.01, Wr.x) : null;
      const cand = {
        upper, lower,
        bicepW: bicep ? (bicep.x2 - bicep.x1) * cmPerPx * slant : null,
        elbowW: elbowRun ? (elbowRun.x2 - elbowRun.x1) * cmPerPx : null,
        wristW: wristRun ? (wristRun.x2 - wristRun.x1) * cmPerPx : null,
      };
      // Keep the better-visible arm (the longer one is less foreshortened).
      if (!arm.upper || upper > arm.upper) Object.assign(arm, cand);
    }
    // Upper arms often rest against the body at chest level, so the outline
    // there includes them. Where a width reaches past an arm's centre line,
    // take the arm's width off that side.
    let trimmed = false;
    for (const key of ['offShoulder', 'upperChest', 'bust', 'underBust', 'waist']) {
      const r = runs[key];
      if (!r) continue;
      let { x1, x2 } = r;
      for (const a of armLines) {
        const ax = armX(a.S, a.E, a.Wr, levels[key]);
        if (ax == null) continue;
        if (ax < torsoX && x1 < ax) x1 += a.widthPx / W;
        if (ax > torsoX && x2 > ax) x2 -= a.widthPx / W;
      }
      if (x1 !== r.x1 || x2 !== r.x2) {
        trimmed = true;
        runs[key] = { x1, x2, widthCm: round1((x2 - x1) * W * cmPerPx) };
      }
    }
    if (trimmed) warnings.push('Your arms touched your body in the front photo. We left them out, but the bust and waist should be checked.');
    // Arms resting against the body make torso widths too large.
    const sw = vis(lm, L.lShoulder) && vis(lm, L.rShoulder) ? dist(vis(lm, L.lShoulder), vis(lm, L.rShoulder), W, H) * cmPerPx : null;
    if (sw && runs.waist && runs.waist.widthCm > 1.25 * sw) {
      warnings.push('Your arms seem to touch your body. Hold them slightly away from your sides and take the front photo again.');
    }
    arm.shoulderJointsCm = sw;
  } else {
    // In a side photo both shoulders line up. If they're far apart, it's not a side view.
    const ls = vis(lm, L.lShoulder), rs = vis(lm, L.rShoulder);
    if (ls && rs && Math.abs(ls.x - rs.x) * W * cmPerPx > 22) {
      warnings.push('The second photo should be taken from the side (turn 90°).');
    }
  }

  // Posture checks: lengths and the height scale assume standing straight.
  const lW = vis(lm, L.lWrist), rW = vis(lm, L.rWrist);
  if ((lW && lW.y < shoulder.y) || (rW && rW.y < shoulder.y)) {
    warnings.push('Keep your arms down (slightly away from your body), not raised.');
  }
  const la = vis(lm, L.lAnkle), ra = vis(lm, L.rAnkle);
  const ls2 = vis(lm, L.lShoulder), rs2 = vis(lm, L.rShoulder);
  if (kind === 'FRONT' && la && ra && ls2 && rs2 && Math.abs(la.x - ra.x) > 1.4 * Math.abs(ls2.x - rs2.x)) {
    warnings.push('Stand straight with your feet only slightly apart.');
  }
  if (!legUpright) warnings.push('Stand up straight with your legs straight for leg measurements.');

  return {
    kind,
    heightCm,
    cmPerPx,
    imageWidth: W,
    imageHeight: H,
    top: ext.top / H,
    bottom: ext.bottom / H,
    levels,
    runs,
    arm,
    points: { nose, shoulder, hip, knee, ankle },
    warnings,
  };
}

// ---------------------------------------------------------------------------
// Both photos -> measurements
// ---------------------------------------------------------------------------

/**
 * @returns {{ valuesCm: Record<string, number>, warnings: string[] }}
 * Keys match the app's measurement fields (bust, waist, shoulderToKnee …).
 */
export function estimateMeasurements(front, side) {
  const v = {};
  const warnings = [...(front?.warnings || []), ...(side?.warnings || [])];
  if (!front) return { valuesCm: v, warnings };

  const cm = (yA, yB) => Math.abs(yB - yA) * front.imageHeight * front.cmPerPx;
  const F = front.levels;

  // --- Circumferences: front width + side depth -> ellipse ---
  const circ = (key, outKey = key) => {
    const w = front.runs[key]?.widthCm;
    const d = side?.runs?.[key]?.widthCm;
    if (w && d) v[outKey] = round1(ellipse(w, d));
  };
  circ('bust');
  circ('underBust');
  circ('waist');
  circ('hip');
  circ('thigh');
  circ('knee');
  circ('ankle');
  circ('offShoulder');
  // Neck: almost round. Hair, braids or a scarf around it make the outline
  // too wide to use.
  const neckW = front.runs.neck?.widthCm, shoulders = front.arm.shoulderJointsCm;
  if (neckW) {
    if (shoulders && neckW > 0.5 * shoulders) {
      warnings.push('Hair or a scarf covered the neck, so it was not measured. Tie long hair up or behind the back for the photos.');
    } else {
      let d = side?.runs?.neck?.widthCm;
      if (!d || d > 1.5 * neckW) d = neckW * 1.05; // side view hidden by hair at the back
      v.neck = round1(ellipse(neckW, d));
    }
  }
  if (!side) warnings.push('Add a side photo to estimate bust, waist, hip and other round measurements.');

  // --- Vertical lengths from the high point of the shoulder ---
  v.shoulderToChest = round1(cm(F.hps, F.upperChest) * 1.03);
  v.shoulderToBust = round1(cm(F.hps, F.bust) * 1.08); // tape drapes over the bust
  v.shoulderToUnderbust = round1(cm(F.hps, F.underBust) * 1.07);
  v.shoulderToWaistFront = round1(cm(F.hps, F.waist) * 1.05);
  v.shoulderToWaistBack = round1(cm(F.hps, F.waist) * 0.97);
  v.waistToHip = round1(cm(F.waist, F.hip));
  v.shoulderToKnee = round1(cm(F.hps, F.knee) * 1.02);
  v.shoulderToAnkle = round1(cm(F.hps, F.ankle) * 1.02);
  v.inSeam = round1(cm(F.crotch, front.points.ankle.y));
  v.outSeam = round1(cm(F.waist, front.points.ankle.y) * 1.02);

  // --- Widths ---
  if (front.arm.shoulderJointsCm) v.shoulderWidth = round1(front.arm.shoulderJointsCm * 1.16);
  if (front.runs.bust) v.nippleToNipple = round1(front.runs.bust.widthCm * 0.58);

  // --- Arms ---
  const a = front.arm;
  if (a.upper) {
    v.shirtSleeve = round1(a.upper * 0.55);
    v.elbowLength = round1(a.upper * 1.04);
    if (a.lower) v.longSleeves = round1((a.upper + a.lower) * 1.05);
    if (a.bicepW) v.aroundArm = round1(Math.PI * a.bicepW * 1.02);
    if (a.elbowW) v.elbow = round1(Math.PI * a.elbowW);
    if (a.wristW) v.wrist = round1(Math.PI * a.wristW * 0.95);
  }

  // Drop anything implausible rather than show a silly number (adult ranges, cm).
  for (const [k, val] of Object.entries(v)) {
    const [lo, hi] = RANGES[k] || [1, 250];
    if (!Number.isFinite(val) || val < lo || val > hi) delete v[k];
  }
  return { valuesCm: v, warnings: [...new Set(warnings)] };
}

const RANGES = {
  neck: [25, 60], bust: [60, 180], underBust: [55, 170], waist: [45, 180], hip: [65, 190],
  offShoulder: [70, 200], thigh: [35, 95], knee: [25, 60], ankle: [15, 40],
  aroundArm: [15, 60], elbow: [15, 45], wrist: [10, 30],
  shoulderWidth: [28, 60], nippleToNipple: [12, 30], shirtSleeve: [8, 40], elbowLength: [20, 50],
  longSleeves: [40, 85], shoulderToChest: [4, 25], shoulderToBust: [12, 40], shoulderToUnderbust: [18, 50],
  shoulderToWaistFront: [28, 60], shoulderToWaistBack: [28, 60], waistToHip: [10, 35],
  shoulderToKnee: [70, 125], shoulderToAnkle: [100, 175], inSeam: [55, 100], outSeam: [75, 125],
};

/** Human labels for drawing the measuring lines on a photo. */
export const LEVEL_LABELS = {
  neck: 'Neck', offShoulder: 'Off shoulder', bust: 'Bust', underBust: 'Under bust', waist: 'Waist',
  hip: 'Hip', thigh: 'Thigh', knee: 'Knee', ankle: 'Ankle',
};
