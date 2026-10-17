import React, { useEffect, useRef, useState } from 'react';
import { Camera, Video, Mic, ShieldAlert, AlertTriangle, Eye, PlaySquare, BookOpen, User } from 'lucide-react';
import { IntegrityEngine, analyzeFrame, drawHUD, ScreenTracker } from '../ai/engine';
import type { ExamSession, CandidateProfile, Violation } from '../types/index';

interface Props {
  onSessionComplete: (session: ExamSession) => void;
  candidate: CandidateProfile;
}

export const UserExamPortal: React.FC<Props> = ({ onSessionComplete, candidate }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const screenCanvasRef = useRef<HTMLCanvasElement>(null);
  const [engine, setEngine] = useState<IntegrityEngine | null>(null);
  const [screenTracker, setScreenTracker] = useState<ScreenTracker | null>(null);
  const [stage, setStage] = useState<'setup' | 'exam' | 'submitted'>('setup');
  const [metrics, setMetrics] = useState({
    integrityScore: 100,
    riskLevel: 'SAFE' as const,
    tabSwitchCount: 0,
    cornerGlanceCount: 0,
    offScreenCount: 0,
    faceMissingCount: 0,
    multipleFaceCount: 0,
    headTurnCount: 0,
  });
  const [violations, setViolations] = useState<Violation[]>([]);

  // -------------------------------------------------------------------
  // Init webcam & AI engine on mount (setup stage)
  // -------------------------------------------------------------------
  useEffect(() => {
    if (stage !== 'setup') return;
    const start = async () => {
      // --- Webcam stream ---
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 360 }, audio: false });
      if (videoRef.current) videoRef.current.srcObject = stream;

      // --- Screen capture (optional) ---
      const tracker = new ScreenTracker();
      await tracker.startScreen();
      setScreenTracker(tracker);

      // --- AI engine ---
      const eng = new IntegrityEngine(Date.now());
      setEngine(eng);
    };
    start();
    // Cleanup on unmount
    return () => {
      if (videoRef.current?.srcObject instanceof MediaStream) {
        (videoRef.current.srcObject as MediaStream).getTracks().forEach(t => t.stop());
      }
      screenTracker?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // -------------------------------------------------------------------
  // Frame loop – runs while exam is active
  // -------------------------------------------------------------------
  useEffect(() => {
    if (stage !== 'exam' || !engine) return;
    let rafId: number;
    const ctx = canvasRef.current?.getContext('2d');
    const screenCtx = screenCanvasRef.current?.getContext('2d');
    const loop = async () => {
      if (!videoRef.current) return;
      // Grab current video frame landmarks via MediaPipe (assume global FaceMesh)
      // For brevity we mock the landmark extraction – replace with real implementation.
      const mockLandmarks = [] as any[]; // placeholder
      const frame = analyzeFrame([mockLandmarks]);
      // Draw HUD
      if (ctx && canvasRef.current) drawHUD(ctx, canvasRef.current.width, canvasRef.current.height, frame);

      // Process integrity scoring
      const viol = engine.processFrame(frame, canvasRef.current, screenCanvasRef.current);
      if (viol) {
        setViolations(prev => [...prev, viol]);
        // Update UI counters based on violation type
        setMetrics(m => {
          const inc = (key: keyof typeof m) => ({ ...m, [key]: (m[key] as number) + 1 });
          switch (viol.type) {
            case 'TAB_SWITCH': return inc('tabSwitchCount');
            case 'CORNER_GAZE': return inc('cornerGlanceCount');
            case 'OFF_SCREEN': return inc('offScreenCount');
            case 'FACE_MISSING': return inc('faceMissingCount');
            case 'MULTIPLE_FACES': return inc('multipleFaceCount');
            case 'HEAD_TURN': return inc('headTurnCount');
            default: return m;
          }
        });
        // Update global integrity score/risk
        setMetrics(m => ({
          ...m,
          integrityScore: engine.getScore(),
          riskLevel: engine.getRisk(),
        }));
      }
      rafId = requestAnimationFrame(loop);
    };
    loop();
    return () => cancelAnimationFrame(rafId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, engine]);

  // -------------------------------------------------------------------
  // Handlers
  // -------------------------------------------------------------------
  const startExam = () => setStage('exam');
  const finishExam = () => {
    setStage('submitted');
    const session: ExamSession = {
      sessionId: `sess-${Date.now()}`,
      profile: candidate,
      status: 'completed',
      startTime: engine ? engine['startTime'] : Date.now(),
      endTime: Date.now(),
      metrics,
      violations,
      integrityScore: metrics.integrityScore,
      finalRiskLevel: metrics.riskLevel,
      totalViolations: violations.length,
    };
    onSessionComplete(session);
  };

  // -------------------------------------------------------------------
  // Render UI per stage
  // -------------------------------------------------------------------
  return (
    <div className="flex flex-col items-center gap-6 py-8">
      {stage === 'setup' && (
        <div className="card p-6 w-full max-w-md text-center">
          <h2 className="text-xl font-bold mb-4 text-indigo-300">Candidate Exam Portal</h2>
          <p className="text-sm text-slate-400 mb-6">Make sure your webcam and screen sharing are working before you begin.</p>
          <button className="btn-primary" onClick={startExam}>Start Exam</button>
        </div>
      )}

      {stage === 'exam' && (
        <div className="flex flex-col gap-4 w-full max-w-4xl">
          {/* Video feed with HUD */}
          <div className="relative video-container mx-auto">
            <video ref={videoRef} autoPlay muted playsInline className="object-cover w-full h-full" />
            <canvas ref={canvasRef} className="pointer-events-none" width={640} height={360} />
          </div>

          {/* Screen capture preview (optional) */}
          {screenTracker?.getStream() && (
            <div className="relative video-container mx-auto">
              <video ref={el => {
                if (el && screenTracker?.getStream()) el.srcObject = screenTracker.getStream() as MediaStream;
              }} autoPlay muted playsInline className="object-cover w-full h-full" />
              <canvas ref={screenCanvasRef} className="pointer-events-none" width={640} height={360} />
            </div>
          )}

          {/* Simple mock question area */}
          <div className="card p-4">
            <h3 className="font-medium text-indigo-300 mb-2">Write your answer below (simulated)</h3>
            <textarea className="input" placeholder="Type your answer here..." rows={4} />
          </div>

          <button className="btn-primary self-center" onClick={finishExam}>Submit Exam</button>
        </div>
      )}

      {stage === 'submitted' && (
        <div className="card p-6 text-center">
          <h2 className="text-2xl font-bold text-emerald-400 mb-2">Exam Submitted</h2>
          <p className="text-slate-400 mb-4">Your session data is being processed. The examiner will review the report shortly.</p>
          <p className="text-sm text-slate-500">Integrity Score: {metrics.integrityScore}% | Risk: {metrics.riskLevel}</p>
        </div>
      )}
    </div>
  );
};
