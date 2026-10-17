export type UserRole = 'candidate' | 'admin';

export type CandidateStage = 'setup' | 'writing' | 'submitted';

export type AdminViewTab = 'live_monitor' | 'comparative_report' | 'all_candidates' | 'testbench';

export type RiskLevel = 'SAFE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type CheatingVerdict = 
  | 'NO_CHEATING_DETECTED' 
  | 'SUSPECTED_CHEATING' 
  | 'CONFIRMED_CHEATING';

export type GazeRegion = 
  | 'CENTER' 
  | 'TOP_LEFT' 
  | 'TOP_RIGHT' 
  | 'BOTTOM_LEFT' 
  | 'BOTTOM_RIGHT' 
  | 'TOP_CENTER'
  | 'BOTTOM_CENTER'
  | 'OFF_SCREEN_LEFT' 
  | 'OFF_SCREEN_RIGHT' 
  | 'OFF_SCREEN_UP' 
  | 'OFF_SCREEN_DOWN';

export type ViolationType = 
  | 'SUSPICIOUS_CORNER_GAZE'
  | 'OFF_SCREEN_LOOK'
  | 'HEAD_TURNED_AWAY'
  | 'TAB_SWITCH_BLUR'
  | 'FULLSCREEN_EXIT'
  | 'FACE_MISSING'
  | 'MULTIPLE_FACES'
  | 'SUSPICIOUS_AUDIO'
  | 'PROLONGED_ABSENCE';

export interface HeadPose {
  yaw: number;   // -90 to +90 deg (left/right)
  pitch: number; // -90 to +90 deg (up/down)
  roll: number;  // -90 to +90 deg (tilt)
}

export interface GazeVector {
  x: number; // 0 to 1
  y: number; // 0 to 1
  region: GazeRegion;
  confidence: number;
}

export interface TelemetryFrame {
  timestamp: number;
  timeOffsetSec: number;
  gaze: GazeVector;
  headPose: HeadPose;
  faceDetected: boolean;
  faceCount: number;
  blinkDetected: boolean;
  tabActive: boolean;
  isFullscreen: boolean;
  integrityScore: number;
  riskLevel: RiskLevel;
}

export interface SuspiciousMoment {
  id: string;
  timestamp: number;
  timeOffsetSec: number;
  formattedTime: string;
  type: ViolationType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  title: string;
  description: string;
  evidence: {
    webcamSnapshot: string;
    screenSnapshot?: string;
    gazeCoord?: { x: number; y: number };
    headPoseSnapshot?: HeadPose;
    regionTag?: string;
  };
  durationSec?: number;
  flaggedByAI: boolean;
  examinerVerified?: boolean;
  examinerNotes?: string;
}

export interface CandidateInfo {
  name: string;
  id: string;
  email: string;
  avatarUrl?: string;
  examTitle: string;
  examCode: string;
  scheduledTime: string;
  sessionDurationMins: number;
}

export interface GazeHeatmapPoint {
  x: number; // 0 to 100%
  y: number; // 0 to 100%
  intensity: number;
}

export interface ComparativeCheatingAnalysis {
  cheatingLikelihoodPercent: number; // 0 to 100%
  verdict: CheatingVerdict;
  verdictReason: string;
  factorScores: {
    gazeDeviation: { candidate: number; benchmarkAvg: number; status: 'NORMAL' | 'ELEVATED' | 'CRITICAL' };
    cornerGlances: { candidate: number; benchmarkAvg: number; status: 'NORMAL' | 'ELEVATED' | 'CRITICAL' };
    tabSwitches: { candidate: number; benchmarkAvg: number; status: 'NORMAL' | 'ELEVATED' | 'CRITICAL' };
    headPoseDeviations: { candidate: number; benchmarkAvg: number; status: 'NORMAL' | 'ELEVATED' | 'CRITICAL' };
    absenceDurationSec: { candidate: number; benchmarkAvg: number; status: 'NORMAL' | 'ELEVATED' | 'CRITICAL' };
  };
  primaryAnomalies: string[];
}

export interface ExamSessionData {
  id: string;
  candidate: CandidateInfo;
  status: 'pending' | 'in_progress' | 'completed' | 'flagged';
  startTime: number;
  endTime?: number;
  finalIntegrityScore: number;
  finalRiskLevel: RiskLevel;
  totalViolations: number;
  tabSwitchCount: number;
  offScreenGazeCount: number;
  faceMissingCount: number;
  multipleFaceCount: number;
  violations: SuspiciousMoment[];
  telemetryLog: TelemetryFrame[];
  gazeHeatmap: GazeHeatmapPoint[];
  comparativeAnalysis?: ComparativeCheatingAnalysis;
  examinerSummary?: string;
  examinerVerdict?: 'CLEARED' | 'SUSPECTED' | 'DISQUALIFIED';
}
