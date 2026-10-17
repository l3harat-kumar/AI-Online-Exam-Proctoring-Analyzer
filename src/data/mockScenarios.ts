import { ExamSessionData, GazeHeatmapPoint, SuspiciousMoment } from '../types/proctor';

// Helper to create synthetic visual snapshot data URLs
function createSyntheticSnapshot(
  title: string,
  badgeText: string,
  badgeColor: string,
  gazePoint: { x: number; y: number },
  bgGradient: string
): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${bgGradient.split(',')[0] || '#0f172a'}" />
          <stop offset="100%" stop-color="${bgGradient.split(',')[1] || '#1e293b'}" />
        </linearGradient>
        <radialGradient id="glow" cx="${gazePoint.x * 100}%" cy="${gazePoint.y * 100}%" r="30%">
          <stop offset="0%" stop-color="#ef4444" stop-opacity="0.6"/>
          <stop offset="100%" stop-color="#ef4444" stop-opacity="0"/>
        </radialGradient>
      </defs>
      
      <rect width="640" height="360" fill="url(#bg)"/>
      <circle cx="${gazePoint.x * 640}" cy="${gazePoint.y * 360}" r="120" fill="url(#glow)"/>
      
      <!-- Grid Lines -->
      <path d="M0 120 H640 M0 240 H640 M213 0 V360 M426 0 V360" stroke="#334155" stroke-width="1" stroke-dasharray="4,4" opacity="0.4"/>
      
      <!-- Silhouette Avatar -->
      <circle cx="320" cy="170" r="55" fill="#334155" opacity="0.8"/>
      <path d="M 210 320 C 210 245, 430 245, 430 320 Z" fill="#334155" opacity="0.8"/>
      
      <!-- AI Mesh Overlay Simulation -->
      <polygon points="320,135 295,160 345,160" fill="none" stroke="#6366f1" stroke-width="1.5" opacity="0.7"/>
      <circle cx="305" cy="155" r="4" fill="#06b6d4"/>
      <circle cx="335" cy="155" r="4" fill="#06b6d4"/>
      <circle cx="320" cy="180" r="3" fill="#10b981"/>
      
      <!-- Gaze Vector Ray -->
      <line x1="320" y1="180" x2="${gazePoint.x * 640}" y2="${gazePoint.y * 360}" stroke="#ef4444" stroke-width="2.5" stroke-dasharray="3,3"/>
      <circle cx="${gazePoint.x * 640}" cy="${gazePoint.y * 360}" r="10" fill="none" stroke="#ef4444" stroke-width="2"/>
      <circle cx="${gazePoint.x * 640}" cy="${gazePoint.y * 360}" r="4" fill="#ef4444"/>

      <!-- Overlay HUD Info Banner -->
      <rect x="15" y="15" width="220" height="42" rx="8" fill="rgba(15, 23, 42, 0.85)" stroke="#475569" stroke-width="1"/>
      <text x="30" y="41" fill="#f8fafc" font-family="monospace" font-size="13" font-weight="bold">AI TELEMETRY HUD</text>
      
      <!-- Violation Badge -->
      <rect x="440" y="15" width="185" height="32" rx="6" fill="${badgeColor}" opacity="0.9"/>
      <text x="532" y="36" fill="#ffffff" font-family="sans-serif" font-size="12" font-weight="bold" text-anchor="middle">${badgeText}</text>
      
      <!-- Caption Bottom -->
      <rect x="0" y="320" width="640" height="40" fill="rgba(15, 23, 42, 0.9)"/>
      <text x="20" y="345" fill="#94a3b8" font-family="monospace" font-size="12">${title}</text>
    </svg>
  `;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Generate realistic gaze heatmap coordinates for testing
export function generateMockHeatmap(bias: 'center' | 'top_right' | 'left'): GazeHeatmapPoint[] {
  const points: GazeHeatmapPoint[] = [];
  const numPoints = 80;

  for (let i = 0; i < numPoints; i++) {
    let x = 50 + (Math.random() - 0.5) * 30;
    let y = 50 + (Math.random() - 0.5) * 30;

    if (bias === 'top_right' && Math.random() > 0.4) {
      x = 80 + (Math.random() - 0.5) * 15;
      y = 15 + (Math.random() - 0.5) * 12;
    } else if (bias === 'left' && Math.random() > 0.4) {
      x = 18 + (Math.random() - 0.5) * 15;
      y = 48 + (Math.random() - 0.5) * 20;
    }

    points.push({
      x: Math.max(5, Math.min(95, Math.round(x))),
      y: Math.max(5, Math.min(95, Math.round(y))),
      intensity: Math.round((0.3 + Math.random() * 0.7) * 10) / 10
    });
  }
  return points;
}

export const MOCK_SESSIONS: Record<string, ExamSessionData> = {
  'session-alex-morgan': {
    id: 'MOMENT-EXAM-9921',
    candidate: {
      name: 'Alex Morgan',
      id: 'CAND-88392',
      email: 'alex.morgan@university.edu',
      avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
      examTitle: 'CS 401: Advanced Algorithms & Data Structures',
      examCode: 'CS401-FINAL-2026',
      scheduledTime: '2026-09-05 14:00 UTC',
      sessionDurationMins: 90
    },
    status: 'flagged',
    startTime: Date.now() - 5400000,
    endTime: Date.now() - 60000,
    finalIntegrityScore: 48,
    finalRiskLevel: 'HIGH',
    totalViolations: 6,
    tabSwitchCount: 3,
    offScreenGazeCount: 5,
    faceMissingCount: 1,
    multipleFaceCount: 0,
    gazeHeatmap: generateMockHeatmap('top_right'),
    telemetryLog: [],
    violations: [
      {
        id: 'viol-1',
        timestamp: Date.now() - 4800000,
        timeOffsetSec: 612,
        formattedTime: '10:12',
        type: 'SUSPICIOUS_CORNER_GAZE',
        severity: 'medium',
        confidence: 0.91,
        title: 'Prolonged Glance at Top-Right Corner',
        description: 'Candidate sustained gaze at coordinate (0.88, 0.12) outside the test questionnaire region for 3.4 seconds.',
        evidence: {
          webcamSnapshot: createSyntheticSnapshot('Candidate Gaze: Top Right Corner (88%, 12%)', 'SUSPICIOUS GAZE', '#f59e0b', { x: 0.88, y: 0.12 }, '#1e1b4b,#0f172a'),
          screenSnapshot: createSyntheticSnapshot('Screen Snapshot: Questionnaire Top Right', 'CORNER FOCUS', '#f59e0b', { x: 0.9, y: 0.1 }, '#0f172a,#1e293b'),
          gazeCoord: { x: 0.88, y: 0.12 },
          headPoseSnapshot: { yaw: 24.2, pitch: -16.5, roll: 2.1 },
          regionTag: 'TOP_RIGHT'
        },
        durationSec: 3.4,
        flaggedByAI: true,
        examinerVerified: true,
        examinerNotes: 'Candidate appears to have physical reference notes stuck to the top right of the monitor frame.'
      },
      {
        id: 'viol-2',
        timestamp: Date.now() - 3600000,
        timeOffsetSec: 1845,
        formattedTime: '30:45',
        type: 'TAB_SWITCH_BLUR',
        severity: 'high',
        confidence: 0.99,
        title: 'Browser Tab Focus Lost (Alt+Tab Detected)',
        description: 'The candidate switched focus away from the exam browser window for 14.8 seconds.',
        evidence: {
          webcamSnapshot: createSyntheticSnapshot('Candidate Looked Down During Tab Switch', 'WINDOW BLUR', '#ef4444', { x: 0.52, y: 0.78 }, '#3b0764,#0f172a'),
          screenSnapshot: createSyntheticSnapshot('Screen Snapshot: Unauthorized External Tab', 'TAB SWITCH', '#ef4444', { x: 0.5, y: 0.5 }, '#020617,#0f172a'),
          gazeCoord: { x: 0.52, y: 0.78 },
          headPoseSnapshot: { yaw: 2.1, pitch: 18.4, roll: 0.5 },
          regionTag: 'BOTTOM_CENTER'
        },
        durationSec: 14.8,
        flaggedByAI: true,
        examinerVerified: true,
        examinerNotes: 'External application opened during problem #4.'
      },
      {
        id: 'viol-3',
        timestamp: Date.now() - 2400000,
        timeOffsetSec: 3012,
        formattedTime: '50:12',
        type: 'HEAD_TURNED_AWAY',
        severity: 'high',
        confidence: 0.94,
        title: 'Head Turned Left Away From Screen (>35°)',
        description: 'Candidate rotated head toward the left boundary (Yaw: -36.4°) for 5.2 seconds.',
        evidence: {
          webcamSnapshot: createSyntheticSnapshot('Head Pose Yaw: -36.4 deg Left', 'HEAD POSE DEVIATION', '#ef4444', { x: 0.08, y: 0.45 }, '#172554,#0f172a'),
          gazeCoord: { x: 0.08, y: 0.45 },
          headPoseSnapshot: { yaw: -36.4, pitch: 8.2, roll: -4.1 },
          regionTag: 'OFF_SCREEN_LEFT'
        },
        durationSec: 5.2,
        flaggedByAI: true
      },
      {
        id: 'viol-4',
        timestamp: Date.now() - 1200000,
        timeOffsetSec: 4230,
        formattedTime: '70:30',
        type: 'SUSPICIOUS_CORNER_GAZE',
        severity: 'medium',
        confidence: 0.88,
        title: 'Repeated Glance at Top-Right Corner',
        description: 'Second cluster of suspicious gaze diversion to the top-right corner region.',
        evidence: {
          webcamSnapshot: createSyntheticSnapshot('Candidate Repeated Gaze to Top-Right', 'REPEAT VIOLATION', '#f59e0b', { x: 0.91, y: 0.14 }, '#1e1b4b,#0f172a'),
          gazeCoord: { x: 0.91, y: 0.14 },
          headPoseSnapshot: { yaw: 26.1, pitch: -14.2, roll: 1.8 },
          regionTag: 'TOP_RIGHT'
        },
        durationSec: 2.9,
        flaggedByAI: true
      }
    ],
    examinerSummary: 'Candidate demonstrated repetitive off-screen glancing towards the upper-right corner and logged an unauthorized 14.8s tab switch during the technical coding section.',
    examinerVerdict: 'SUSPECTED'
  },

  'session-marcus-vance': {
    id: 'MOMENT-EXAM-7740',
    candidate: {
      name: 'Marcus Vance',
      id: 'CAND-55102',
      email: 'm.vance@stanford.edu',
      avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
      examTitle: 'CS 401: Advanced Algorithms & Data Structures',
      examCode: 'CS401-FINAL-2026',
      scheduledTime: '2026-09-05 14:00 UTC',
      sessionDurationMins: 90
    },
    status: 'completed',
    startTime: Date.now() - 5400000,
    endTime: Date.now() - 100000,
    finalIntegrityScore: 97,
    finalRiskLevel: 'SAFE',
    totalViolations: 0,
    tabSwitchCount: 0,
    offScreenGazeCount: 0,
    faceMissingCount: 0,
    multipleFaceCount: 0,
    gazeHeatmap: generateMockHeatmap('center'),
    telemetryLog: [],
    violations: [],
    examinerSummary: 'Exemplary session. Candidate maintained consistent eye contact with the exam viewport. No unauthorized shortcuts, tab switches, or abnormal head turns detected.',
    examinerVerdict: 'CLEARED'
  }
};
