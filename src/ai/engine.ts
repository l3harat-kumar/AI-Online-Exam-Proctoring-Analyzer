/* =================================================================
   AI ENGINE — Face Detection, Gaze Estimation, Integrity Scoring
   ================================================================= */

import type {
  FaceFrame, GazeZone, GazeVector, HeadPose,
  BehaviorMetrics, RiskLevel, Violation, ViolationType, CheatingReport, CheatingVerdict
} from '../types/index';

// ─── MediaPipe window augment ─────────────────────────────────────
declare global {
  interface Window { FaceMesh?: any; Camera?: any; }
}

// ─── Landmark indices ─────────────────────────────────────────────
const L = {
  NOSE_TIP: 1, NOSE_BRIDGE: 168, CHIN: 152,
  L_EYE_OUT: 33, L_EYE_IN: 133, R_EYE_OUT: 263, R_EYE_IN: 362,
  L_EYE_TOP: 159, L_EYE_BOT: 145, R_EYE_TOP: 386, R_EYE_BOT: 374,
  L_IRIS: 468, R_IRIS: 473,
};

// ─── HEAD POSE ESTIMATION ─────────────────────────────────────────
export function estimateHeadPose(lm: any[]): HeadPose {
  if (!lm || lm.length < 10) return { yaw: 0, pitch: 0, roll: 0 };
  const nose  = lm[L.NOSE_TIP],  bridge = lm[L.NOSE_BRIDGE];
  const chin  = lm[L.CHIN];
  const lEye  = lm[L.L_EYE_OUT], rEye  = lm[L.R_EYE_OUT];
  if (!nose || !bridge || !chin || !lEye || !rEye) return { yaw: 0, pitch: 0, roll: 0 };

  const roll  = Math.round(Math.atan2(rEye.y - lEye.y, rEye.x - lEye.x) * 180 / Math.PI * 10) / 10;
  const eyeW  = Math.abs(rEye.x - lEye.x) || 0.001;
  const yaw   = Math.round(((nose.x - (lEye.x + rEye.x) / 2) / eyeW) * 145 * 10) / 10;
  const vSpan = Math.abs(chin.y - bridge.y) || 0.001;
  const pitch = Math.round(((nose.y - bridge.y) / vSpan - 0.40) * 160 * 10) / 10;

  return {
    yaw:   Math.max(-90, Math.min(90, yaw)),
    pitch: Math.max(-90, Math.min(90, pitch)),
    roll:  Math.max(-45, Math.min(45, roll)),
  };
}

// ─── GAZE ESTIMATION ─────────────────────────────────────────────
export function estimateGaze(lm: any[], pose: HeadPose): GazeVector {
  if (!lm || lm.length < 10) return { x: 0.5, y: 0.5, zone: 'CENTER', confidence: 0.8 };

  const lIn = lm[L.L_EYE_IN], lOut = lm[L.L_EYE_OUT];
  const rIn = lm[L.R_EYE_IN], rOut = lm[L.R_EYE_OUT];
  const lIris = lm[L.L_IRIS] || lm[L.L_EYE_IN];
  const rIris = lm[L.R_IRIS] || lm[L.R_EYE_IN];

  let lRatioX = 0.5, rRatioX = 0.5;
  if (lIn && lOut && lIris) {
    const w = Math.abs(lIn.x - lOut.x);
    if (w > 0.001) lRatioX = (lIris.x - lOut.x) / (lIn.x - lOut.x);
  }
  if (rIn && rOut && rIris) {
    const w = Math.abs(rOut.x - rIn.x);
    if (w > 0.001) rRatioX = (rIris.x - rIn.x) / (rOut.x - rIn.x);
  }
  const avgIris = (lRatioX + rRatioX) / 2;

  const rawX = 0.5 + (pose.yaw / 60) * 0.4 + (avgIris - 0.5) * 0.6;
  const rawY = 0.5 + (pose.pitch / 50) * 0.45;
  const x = Math.max(0, Math.min(1, rawX));
  const y = Math.max(0, Math.min(1, rawY));

  // Determine zone
  let zone: GazeZone = 'CENTER';
  if      (pose.yaw < -30 || x < 0.1)  zone = 'OFF_LEFT';
  else if (pose.yaw >  30 || x > 0.9)  zone = 'OFF_RIGHT';
  else if (pose.pitch > 28 || y > 0.9) zone = 'OFF_DOWN';
  else if (pose.pitch < -26 || y < 0.1) zone = 'OFF_UP';
  else {
    const isL = x < 0.36, isR = x > 0.64;
    const isT = y < 0.36, isB = y > 0.64;
    if (isT && isL)  zone = 'TOP_LEFT';
    else if (isT && isR) zone = 'TOP_RIGHT';
    else if (isB && isL) zone = 'BOTTOM_LEFT';
    else if (isB && isR) zone = 'BOTTOM_RIGHT';
    else if (isT) zone = 'TOP';
    else if (isB) zone = 'BOTTOM';
    else if (isL) zone = 'LEFT';
    else if (isR) zone = 'RIGHT';
  }

  return { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100, zone, confidence: 0.92 };
}

// ─── EAR (Eye Aspect Ratio) ───────────────────────────────────────
function ear(top: any, bot: any, outer: any, inner: any): number {
  if (!top || !bot || !outer || !inner) return 0.28;
  const v = Math.hypot(top.x - bot.x, top.y - bot.y);
  const h = Math.hypot(outer.x - inner.x, outer.y - inner.y) || 1;
  return v / h;
}

// ─── ANALYZE FULL FACE FRAME ─────────────────────────────────────
export function analyzeFrame(multiFaceLandmarks: any[][]): FaceFrame {
  const BLANK: FaceFrame = {
    faceDetected: false, faceCount: 0, landmarks: null,
    headPose: { yaw: 0, pitch: 0, roll: 0 },
    gaze: { x: 0.5, y: 0.5, zone: 'CENTER', confidence: 0 },
    earLeft: 0, earRight: 0, isBlinking: false,
    isLookingAway: false, suspiciousZone: null,
  };

  if (!multiFaceLandmarks?.length) return BLANK;

  const lm      = multiFaceLandmarks[0];
  const pose    = estimateHeadPose(lm);
  const gaze    = estimateGaze(lm, pose);
  const earL    = ear(lm[L.L_EYE_TOP], lm[L.L_EYE_BOT], lm[L.L_EYE_OUT], lm[L.L_EYE_IN]);
  const earR    = ear(lm[L.R_EYE_TOP], lm[L.R_EYE_BOT], lm[L.R_EYE_OUT], lm[L.R_EYE_IN]);
  const blink   = earL < 0.16 && earR < 0.16;
  const away    = gaze.zone.startsWith('OFF') || Math.abs(pose.yaw) > 25 || pose.pitch > 24 || pose.pitch < -22;
  const corners = ['TOP_LEFT','TOP_RIGHT','BOTTOM_LEFT','BOTTOM_RIGHT'] as GazeZone[];

  return {
    faceDetected: true, faceCount: multiFaceLandmarks.length, landmarks: lm,
    headPose: pose, gaze,
    earLeft: Math.round(earL * 100) / 100, earRight: Math.round(earR * 100) / 100,
    isBlinking: blink, isLookingAway: away,
    suspiciousZone: (corners.includes(gaze.zone) || away) ? gaze.zone : null,
  };
}

// ─── DRAW AI HUD ON CANVAS ───────────────────────────────────────
export function drawHUD(ctx: CanvasRenderingContext2D, w: number, h: number, frame: FaceFrame) {
  ctx.clearRect(0, 0, w, h);

  if (!frame.faceDetected || !frame.landmarks) {
    // No face overlay
    ctx.fillStyle = 'rgba(239,68,68,0.12)';
    ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#ef4444'; ctx.lineWidth = 2; ctx.setLineDash([8, 6]);
    ctx.strokeRect(12, 12, w - 24, h - 24);
    ctx.setLineDash([]);
    ctx.fillStyle = '#ef4444'; ctx.font = 'bold 14px Inter';
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('NO FACE DETECTED', w / 2, h / 2);
    return;
  }

  const lm = frame.landmarks;
  const ok  = !frame.isLookingAway;
  const color1 = ok ? 'rgba(99,102,241,0.7)' : 'rgba(239,68,68,0.8)';
  const color2 = ok ? '#06b6d4' : '#ef4444';
  const color3 = ok ? '#10b981' : '#ef4444';

  // ── Mesh point cloud
  const pts = [1,33,133,159,145,263,362,386,374,61,291,152,10,176,400,379,234,454];
  ctx.fillStyle = color1;
  pts.forEach(i => {
    const p = lm[i];
    if (!p) return;
    ctx.beginPath(); ctx.arc(p.x * w, p.y * h, 2, 0, 2 * Math.PI); ctx.fill();
  });

  // ── Eye contours
  const drawLoop = (indices: number[], stroke: string) => {
    ctx.strokeStyle = stroke; ctx.lineWidth = 1.5; ctx.beginPath();
    let first = true;
    indices.forEach(i => {
      const p = lm[i]; if (!p) return;
      if (first) { ctx.moveTo(p.x * w, p.y * h); first = false; }
      else ctx.lineTo(p.x * w, p.y * h);
    });
    ctx.closePath(); ctx.stroke();
  };
  drawLoop([33,160,158,133,153,144], color2);
  drawLoop([263,387,385,362,380,373], color2);

  // ── Iris dots
  [468, 473].forEach((i, idx) => {
    const p = lm[i] || lm[idx === 0 ? 133 : 362];
    if (!p) return;
    ctx.fillStyle = color3;
    ctx.beginPath(); ctx.arc(p.x * w, p.y * h, 3.5, 0, 2 * Math.PI); ctx.fill();
  });

  // ── Head orientation ray from nose tip
  const nose = lm[1];
  if (nose) {
    const nx = nose.x * w, ny = nose.y * h;
    const rad = 60;
    const tx = nx + Math.sin(frame.headPose.yaw * Math.PI / 180) * rad;
    const ty = ny + Math.sin(frame.headPose.pitch * Math.PI / 180) * rad;
    ctx.strokeStyle = color3; ctx.lineWidth = 2.5; ctx.setLineDash([]);
    ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.fillStyle = color3;
    ctx.beginPath(); ctx.arc(tx, ty, 5, 0, 2 * Math.PI); ctx.fill();
  }

  // ── Bounding reticle
  const chin = lm[152], bridge = lm[168], lEye = lm[33], rEye = lm[263];
  if (chin && bridge && lEye && rEye) {
    const mx = Math.min(lEye.x, rEye.x) * w - 28;
    const Mx = Math.max(lEye.x, rEye.x) * w + 28;
    const my = bridge.y * h - 36;
    const My = chin.y * h + 20;
    ctx.strokeStyle = ok ? 'rgba(99,102,241,0.4)' : 'rgba(239,68,68,0.5)';
    ctx.lineWidth = 1.5; ctx.setLineDash([5, 5]);
    ctx.strokeRect(mx, my, Mx - mx, My - my);
    ctx.setLineDash([]);
  }
}

// ─── INTEGRITY SCORING ENGINE ─────────────────────────────────────
export class IntegrityEngine {
  private score = 100;
  private violations: Violation[] = [];
  private startTime: number;

  // Sustained timers
  private cornerStart: number | null = null;
  private headTurnStart: number | null = null;
  private absenceStart: number | null = null;
  private lastViolTime = 0;

  constructor(startTime: number) { this.startTime = startTime; }

  getScore() { return Math.round(this.score); }
  getRisk(): RiskLevel {
    const s = this.score;
    if (s >= 90) return 'SAFE';
    if (s >= 75) return 'LOW';
    if (s >= 50) return 'MEDIUM';
    if (s >= 25) return 'HIGH';
    return 'CRITICAL';
  }
  getViolations() { return this.violations; }

  penalize(amount: number) {
    this.score = Math.max(0, this.score - amount);
    this.lastViolTime = Date.now();
  }

  reset() {
    this.score = 100; this.violations = [];
    this.cornerStart = this.headTurnStart = this.absenceStart = null;
    this.lastViolTime = 0; this.startTime = Date.now();
  }

  processFrame(
    frame: FaceFrame,
    webcamCanvas: HTMLCanvasElement | null,
    screenCanvas: HTMLCanvasElement | null,
  ): Violation | null {
    const now     = Date.now();
    const offset  = Math.round((now - this.startTime) / 1000);
    const coolOK  = now - this.lastViolTime > 3500;

    // ── ABSENCE
    if (!frame.faceDetected) {
      if (!this.absenceStart) this.absenceStart = now;
      else if (now - this.absenceStart > 2200 && coolOK) {
        this.absenceStart = now;
        return this._record('FACE_MISSING', 'high', 0.95,
          'Candidate Missing from Camera',
          'No face detected in webcam view for over 2 seconds.',
          frame, webcamCanvas, screenCanvas, offset);
      }
    } else { this.absenceStart = null; }

    // ── MULTIPLE FACES
    if (frame.faceDetected && frame.faceCount > 1 && coolOK) {
      return this._record('MULTIPLE_FACES', 'critical', 0.98,
        'Multiple People Detected',
        `${frame.faceCount} faces detected in the test environment.`,
        frame, webcamCanvas, screenCanvas, offset);
    }

    // ── CORNER GAZE
    const isCorner = frame.suspiciousZone && ['TOP_LEFT','TOP_RIGHT','BOTTOM_LEFT','BOTTOM_RIGHT'].includes(frame.suspiciousZone);
    if (frame.faceDetected && isCorner) {
      if (!this.cornerStart) this.cornerStart = now;
      else if (now - this.cornerStart > 1800 && coolOK) {
        this.cornerStart = now;
        return this._record('CORNER_GAZE', 'medium', 0.88,
          `Corner Gaze: ${frame.suspiciousZone?.replace('_',' ')}`,
          `Sustained gaze at ${frame.suspiciousZone} corner for over 2 seconds.`,
          frame, webcamCanvas, screenCanvas, offset, frame.suspiciousZone ?? undefined);
      }
    } else { this.cornerStart = null; }

    // ── HEAD TURN
    if (frame.faceDetected && (Math.abs(frame.headPose.yaw) > 27 || frame.headPose.pitch > 26 || frame.headPose.pitch < -23)) {
      if (!this.headTurnStart) this.headTurnStart = now;
      else if (now - this.headTurnStart > 2000 && coolOK) {
        this.headTurnStart = now;
        const dir = frame.headPose.yaw < -27 ? 'Left' : frame.headPose.yaw > 27 ? 'Right' : frame.headPose.pitch > 26 ? 'Down' : 'Up';
        return this._record('HEAD_TURN', 'high', 0.93,
          `Head Turned ${dir}`,
          `Head deviated ${dir} (Yaw: ${frame.headPose.yaw}°, Pitch: ${frame.headPose.pitch}°).`,
          frame, webcamCanvas, screenCanvas, offset);
      }
    } else { this.headTurnStart = null; }

    return null;
  }

  _record(
    type: Violation['type'],
    severity: Violation['severity'],
    confidence: number,
    title: string,
    description: string,
    frame: FaceFrame,
    wcCanvas: HTMLCanvasElement | null,
    scCanvas: HTMLCanvasElement | null,
    offsetSec: number,
    gazeZone?: string,
  ): Violation {
    const penalty = severity === 'critical' ? 25 : severity === 'high' ? 14 : severity === 'medium' ? 8 : 4;
    this.penalize(penalty);

    const mins = Math.floor(offsetSec / 60), secs = offsetSec % 60;
    const timeLabel = `${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`;

    let webcamSnap = '';
    try { if (wcCanvas) webcamSnap = wcCanvas.toDataURL('image/jpeg', 0.82); } catch (_) {}
    let screenSnap = '';
    try { if (scCanvas) screenSnap = scCanvas.toDataURL('image/jpeg', 0.75); } catch (_) {}

    // fallback SVG snapshot
    if (!webcamSnap) webcamSnap = makeSVGSnapshot(title, frame, type);

    const v: Violation = {
      id: `v-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
      timestamp: Date.now(), offsetSec, timeLabel,
      type, severity, confidence, title, description,
      webcamSnap, screenSnap: screenSnap || undefined,
      gazeZone: gazeZone || frame.gaze.zone,
      headPose: { ...frame.headPose },
    };
    this.violations.push(v);
    return v;
  }

  addExternalViolation(v: Violation) {
    const penalty = v.severity === 'critical' ? 25 : v.severity === 'high' ? 14 : 8;
    this.penalize(penalty);
    this.violations.push(v);
  }
}

// ─── SYNTHETIC SVG SNAPSHOT (fallback) ───────────────────────────
function makeSVGSnapshot(title: string, frame: FaceFrame, type: string): string {
  const isHigh = type === 'TAB_SWITCH' || type === 'MULTIPLE_FACES' || type === 'FACE_MISSING';
  const bgColor = isHigh ? '#1a0505' : '#070d1f';
  const accentColor = isHigh ? '#ef4444' : '#f59e0b';
  const gx = Math.round(frame.gaze.x * 640);
  const gy = Math.round(frame.gaze.y * 360);
  const label = title.length > 42 ? title.slice(0, 42) + '…' : title;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
    <rect width="640" height="360" fill="${bgColor}"/>
    <defs>
      <radialGradient id="g" cx="${frame.gaze.x*100}%" cy="${frame.gaze.y*100}%" r="35%">
        <stop offset="0%" stop-color="${accentColor}" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="${accentColor}" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <circle cx="${gx}" cy="${gy}" r="140" fill="url(#g)"/>
    <!-- grid -->
    <path d="M0 120H640M0 240H640M213 0V360M426 0V360" stroke="#1e293b" stroke-width="1"/>
    <!-- face silhouette -->
    <ellipse cx="320" cy="165" rx="62" ry="78" fill="#1e293b" stroke="${accentColor}" stroke-width="1.5" stroke-dasharray="5,4"/>
    <!-- eyes -->
    <ellipse cx="300" cy="148" rx="12" ry="7" fill="none" stroke="#6366f1" stroke-width="1.5"/>
    <ellipse cx="340" cy="148" rx="12" ry="7" fill="none" stroke="#6366f1" stroke-width="1.5"/>
    <!-- gaze ray -->
    <line x1="320" y1="165" x2="${gx}" y2="${gy}" stroke="${accentColor}" stroke-width="2" stroke-dasharray="4,3"/>
    <circle cx="${gx}" cy="${gy}" r="8" fill="none" stroke="${accentColor}" stroke-width="2"/>
    <circle cx="${gx}" cy="${gy}" r="3" fill="${accentColor}"/>
    <!-- badge top -->
    <rect x="0" y="0" width="640" height="28" fill="rgba(0,0,0,0.7)"/>
    <text x="12" y="18" fill="${accentColor}" font-family="monospace" font-size="11" font-weight="bold">⚠ AI TELEMETRY SNAPSHOT</text>
    <!-- caption bottom -->
    <rect x="0" y="332" width="640" height="28" fill="rgba(0,0,0,0.75)"/>
    <text x="12" y="350" fill="#94a3b8" font-family="monospace" font-size="10">${label}</text>
    <text x="628" y="350" fill="#64748b" font-family="monospace" font-size="9" text-anchor="end">Yaw:${frame.headPose.yaw}° P:${frame.headPose.pitch}°</text>
  </svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// ─── CHEATING CLASSIFIER ─────────────────────────────────────────
export function buildCheatingReport(
  violations: Violation[],
  metrics: {
    tabSwitchCount: number;
    cornerGlanceCount: number;
    offScreenCount: number;
    faceMissingCount: number;
    multipleFaceCount: number;
    headTurnCount: number;
    integrityScore: number;
  }
): CheatingReport {
  // Cohort baselines (average honest candidate)
  const BENCH = {
    tabSwitch: 0.1, cornerGlance: 0.5, offScreen: 1.5,
    faceMissing: 0.0, multiPerson: 0.0, headTurn: 0.8,
  };

  let likelihood = 0;
  const evidences: string[] = [];

  if (metrics.tabSwitchCount > 0)   { likelihood += Math.min(38, metrics.tabSwitchCount * 18); evidences.push(`${metrics.tabSwitchCount} unauthorized browser window switch(es) detected.`); }
  if (metrics.multipleFaceCount > 0){ likelihood += 45; evidences.push(`Additional person detected in ${metrics.multipleFaceCount} frame(s).`); }
  if (metrics.cornerGlanceCount >= 2){ likelihood += Math.min(32, metrics.cornerGlanceCount * 8); evidences.push(`${metrics.cornerGlanceCount} sustained corner glances (possible hidden notes).`); }
  if (metrics.headTurnCount >= 2)   { likelihood += Math.min(20, metrics.headTurnCount * 5); evidences.push(`${metrics.headTurnCount} prolonged head rotations away from screen.`); }
  if (metrics.faceMissingCount > 0) { likelihood += Math.min(18, metrics.faceMissingCount * 6); evidences.push(`${metrics.faceMissingCount} desk absence event(s) detected.`); }

  likelihood = Math.min(99, Math.max(2, Math.round(likelihood)));

  let verdict: CheatingVerdict = 'CLEAN';
  let verdictReason = 'No significant behavioral anomalies detected. Candidate maintained consistent gaze and focus on the exam throughout the session.';

  if (metrics.multipleFaceCount > 0 || (metrics.tabSwitchCount >= 2 && metrics.cornerGlanceCount >= 2) || likelihood >= 60) {
    verdict = 'CONFIRMED';
    verdictReason = `Multiple independent AI signals confirm cheating behavior. ${evidences.length} critical anomaly pattern(s) identified.`;
  } else if (likelihood >= 25 || metrics.tabSwitchCount >= 1 || metrics.cornerGlanceCount >= 1) {
    verdict = 'SUSPECTED';
    verdictReason = 'Moderate deviation from typical exam behavior. Manual examiner review is recommended.';
  }

  const statusFor = (cand: number, bench: number, highThresh: number, midThresh: number): 'NORMAL' | 'ELEVATED' | 'CRITICAL' =>
    cand >= highThresh ? 'CRITICAL' : cand > bench + midThresh ? 'ELEVATED' : 'NORMAL';

  return {
    verdict, likelihoodPct: likelihood, verdictReason,
    factors: [
      { label: 'Tab / App Switches',   candidateVal: metrics.tabSwitchCount,    cohortAvg: BENCH.tabSwitch,     status: statusFor(metrics.tabSwitchCount,    0, 2, 0.5), unit: 'events' },
      { label: 'Corner Glances',       candidateVal: metrics.cornerGlanceCount,  cohortAvg: BENCH.cornerGlance,  status: statusFor(metrics.cornerGlanceCount,  0, 3, 1),   unit: 'events' },
      { label: 'Off-Screen Gazes',     candidateVal: metrics.offScreenCount,     cohortAvg: BENCH.offScreen,     status: statusFor(metrics.offScreenCount,     2, 6, 2),   unit: 'events' },
      { label: 'Head Turns >25°',      candidateVal: metrics.headTurnCount,      cohortAvg: BENCH.headTurn,      status: statusFor(metrics.headTurnCount,      1, 4, 1),   unit: 'events' },
      { label: 'Face Absences',        candidateVal: metrics.faceMissingCount,   cohortAvg: BENCH.faceMissing,   status: statusFor(metrics.faceMissingCount,   0, 2, 0.5), unit: 'events' },
      { label: 'Multiple People',      candidateVal: metrics.multipleFaceCount,  cohortAvg: BENCH.multiPerson,   status: statusFor(metrics.multipleFaceCount,  0, 1, 0.5), unit: 'events' },
      { label: 'Integrity Score',      candidateVal: `${metrics.integrityScore}%`, cohortAvg: '97%', status: metrics.integrityScore < 50 ? 'CRITICAL' : metrics.integrityScore < 80 ? 'ELEVATED' : 'NORMAL' },
    ],
    primaryEvidences: evidences,
  };
}

// ─── SCREEN TRACKER ──────────────────────────────────────────────
export class ScreenTracker {
  private stream: MediaStream | null = null;
  tabSwitches = 0;
  private listeners: { type: string; target: EventTarget; fn: EventListenerOrEventListenerObject }[] = [];

  on(events: { onTabSwitch?: () => void; onFullscreenExit?: () => void; onSuspiciousKey?: (k: string) => void }) {
    const add = (target: EventTarget, type: string, fn: EventListenerOrEventListenerObject) => {
      target.addEventListener(type, fn);
      this.listeners.push({ type, target, fn });
    };

    add(document, 'visibilitychange', () => {
      if (document.hidden) { this.tabSwitches++; events.onTabSwitch?.(); }
    });
    add(window, 'blur', () => { events.onTabSwitch?.(); });
    add(document, 'fullscreenchange', () => {
      if (!document.fullscreenElement) events.onFullscreenExit?.();
    });
    add(window, 'keydown', (e: Event) => {
      const ke = e as KeyboardEvent;
      const combos: Record<string, boolean> = {
        'Alt+Tab': ke.altKey && ke.key === 'Tab',
        'PrintScreen': ke.key === 'PrintScreen',
        'DevTools (F12)': ke.key === 'F12',
        'Ctrl+C (Copy)': (ke.ctrlKey || ke.metaKey) && ke.key.toLowerCase() === 'c',
        'Ctrl+V (Paste)': (ke.ctrlKey || ke.metaKey) && ke.key.toLowerCase() === 'v',
      };
      const hit = Object.entries(combos).find(([, v]) => v);
      if (hit) events.onSuspiciousKey?.(hit[0]);
    });
  }

  async startScreen(): Promise<MediaStream | null> {
    try {
      this.stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      return this.stream;
    } catch { return null; }
  }

  stop() {
    this.listeners.forEach(({ type, target, fn }) => target.removeEventListener(type, fn));
    this.listeners = [];
    this.stream?.getTracks().forEach(t => t.stop());
    this.stream = null;
  }

  getStream() { return this.stream; }
  async requestFS() {
    try { await document.documentElement.requestFullscreen(); } catch (_) {}
  }
}
