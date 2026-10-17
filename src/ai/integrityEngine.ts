import { 
  RiskLevel, 
  SuspiciousMoment, 
  TelemetryFrame, 
  ViolationType,
  GazeVector,
  HeadPose 
} from '../types/proctor';
import { FaceAnalysisResult } from './faceMeshDetector';

export class IntegrityEngine {
  private baseScore = 100;
  private currentScore = 100;
  private violations: SuspiciousMoment[] = [];
  private telemetryHistory: TelemetryFrame[] = [];
  private startTime = Date.now();

  // Sustained violation tracking buffers
  private sustainedCornerGazeStart: number | null = null;
  private sustainedHeadTurnStart: number | null = null;
  private sustainedAbsenceStart: number | null = null;
  private lastViolationTime: number = 0;

  constructor(startTime: number = Date.now()) {
    this.startTime = startTime;
  }

  /**
   * Resets the engine state
   */
  reset(newStartTime: number = Date.now()): void {
    this.baseScore = 100;
    this.currentScore = 100;
    this.violations = [];
    this.telemetryHistory = [];
    this.startTime = newStartTime;
    this.sustainedCornerGazeStart = null;
    this.sustainedHeadTurnStart = null;
    this.sustainedAbsenceStart = null;
    this.lastViolationTime = 0;
  }

  /**
   * Evaluates incoming frame telemetry and logs violations if thresholds exceeded
   */
  processFrame(
    analysis: FaceAnalysisResult,
    screenActive: boolean,
    isFullscreen: boolean,
    webcamCanvas: HTMLCanvasElement | null,
    screenCanvas: HTMLCanvasElement | null,
    customTimeSec?: number
  ): {
    score: number;
    risk: RiskLevel;
    newViolation: SuspiciousMoment | null;
  } {
    const now = Date.now();
    const elapsedSec = customTimeSec !== undefined ? customTimeSec : (now - this.startTime) / 1000;
    let newViolation: SuspiciousMoment | null = null;

    // 1. Absence / Face Missing Check
    if (!analysis.faceDetected) {
      if (!this.sustainedAbsenceStart) {
        this.sustainedAbsenceStart = now;
      } else if (now - this.sustainedAbsenceStart > 2000 && (now - this.lastViolationTime > 4000)) {
        newViolation = this.recordViolation(
          'FACE_MISSING',
          'high',
          0.95,
          'Candidate Missing from Camera View',
          'No facial landmarks detected in the proctoring frame for over 2 seconds.',
          analysis.gaze,
          analysis.headPose,
          webcamCanvas,
          screenCanvas,
          elapsedSec,
          2.5
        );
        this.sustainedAbsenceStart = now; // reset buffer
      }
    } else {
      this.sustainedAbsenceStart = null;
    }

    // 2. Multiple Faces Detected
    if (analysis.faceDetected && analysis.faceCount > 1 && (now - this.lastViolationTime > 4000)) {
      newViolation = this.recordViolation(
        'MULTIPLE_FACES',
        'critical',
        0.98,
        'Multiple Individuals in Frame',
        `AI detected ${analysis.faceCount} distinct faces within the candidate's testing space.`,
        analysis.gaze,
        analysis.headPose,
        webcamCanvas,
        screenCanvas,
        elapsedSec
      );
    }

    // 3. Suspicious Screen Corner Glancing (Candidate peeking at second monitor or hidden notes)
    if (analysis.faceDetected && analysis.suspiciousRegion && ['TOP_LEFT', 'TOP_RIGHT', 'BOTTOM_LEFT', 'BOTTOM_RIGHT'].includes(analysis.suspiciousRegion)) {
      if (!this.sustainedCornerGazeStart) {
        this.sustainedCornerGazeStart = now;
      } else if (now - this.sustainedCornerGazeStart > 1800 && (now - this.lastViolationTime > 3500)) {
        const cornerName = analysis.suspiciousRegion.replace('_', ' ');
        newViolation = this.recordViolation(
          'SUSPICIOUS_CORNER_GAZE',
          'medium',
          0.89,
          `Prolonged Glance at ${cornerName}`,
          `Candidate gaze diverted towards the ${cornerName} corner for over 2 seconds.`,
          analysis.gaze,
          analysis.headPose,
          webcamCanvas,
          screenCanvas,
          elapsedSec,
          2.0,
          analysis.suspiciousRegion
        );
        this.sustainedCornerGazeStart = null;
      }
    } else {
      this.sustainedCornerGazeStart = null;
    }

    // 4. Extreme Head Turn / Looking Off-Screen
    if (analysis.faceDetected && (Math.abs(analysis.headPose.yaw) > 25 || analysis.headPose.pitch > 25 || analysis.headPose.pitch < -22)) {
      if (!this.sustainedHeadTurnStart) {
        this.sustainedHeadTurnStart = now;
      } else if (now - this.sustainedHeadTurnStart > 2200 && (now - this.lastViolationTime > 4000)) {
        const dir = analysis.headPose.yaw < -25 ? 'Left' : analysis.headPose.yaw > 25 ? 'Right' : analysis.headPose.pitch > 25 ? 'Down (Phone/Notes)' : 'Up';
        newViolation = this.recordViolation(
          'HEAD_TURNED_AWAY',
          'high',
          0.94,
          `Head Turned ${dir} Off-Center`,
          `Candidate turned their head away from the exam screen (Yaw: ${analysis.headPose.yaw}°, Pitch: ${analysis.headPose.pitch}°).`,
          analysis.gaze,
          analysis.headPose,
          webcamCanvas,
          screenCanvas,
          elapsedSec,
          2.5
        );
        this.sustainedHeadTurnStart = null;
      }
    } else {
      this.sustainedHeadTurnStart = null;
    }

    // Calculate current risk level
    const risk = this.getRiskLevel(this.currentScore);

    // Save telemetry history point
    const telemetryFrame: TelemetryFrame = {
      timestamp: now,
      timeOffsetSec: elapsedSec,
      gaze: analysis.gaze,
      headPose: analysis.headPose,
      faceDetected: analysis.faceDetected,
      faceCount: analysis.faceCount,
      blinkDetected: analysis.isBlinking,
      tabActive: screenActive,
      isFullscreen,
      integrityScore: Math.round(this.currentScore),
      riskLevel: risk
    };
    this.telemetryHistory.push(telemetryFrame);

    // Limit in-memory telemetry buffer to last 2000 points
    if (this.telemetryHistory.length > 2000) {
      this.telemetryHistory.shift();
    }

    return {
      score: Math.round(this.currentScore),
      risk,
      newViolation
    };
  }

  /**
   * Records a manual or programmatic violation (e.g. Tab Switch, Fullscreen Exit, Key Combination)
   */
  recordViolation(
    type: ViolationType,
    severity: 'low' | 'medium' | 'high' | 'critical',
    confidence: number,
    title: string,
    description: string,
    gaze: GazeVector,
    headPose: HeadPose,
    webcamCanvas: HTMLCanvasElement | null,
    screenCanvas: HTMLCanvasElement | null,
    timeOffsetSec: number,
    durationSec: number = 1,
    regionTag?: string
  ): SuspiciousMoment {
    // Penalty Weights
    let penalty = 4;
    if (severity === 'medium') penalty = 8;
    if (severity === 'high') penalty = 15;
    if (severity === 'critical') penalty = 25;

    this.currentScore = Math.max(0, this.currentScore - penalty);
    this.lastViolationTime = Date.now();

    // Snapshots
    let webcamSnapshot = '';
    if (webcamCanvas) {
      try {
        webcamSnapshot = webcamCanvas.toDataURL('image/jpeg', 0.85);
      } catch (e) {
        console.warn('Canvas export failed', e);
      }
    }

    let screenSnapshot = '';
    if (screenCanvas) {
      try {
        screenSnapshot = screenCanvas.toDataURL('image/jpeg', 0.85);
      } catch (e) {
        console.warn('Screen canvas export failed', e);
      }
    }

    const mins = Math.floor(timeOffsetSec / 60);
    const secs = Math.floor(timeOffsetSec % 60);
    const formattedTime = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    const moment: SuspiciousMoment = {
      id: `violation-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      timeOffsetSec: Math.round(timeOffsetSec),
      formattedTime,
      type,
      severity,
      confidence,
      title,
      description,
      evidence: {
        webcamSnapshot,
        screenSnapshot,
        gazeCoord: { x: gaze.x, y: gaze.y },
        headPoseSnapshot: headPose,
        regionTag: regionTag || gaze.region
      },
      durationSec,
      flaggedByAI: true
    };

    this.violations.push(moment);
    return moment;
  }

  getRiskLevel(score: number): RiskLevel {
    if (score >= 90) return 'SAFE';
    if (score >= 75) return 'LOW';
    if (score >= 50) return 'MEDIUM';
    if (score >= 25) return 'HIGH';
    return 'CRITICAL';
  }

  getScore(): number {
    return Math.round(this.currentScore);
  }

  getViolations(): SuspiciousMoment[] {
    return this.violations;
  }

  getTelemetryHistory(): TelemetryFrame[] {
    return this.telemetryHistory;
  }
}
