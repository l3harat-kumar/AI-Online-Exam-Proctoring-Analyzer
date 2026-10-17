/* =====================================================
   MOMENTS AI — All Types
   ===================================================== */

export type UserRole = 'candidate' | 'admin';
export type CandidateStage = 'setup' | 'exam' | 'done';
export type AdminTab = 'live' | 'report' | 'candidates';
export type RiskLevel = 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type CheatingVerdict = 'CLEAN' | 'SUSPECTED' | 'CONFIRMED';

export type GazeZone =
  | 'CENTER' | 'TOP_LEFT' | 'TOP_RIGHT' | 'BOTTOM_LEFT' | 'BOTTOM_RIGHT'
  | 'TOP' | 'BOTTOM' | 'LEFT' | 'RIGHT'
  | 'OFF_LEFT' | 'OFF_RIGHT' | 'OFF_UP' | 'OFF_DOWN';

export type ViolationType =
  | 'CORNER_GAZE' | 'OFF_SCREEN' | 'HEAD_TURN'
  | 'TAB_SWITCH' | 'FULLSCREEN_EXIT' | 'FACE_MISSING'
  | 'MULTIPLE_FACES' | 'SUSPICIOUS_KEY';

export interface HeadPose { yaw: number; pitch: number; roll: number; }

export interface GazeVector { x: number; y: number; zone: GazeZone; confidence: number; }

export interface FaceFrame {
  faceDetected: boolean;
  faceCount: number;
  headPose: HeadPose;
  gaze: GazeVector;
  earLeft: number;
  earRight: number;
  isBlinking: boolean;
  isLookingAway: boolean;
  suspiciousZone: GazeZone | null;
  landmarks: any[] | null;
}

export interface Violation {
  id: string;
  timestamp: number;       // epoch ms
  offsetSec: number;       // seconds from exam start
  timeLabel: string;       // "MM:SS"
  type: ViolationType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;      // 0–1
  title: string;
  description: string;
  webcamSnap: string;      // data URL or SVG data URL
  screenSnap?: string;
  gazeZone?: string;
  headPose?: HeadPose;
  examinerNote?: string;
}

export interface BehaviorMetrics {
  integrityScore: number;           // 0–100
  riskLevel: RiskLevel;
  tabSwitchCount: number;
  cornerGlanceCount: number;
  offScreenCount: number;
  faceMissingCount: number;
  multipleFaceCount: number;
  headTurnCount: number;
}

export interface CheatingReport {
  verdict: CheatingVerdict;
  likelihoodPct: number;            // 0–100
  verdictReason: string;
  factors: {
    label: string;
    candidateVal: number | string;
    cohortAvg: number | string;
    status: 'NORMAL' | 'ELEVATED' | 'CRITICAL';
    unit?: string;
  }[];
  primaryEvidences: string[];
}

export interface CandidateProfile {
  name: string;
  rollId: string;
  email: string;
  examTitle: string;
  examCode: string;
  durationMins: number;
}

export interface ExamSession {
  sessionId: string;
  profile: CandidateProfile;
  status: 'pending' | 'live' | 'completed';
  startTime: number;
  endTime?: number;
  metrics: BehaviorMetrics;
  violations: Violation[];
  cheatingReport?: CheatingReport;
  examinerVerdict?: 'CLEARED' | 'SUSPECTED' | 'DISQUALIFIED';
  examinerNote?: string;
}
