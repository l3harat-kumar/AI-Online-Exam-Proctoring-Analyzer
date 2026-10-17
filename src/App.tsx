import React, { useState, useMemo, useCallback } from 'react';
import { Header } from './components/Header';
import { UserExamPortal } from './components/UserExamPortal';
import { AdminPanel } from './components/AdminPanel';
import { IntegrityEngine } from './ai/integrityEngine';
import { ScreenTracker } from './ai/screenTracker';
import { CandidateInfo, ExamSessionData, RiskLevel, SuspiciousMoment, UserRole } from './types/proctor';
import { generateExaminerPDF } from './services/pdfReportGenerator';
import { generateMockHeatmap } from './data/mockScenarios';
import confetti from 'canvas-confetti';

export function App() {
  const [currentRole, setCurrentRole] = useState<UserRole>('candidate');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Candidate Info State
  const [candidateInfo, setCandidateInfo] = useState<CandidateInfo>({
    name: 'Alex Morgan',
    id: 'CAND-88392',
    email: 'alex.morgan@university.edu',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
    examTitle: 'CS 401: Advanced Algorithms & System Design Final Exam',
    examCode: 'CS401-FINAL-2026',
    scheduledTime: '2026-09-05 14:00 UTC',
    sessionDurationMins: 90
  });

  // Active Session State
  const [activeSession, setActiveSession] = useState<ExamSessionData>({
    id: `MOMENT-EXAM-9921`,
    candidate: candidateInfo,
    status: 'in_progress',
    startTime: Date.now(),
    finalIntegrityScore: 100,
    finalRiskLevel: 'SAFE',
    totalViolations: 0,
    tabSwitchCount: 0,
    offScreenGazeCount: 0,
    faceMissingCount: 0,
    multipleFaceCount: 0,
    violations: [],
    telemetryLog: [],
    gazeHeatmap: generateMockHeatmap('center'),
    examinerSummary: 'Session initiated under autonomous AI biometric proctoring supervision.',
    examinerVerdict: 'CLEARED'
  });

  // Integrity Engine Instance
  const integrityEngine = useMemo(() => new IntegrityEngine(activeSession.startTime), []);

  // Screen Tracker Instance
  const screenTracker = useMemo(() => {
    return new ScreenTracker({
      onTabSwitch: () => {
        handleViolationOccurred({
          id: `viol-tab-${Date.now()}`,
          timestamp: Date.now(),
          timeOffsetSec: Math.round((Date.now() - activeSession.startTime) / 1000),
          formattedTime: new Date(Date.now() - activeSession.startTime).toISOString().substr(14, 5),
          type: 'TAB_SWITCH_BLUR',
          severity: 'high',
          confidence: 0.99,
          title: 'Unauthorized Tab / Application Switch',
          description: 'Candidate switched focus away from exam questionnaire to secondary window or external app.',
          evidence: {
            webcamSnapshot: '',
            regionTag: 'CENTER'
          },
          durationSec: 5,
          flaggedByAI: true
        });
      },
      onFullscreenExit: () => {
        handleViolationOccurred({
          id: `viol-fs-${Date.now()}`,
          timestamp: Date.now(),
          timeOffsetSec: Math.round((Date.now() - activeSession.startTime) / 1000),
          formattedTime: new Date(Date.now() - activeSession.startTime).toISOString().substr(14, 5),
          type: 'FULLSCREEN_EXIT',
          severity: 'medium',
          confidence: 0.95,
          title: 'Fullscreen Mode Exited',
          description: 'Candidate exited required fullscreen proctoring environment.',
          evidence: {
            webcamSnapshot: '',
            regionTag: 'CENTER'
          },
          durationSec: 1,
          flaggedByAI: true
        });
      },
      onWindowBlur: () => {},
      onWindowFocus: () => {},
      onSuspiciousKey: (keyCombo: string) => {
        handleViolationOccurred({
          id: `viol-key-${Date.now()}`,
          timestamp: Date.now(),
          timeOffsetSec: Math.round((Date.now() - activeSession.startTime) / 1000),
          formattedTime: new Date(Date.now() - activeSession.startTime).toISOString().substr(14, 5),
          type: 'TAB_SWITCH_BLUR',
          severity: 'medium',
          confidence: 0.95,
          title: `Restricted Keyboard Shortcut (${keyCombo})`,
          description: `Candidate pressed restricted shortcut combination: ${keyCombo}.`,
          evidence: {
            webcamSnapshot: '',
            regionTag: 'CENTER'
          },
          durationSec: 1,
          flaggedByAI: true
        });
      }
    });
  }, [activeSession.startTime]);

  const handleViolationOccurred = useCallback((violation: SuspiciousMoment) => {
    setActiveSession(prev => {
      const updatedViolations = [violation, ...prev.violations];
      const isCorner = violation.type === 'SUSPICIOUS_CORNER_GAZE';
      const isTab = violation.type === 'TAB_SWITCH_BLUR';
      const isMiss = violation.type === 'FACE_MISSING';
      const isMulti = violation.type === 'MULTIPLE_FACES';

      return {
        ...prev,
        violations: updatedViolations,
        totalViolations: updatedViolations.length,
        offScreenGazeCount: prev.offScreenGazeCount + (isCorner ? 1 : 0),
        tabSwitchCount: prev.tabSwitchCount + (isTab ? 1 : 0),
        faceMissingCount: prev.faceMissingCount + (isMiss ? 1 : 0),
        multipleFaceCount: prev.multipleFaceCount + (isMulti ? 1 : 0),
      };
    });
  }, []);

  const handleUpdateScore = useCallback((score: number, risk: RiskLevel) => {
    setActiveSession(prev => ({
      ...prev,
      finalIntegrityScore: score,
      finalRiskLevel: risk
    }));
  }, []);

  // PDF Export Action
  const handleExportPDF = async () => {
    try {
      setIsExporting(true);
      await generateExaminerPDF(activeSession);
      confetti({
        particleCount: 90,
        spread: 75,
        origin: { y: 0.6 }
      });
    } catch (err) {
      console.error('Failed to export examiner PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleUpdateCandidateInfo = (info: CandidateInfo) => {
    setCandidateInfo(info);
    setActiveSession(prev => ({ ...prev, candidate: info }));
  };

  const handleUpdateVerdict = (verdict: 'CLEARED' | 'SUSPECTED' | 'DISQUALIFIED') => {
    setActiveSession(prev => ({ ...prev, examinerVerdict: verdict }));
  };

  const handleUpdateExaminerNotes = (violationId: string, notes: string) => {
    setActiveSession(prev => ({
      ...prev,
      violations: prev.violations.map(v => v.id === violationId ? { ...v, examinerNotes: notes } : v)
    }));
  };

  // Simulation Action Trigger
  const handleSimulateAction = (type: 'CORNER_GAZE' | 'TAB_SWITCH' | 'HEAD_TURN' | 'FACE_MISSING' | 'MULTI_FACE') => {
    const timeSec = Math.round((Date.now() - activeSession.startTime) / 1000);
    const mins = Math.floor(timeSec / 60);
    const secs = Math.floor(timeSec % 60);
    const formatted = `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;

    let title = 'Suspicious Event';
    let desc = 'Behavioral anomaly detected.';
    let vType: any = 'SUSPICIOUS_CORNER_GAZE';
    let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';

    if (type === 'CORNER_GAZE') {
      vType = 'SUSPICIOUS_CORNER_GAZE';
      title = 'Prolonged Glance at Top-Right Corner';
      desc = 'Candidate gaze diverted towards top-right corner region outside test questionnaire for 3.2 seconds.';
      severity = 'medium';
    } else if (type === 'TAB_SWITCH') {
      vType = 'TAB_SWITCH_BLUR';
      title = 'Unauthorized Browser Tab Switch';
      desc = 'Candidate switched focus away from exam questionnaire to secondary window.';
      severity = 'high';
    } else if (type === 'HEAD_TURN') {
      vType = 'HEAD_TURN_AWAY';
      title = 'Head Turned Away Left (>35° Yaw)';
      desc = 'Candidate rotated head toward left room boundary for 4.2 seconds.';
      severity = 'high';
    } else if (type === 'FACE_MISSING') {
      vType = 'FACE_MISSING';
      title = 'Candidate Missing from Camera Frame';
      desc = 'No facial landmarks detected in proctoring view for 3.5 seconds.';
      severity = 'high';
    } else if (type === 'MULTI_FACE') {
      vType = 'MULTIPLE_FACES';
      title = 'Multiple Faces Detected in Testing Area';
      desc = 'AI detected a second individual within the candidate webcam field of view.';
      severity = 'critical';
    }

    const newViol: SuspiciousMoment = {
      id: `sim-${Date.now()}`,
      timestamp: Date.now(),
      timeOffsetSec: timeSec,
      formattedTime: formatted,
      type: vType,
      severity,
      confidence: 0.94,
      title,
      description: desc,
      evidence: {
        webcamSnapshot: '',
        regionTag: type === 'CORNER_GAZE' ? 'TOP_RIGHT' : 'CENTER'
      },
      flaggedByAI: true
    };

    handleViolationOccurred(newViol);

    // Calculate score deduction
    const penalty = severity === 'critical' ? 25 : severity === 'high' ? 15 : 8;
    const newScore = Math.max(0, activeSession.finalIntegrityScore - penalty);
    const newRisk = integrityEngine.getRiskLevel(newScore);
    handleUpdateScore(newScore, newRisk);
  };

  return (
    <div className="min-h-screen p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto flex flex-col justify-between">
      <div>
        {/* Main Role & Navigation Header */}
        <Header
          currentRole={currentRole}
          onSelectRole={setCurrentRole}
          integrityScore={activeSession.finalIntegrityScore}
          riskLevel={activeSession.finalRiskLevel}
          totalViolations={activeSession.violations.length}
          onExportPDF={handleExportPDF}
          isExporting={isExporting}
          candidateName={activeSession.candidate.name}
        />

        {/* Dynamic View Rendering: Candidate Portal vs Admin Panel */}
        <main className="transition-all duration-300">
          {currentRole === 'candidate' ? (
            <UserExamPortal
              candidateInfo={candidateInfo}
              onUpdateCandidateInfo={handleUpdateCandidateInfo}
              integrityEngine={integrityEngine}
              screenTracker={screenTracker}
              onViolationOccurred={handleViolationOccurred}
              onUpdateScore={handleUpdateScore}
              onExamCompleted={() => {
                confetti({ particleCount: 120, spread: 80, origin: { y: 0.5 } });
              }}
              onSwitchToAdmin={() => setCurrentRole('admin')}
            />
          ) : (
            <AdminPanel
              activeSession={activeSession}
              onSelectCandidateSession={(s) => setActiveSession(s)}
              integrityEngine={integrityEngine}
              screenTracker={screenTracker}
              onViolationOccurred={handleViolationOccurred}
              onUpdateScore={handleUpdateScore}
              onUpdateVerdict={handleUpdateVerdict}
              onUpdateExaminerNotes={handleUpdateExaminerNotes}
              onExportPDF={handleExportPDF}
              isExporting={isExporting}
              onSimulateAction={handleSimulateAction}
            />
          )}
        </main>
      </div>

      {/* Footer */}
      <footer className="mt-12 pt-4 border-t border-slate-800 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
        <div className="flex items-center gap-2 font-mono">
          <span className="text-indigo-400 font-bold">MOMENTS AI</span>
          <span>•</span>
          <span>100% Client-Side Privacy-Preserving Behavioral Proctoring Engine</span>
        </div>
        <div className="flex items-center gap-3">
          <span>Full Privacy Protection</span>
          <span>•</span>
          <span>Zero Server Video Transmission</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
