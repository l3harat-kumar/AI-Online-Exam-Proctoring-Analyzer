import React, { useRef, useEffect, useState, useCallback } from 'react';
import { 
  Camera, 
  Monitor, 
  Eye, 
  Compass, 
  AlertOctagon, 
  CheckCircle, 
  Layers, 
  Maximize2, 
  RefreshCw, 
  Volume2, 
  Sparkles, 
  ShieldCheck, 
  ChevronRight,
  ExternalLink,
  Focus
} from 'lucide-react';
import { FaceAnalysisResult, analyzeFaceFrame, drawFaceTelemetryOverlay } from '../ai/faceMeshDetector';
import { IntegrityEngine } from '../ai/integrityEngine';
import { ScreenTracker } from '../ai/screenTracker';
import { GazeRegion, RiskLevel, SuspiciousMoment } from '../types/proctor';

interface LiveProctorViewProps {
  integrityEngine: IntegrityEngine;
  screenTracker: ScreenTracker;
  integrityScore: number;
  riskLevel: RiskLevel;
  violations: SuspiciousMoment[];
  onViolationOccurred: (violation: SuspiciousMoment) => void;
  onUpdateScore: (score: number, risk: RiskLevel) => void;
}

export const LiveProctorView: React.FC<LiveProctorViewProps> = ({
  integrityEngine,
  screenTracker,
  integrityScore,
  riskLevel,
  violations,
  onViolationOccurred,
  onUpdateScore
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const screenVideoRef = useRef<HTMLVideoElement | null>(null);
  const screenCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isScreenSharing, setIsScreenSharing] = useState<boolean>(false);
  const [showMeshOverlay, setShowMeshOverlay] = useState<boolean>(true);
  const [activeAnalysis, setActiveAnalysis] = useState<FaceAnalysisResult | null>(null);
  const [selectedSnapshot, setSelectedSnapshot] = useState<SuspiciousMoment | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [activeTabWarning, setActiveTabWarning] = useState<boolean>(false);
  const [activeCornerWarning, setActiveCornerWarning] = useState<string | null>(null);

  // Fallback synthetic telemetry simulation if hardware camera isn't granted or for testing
  const [isSimulationFallback, setIsSimulationFallback] = useState<boolean>(false);

  // Start Real Hardware Webcam with MediaPipe FaceMesh
  const startCamera = async () => {
    try {
      setCameraError(null);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.onloadedmetadata = () => {
          videoRef.current?.play();
          setIsCameraActive(true);
          setIsSimulationFallback(false);
          initFaceMeshPipeline();
        };
      }
    } catch (err: any) {
      console.warn('Webcam permission error or camera not found:', err);
      setCameraError('Camera access not granted. Enabling AI Synthetic Simulation Mode for testing.');
      setIsSimulationFallback(true);
      setIsCameraActive(true);
    }
  };

  // Initialize MediaPipe FaceMesh
  const initFaceMeshPipeline = useCallback(() => {
    if (typeof window !== 'undefined' && window.FaceMesh) {
      const faceMesh = new window.FaceMesh({
        locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`
      });

      faceMesh.setOptions({
        maxNumFaces: 2,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5
      });

      faceMesh.onResults((results: any) => {
        const analysis = analyzeFaceFrame(results.multiFaceLandmarks);
        setActiveAnalysis(analysis);

        // Render Canvas Telemetry Overlay
        if (canvasRef.current && videoRef.current) {
          const ctx = canvasRef.current.getContext('2d');
          if (ctx) {
            canvasRef.current.width = videoRef.current.videoWidth || 640;
            canvasRef.current.height = videoRef.current.videoHeight || 480;

            // Draw clean video background or frame
            if (showMeshOverlay) {
              drawFaceTelemetryOverlay(ctx, canvasRef.current.width, canvasRef.current.height, analysis);
            } else {
              ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
            }
          }
        }

        // Process Integrity Engine Logic
        const result = integrityEngine.processFrame(
          analysis,
          !document.hidden,
          Boolean(document.fullscreenElement),
          canvasRef.current,
          screenCanvasRef.current
        );

        onUpdateScore(result.score, result.risk);
        if (result.newViolation) {
          onViolationOccurred(result.newViolation);
        }

        // Update Corner Warning
        if (analysis.suspiciousRegion) {
          setActiveCornerWarning(analysis.suspiciousRegion);
        } else {
          setActiveCornerWarning(null);
        }
      });

      // Frame pump loop
      let animationFrameId: number;
      const processLoop = async () => {
        if (videoRef.current && videoRef.current.readyState === 4) {
          await faceMesh.send({ image: videoRef.current });
        }
        animationFrameId = requestAnimationFrame(processLoop);
      };
      animationFrameId = requestAnimationFrame(processLoop);

      return () => cancelAnimationFrame(animationFrameId);
    }
  }, [showMeshOverlay, integrityEngine, onUpdateScore, onViolationOccurred]);

  // Fallback Simulation Loop if physical camera is not available
  useEffect(() => {
    if (!isSimulationFallback) return;

    let tick = 0;
    const interval = setInterval(() => {
      tick++;
      // Simulate slight natural movements + periodic corner glances for demonstration
      const isGlanceCorner = tick % 15 >= 10 && tick % 15 <= 13;
      const isHeadTurn = tick % 25 >= 20;

      const yaw = isHeadTurn ? -28.5 : isGlanceCorner ? 22.4 : Math.sin(tick * 0.1) * 6;
      const pitch = isGlanceCorner ? -15.2 : Math.cos(tick * 0.12) * 5;
      const gazeRegion: GazeRegion = isHeadTurn ? 'OFF_SCREEN_LEFT' : isGlanceCorner ? 'TOP_RIGHT' : 'CENTER';

      const simulatedAnalysis: FaceAnalysisResult = {
        faceDetected: true,
        faceCount: 1,
        landmarks: [],
        headPose: { yaw: Math.round(yaw * 10) / 10, pitch: Math.round(pitch * 10) / 10, roll: 1.2 },
        gaze: {
          x: isHeadTurn ? 0.08 : isGlanceCorner ? 0.88 : 0.5 + Math.sin(tick * 0.1) * 0.05,
          y: isGlanceCorner ? 0.14 : 0.5,
          region: gazeRegion,
          confidence: 0.94
        },
        earLeft: 0.28,
        earRight: 0.29,
        isBlinking: tick % 8 === 0,
        isLookingAway: isGlanceCorner || isHeadTurn,
        suspiciousRegion: isGlanceCorner ? 'TOP_RIGHT' : isHeadTurn ? 'OFF_SCREEN_LEFT' : null
      };

      setActiveAnalysis(simulatedAnalysis);
      setActiveCornerWarning(simulatedAnalysis.suspiciousRegion);

      // Draw simulated frame on canvas
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          const w = canvasRef.current.width = 640;
          const h = canvasRef.current.height = 480;

          // Background gradient
          const grad = ctx.createLinearGradient(0, 0, w, h);
          grad.addColorStop(0, '#090d16');
          grad.addColorStop(1, '#1e1b4b');
          ctx.fillStyle = grad;
          ctx.fillRect(0, 0, w, h);

          // Simulated Face wireframe
          ctx.strokeStyle = simulatedAnalysis.isLookingAway ? '#ef4444' : '#6366f1';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(w / 2 + (yaw * 3), h / 2 + (pitch * 3), 90, 0, 2 * Math.PI);
          ctx.stroke();

          // Gaze target reticle
          const gx = simulatedAnalysis.gaze.x * w;
          const gy = simulatedAnalysis.gaze.y * h;
          ctx.fillStyle = simulatedAnalysis.isLookingAway ? '#ef4444' : '#10b981';
          ctx.beginPath();
          ctx.arc(gx, gy, 8, 0, 2 * Math.PI);
          ctx.fill();

          // Gaze ray
          ctx.strokeStyle = simulatedAnalysis.isLookingAway ? 'rgba(239, 68, 68, 0.7)' : 'rgba(16, 185, 129, 0.7)';
          ctx.lineWidth = 2.5;
          ctx.setLineDash([4, 4]);
          ctx.beginPath();
          ctx.moveTo(w / 2 + (yaw * 3), h / 2 + (pitch * 3));
          ctx.lineTo(gx, gy);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }

      const result = integrityEngine.processFrame(
        simulatedAnalysis,
        !document.hidden,
        Boolean(document.fullscreenElement),
        canvasRef.current,
        screenCanvasRef.current
      );

      onUpdateScore(result.score, result.risk);
      if (result.newViolation) {
        onViolationOccurred(result.newViolation);
      }
    }, 400);

    return () => clearInterval(interval);
  }, [isSimulationFallback, integrityEngine, onUpdateScore, onViolationOccurred]);

  // Start Screen Capture
  const handleStartScreenShare = async () => {
    const stream = await screenTracker.startScreenCapture();
    if (stream && screenVideoRef.current) {
      screenVideoRef.current.srcObject = stream;
      screenVideoRef.current.play();
      setIsScreenSharing(true);
    }
  };

  // Fullscreen Request
  const handleToggleFullscreen = () => {
    screenTracker.requestFullscreen();
  };

  // Trigger manual proctor flag
  const handleManualFlag = () => {
    if (!activeAnalysis) return;
    const viol = integrityEngine.recordViolation(
      'SUSPICIOUS_CORNER_GAZE',
      'medium',
      1.0,
      'Examiner Manual Checkpoint Flag',
      'Examiner manually tagged this moment for forensic verification.',
      activeAnalysis.gaze,
      activeAnalysis.headPose,
      canvasRef.current,
      screenCanvasRef.current,
      0
    );
    onViolationOccurred(viol);
  };

  // Initialize camera automatically on mount
  useEffect(() => {
    startCamera();
    screenTracker.startActivityMonitoring();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      
      {/* LEFT COLUMN: Main Monitoring Feeds & Real-time AI HUD (8 cols) */}
      <div className="xl:col-span-8 flex flex-col gap-6">
        
        {/* Dual Stream Video Monitor */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <span className="pulse-dot bg-rose-500 text-rose-500"></span>
              <h2 className="text-base font-bold tracking-tight text-white flex items-center gap-2">
                LIVE CANDIDATE HUD & SCREEN TELEMETRY
              </h2>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowMeshOverlay(!showMeshOverlay)}
                className={`text-xs px-3 py-1.5 rounded-lg border font-medium flex items-center gap-1.5 transition-all ${
                  showMeshOverlay 
                    ? 'bg-indigo-600/30 border-indigo-500/50 text-indigo-300' 
                    : 'bg-slate-800 border-slate-700 text-slate-400'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                AI Mesh Overlay
              </button>

              <button
                onClick={handleToggleFullscreen}
                className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 border border-slate-700 text-slate-300 hover:bg-slate-700 font-medium flex items-center gap-1.5"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                Fullscreen
              </button>

              <button
                onClick={handleManualFlag}
                className="text-xs px-3 py-1.5 rounded-lg bg-rose-600/20 border border-rose-500/40 text-rose-300 hover:bg-rose-600/30 font-medium flex items-center gap-1.5"
              >
                <AlertOctagon className="w-3.5 h-3.5" />
                Flag Moment
              </button>
            </div>
          </div>

          {cameraError && (
            <div className="mb-3 p-3 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-2">
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>{cameraError}</span>
            </div>
          )}

          {/* Video Streams Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Stream 1: Candidate Webcam with AI Overlay */}
            <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video flex items-center justify-center group shadow-inner">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover"
                style={{ transform: 'scaleX(-1)' }}
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full object-cover pointer-events-none"
                style={{ transform: 'scaleX(-1)' }}
              />

              {/* Feed Header Badge */}
              <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                <span className="badge badge-indigo text-[10px] backdrop-blur-md">
                  <Camera className="w-3 h-3" />
                  CANDIDATE WEBCAM
                </span>
                {activeAnalysis?.isLookingAway && (
                  <span className="badge badge-high text-[10px] animate-pulse">
                    OFF-CENTER GAZE
                  </span>
                )}
              </div>

              {/* 9-Zone Gaze Grid Visual Guide */}
              <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none opacity-20 border border-slate-700">
                <div className="border-r border-b border-slate-700"></div>
                <div className="border-r border-b border-slate-700"></div>
                <div className="border-b border-slate-700"></div>
                <div className="border-r border-b border-slate-700"></div>
                <div className="border-r border-b border-slate-700"></div>
                <div className="border-b border-slate-700"></div>
                <div className="border-r border-slate-700"></div>
                <div className="border-r border-slate-700"></div>
                <div></div>
              </div>

              {/* Gaze Target Corner Warning Pill */}
              {activeCornerWarning && (
                <div className="absolute bottom-3 left-3 right-3 py-1 px-2.5 rounded bg-rose-950/80 border border-rose-500/50 backdrop-blur-md text-rose-300 text-[11px] font-mono flex items-center justify-between z-10 animate-bounce">
                  <span>DETECTED FOCUS: {activeCornerWarning}</span>
                  <span>CONF: 94%</span>
                </div>
              )}
            </div>

            {/* Stream 2: Live Screen Sharing Feed */}
            <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video flex flex-col items-center justify-center shadow-inner">
              <video
                ref={screenVideoRef}
                playsInline
                muted
                className={`w-full h-full object-contain ${isScreenSharing ? 'block' : 'hidden'}`}
              />
              <canvas ref={screenCanvasRef} className="hidden" />

              {!isScreenSharing ? (
                <div className="text-center p-6 flex flex-col items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-700 flex items-center justify-center text-slate-400">
                    <Monitor className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">Screen Capture Inactive</h3>
                    <p className="text-xs text-slate-400 mt-1 max-w-[240px]">
                      Share full desktop or exam window to monitor tab switching & unauthorized apps.
                    </p>
                  </div>
                  <button
                    onClick={handleStartScreenShare}
                    className="btn-secondary text-xs mt-1"
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    Authorize Screen Share
                  </button>
                </div>
              ) : (
                <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                  <span className="badge badge-low text-[10px] backdrop-blur-md">
                    <Monitor className="w-3 h-3" />
                    LIVE SCREEN FEED
                  </span>
                  <span className="badge badge-safe text-[10px]">
                    SECURE DESKTOP
                  </span>
                </div>
              )}
            </div>

          </div>

          {/* Real-time Telemetry Status Bar */}
          <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="glass-panel p-2.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-indigo-400" />
                Head Pose (Y / P / R)
              </div>
              <div className="telemetry-val text-sm text-slate-200 mt-1 font-mono">
                {activeAnalysis ? `${activeAnalysis.headPose.yaw}° / ${activeAnalysis.headPose.pitch}° / ${activeAnalysis.headPose.roll}°` : '0° / 0° / 0°'}
              </div>
            </div>

            <div className="glass-panel p-2.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Focus className="w-3.5 h-3.5 text-cyan-400" />
                Gaze Vector Screen
              </div>
              <div className="telemetry-val text-sm text-cyan-300 mt-1 font-mono">
                {activeAnalysis?.gaze.region || 'CENTER'} ({activeAnalysis ? `${Math.round(activeAnalysis.gaze.x * 100)}%, ${Math.round(activeAnalysis.gaze.y * 100)}%` : '50%, 50%'})
              </div>
            </div>

            <div className="glass-panel p-2.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-emerald-400" />
                Eye Aspect (EAR)
              </div>
              <div className="telemetry-val text-sm text-emerald-300 mt-1 font-mono">
                L: {activeAnalysis?.earLeft || 0.28} | R: {activeAnalysis?.earRight || 0.28}
              </div>
            </div>

            <div className="glass-panel p-2.5">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                Face Count & Status
              </div>
              <div className="telemetry-val text-sm text-purple-300 mt-1 font-mono">
                {activeAnalysis?.faceDetected ? `${activeAnalysis.faceCount} Face Detected` : 'NO FACE'}
              </div>
            </div>
          </div>
        </div>

        {/* 2D Gaze Spatial Reticle & Head Orientation Polar Visualizer */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
            <Compass className="w-4 h-4 text-indigo-400" />
            2D SPATIAL GAZE TRACKER & ATTENTION DISTRIBUTION
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* 9-Sector Interactive Gaze Heat Matrix */}
            <div className="md:col-span-2 rounded-xl bg-slate-950/80 border border-slate-800 p-3 flex flex-col justify-between">
              <div className="text-[11px] text-slate-400 font-mono mb-2 flex justify-between">
                <span>SCREEN ATTENTION MATRIX (9 ZONES)</span>
                <span className="text-indigo-400">ACTIVE: {activeAnalysis?.gaze.region || 'CENTER'}</span>
              </div>

              <div className="grid grid-cols-3 gap-2 h-44">
                {[
                  { id: 'TOP_LEFT', label: 'Top Left' },
                  { id: 'TOP_CENTER', label: 'Top Center' },
                  { id: 'TOP_RIGHT', label: 'Top Right (Notes)' },
                  { id: 'OFF_SCREEN_LEFT', label: 'Far Left' },
                  { id: 'CENTER', label: 'Center Exam' },
                  { id: 'OFF_SCREEN_RIGHT', label: 'Far Right' },
                  { id: 'BOTTOM_LEFT', label: 'Bottom Left' },
                  { id: 'BOTTOM_CENTER', label: 'Bottom (Phone)' },
                  { id: 'BOTTOM_RIGHT', label: 'Bottom Right' }
                ].map((sector) => {
                  const isActive = activeAnalysis?.gaze.region === sector.id;
                  const isSuspicious = sector.id !== 'CENTER' && sector.id !== 'TOP_CENTER';
                  
                  return (
                    <div
                      key={sector.id}
                      className={`rounded-lg border flex flex-col items-center justify-center text-center p-1 transition-all ${
                        isActive 
                          ? (isSuspicious ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-md shadow-rose-500/20' : 'bg-emerald-500/20 border-emerald-500 text-emerald-300 shadow-md shadow-emerald-500/20')
                          : 'bg-slate-900/40 border-slate-800/80 text-slate-500'
                      }`}
                    >
                      <span className="text-[10px] font-bold uppercase">{sector.label}</span>
                      {isActive && <span className="text-[9px] font-mono mt-0.5">FOCUS</span>}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Gaze Coordinate Radar Crosshair */}
            <div className="rounded-xl bg-slate-950/80 border border-slate-800 p-3 flex flex-col items-center justify-center relative">
              <div className="text-[11px] text-slate-400 font-mono mb-2">TARGET RETICLE</div>
              <div className="w-36 h-36 rounded-full border border-slate-700 relative flex items-center justify-center radar-grid">
                <div className="absolute inset-0 border border-dashed border-slate-800 rounded-full scale-75"></div>
                <div className="absolute inset-0 border border-dashed border-slate-800 rounded-full scale-50"></div>
                <div className="w-full h-px bg-slate-800 absolute"></div>
                <div className="h-full w-px bg-slate-800 absolute"></div>

                {/* Target Point */}
                <div
                  className="absolute w-4 h-4 rounded-full bg-indigo-500 border-2 border-white transition-all duration-150 shadow-lg shadow-indigo-500/50"
                  style={{
                    left: `${(activeAnalysis?.gaze.x ?? 0.5) * 100}%`,
                    top: `${(activeAnalysis?.gaze.y ?? 0.5) * 100}%`,
                    transform: 'translate(-50%, -50%)'
                  }}
                />
              </div>
              <div className="text-[10px] font-mono text-slate-400 mt-2">
                X: {(activeAnalysis?.gaze.x ?? 0.5).toFixed(2)} | Y: {(activeAnalysis?.gaze.y ?? 0.5).toFixed(2)}
              </div>
            </div>

          </div>
        </div>

      </div>

      {/* RIGHT COLUMN: Real-Time Integrity Risk Meter & Live Event Stream (4 cols) */}
      <div className="xl:col-span-4 flex flex-col gap-6">
        
        {/* Integrity Risk Card */}
        <div className="glass-card p-5">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-indigo-400" />
              INTEGRITY RISK ASSESSMENT
            </span>
            <span className="text-[10px] font-mono text-slate-400">REAL-TIME</span>
          </h3>

          <div className="flex items-center justify-center py-4">
            <div className="relative flex items-center justify-center">
              {/* Radial Score Gauge */}
              <svg className="w-36 h-36 transform -rotate-90">
                <circle
                  cx="72"
                  cy="72"
                  r="58"
                  className="text-slate-800"
                  strokeWidth="10"
                  stroke="currentColor"
                  fill="transparent"
                />
                <circle
                  cx="72"
                  cy="72"
                  r="58"
                  className={`transition-all duration-500 ${
                    integrityScore >= 85 ? 'text-emerald-500' : integrityScore >= 60 ? 'text-amber-500' : 'text-rose-500'
                  }`}
                  strokeWidth="10"
                  strokeDasharray={364.4}
                  strokeDashoffset={364.4 - (364.4 * integrityScore) / 100}
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="transparent"
                />
              </svg>

              <div className="absolute text-center">
                <span className="text-3xl font-extrabold font-mono text-white block">
                  {integrityScore}%
                </span>
                <span className={`text-[10px] font-bold uppercase tracking-wider block ${
                  riskLevel === 'SAFE' ? 'text-emerald-400' : riskLevel === 'LOW' ? 'text-cyan-400' : riskLevel === 'MEDIUM' ? 'text-amber-400' : 'text-rose-400'
                }`}>
                  {riskLevel} RISK
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-2 mt-2">
            <div className="flex justify-between text-xs py-1 border-b border-slate-800">
              <span className="text-slate-400">Total Flagged Moments:</span>
              <span className="font-mono font-bold text-white">{violations.length}</span>
            </div>
            <div className="flex justify-between text-xs py-1 border-b border-slate-800">
              <span className="text-slate-400">Tab Switches / Blurs:</span>
              <span className="font-mono font-bold text-white">{screenTracker.getTabSwitchCount()}</span>
            </div>
            <div className="flex justify-between text-xs py-1 border-b border-slate-800">
              <span className="text-slate-400">Confidence Calibration:</span>
              <span className="font-mono font-bold text-emerald-400">98.4% (Optimal)</span>
            </div>
          </div>
        </div>

        {/* Live Suspicious Moments Feed */}
        <div className="glass-card p-5 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-rose-400" />
              FLAGGED MOMENTS STREAM
            </h3>
            <span className="badge badge-high text-[10px]">{violations.length} LOGGED</span>
          </div>

          <div className="flex-1 overflow-y-auto space-y-3 max-h-[440px] pr-1">
            {violations.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                <CheckCircle className="w-8 h-8 text-emerald-500/50 mx-auto mb-2" />
                No suspicious activities detected yet. Candidate session is currently clean.
              </div>
            ) : (
              violations.map((moment) => (
                <div
                  key={moment.id}
                  onClick={() => setSelectedSnapshot(moment)}
                  className="p-3 rounded-xl bg-slate-900/70 border border-slate-800 hover:border-indigo-500/50 cursor-pointer transition-all hover:bg-slate-800/60 group"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <span className={`w-2 h-2 rounded-full ${
                        moment.severity === 'critical' || moment.severity === 'high' ? 'bg-rose-500' : 'bg-amber-500'
                      }`} />
                      <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-300">
                        {moment.title}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-slate-400">
                      +{moment.formattedTime}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                    {moment.description}
                  </p>

                  <div className="flex items-center justify-between mt-2.5 pt-2 border-t border-slate-800/60 text-[10px]">
                    <span className="badge badge-indigo text-[9px] py-0.5">
                      CONF: {Math.round(moment.confidence * 100)}%
                    </span>
                    <span className="text-indigo-400 flex items-center gap-1 font-medium group-hover:underline">
                      View Evidence <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* Snapshot Evidence Modal */}
      {selectedSnapshot && (
        <div className="modal-backdrop" onClick={() => setSelectedSnapshot(null)}>
          <div className="glass-card max-w-2xl w-full p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="badge badge-high">{selectedSnapshot.severity.toUpperCase()}</span>
                <h3 className="text-base font-bold text-white">{selectedSnapshot.title}</h3>
              </div>
              <button 
                onClick={() => setSelectedSnapshot(null)}
                className="text-slate-400 hover:text-white text-sm"
              >
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs font-bold text-slate-400 mb-1.5 uppercase font-mono">Webcam Evidence Frame</div>
                <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950 aspect-video flex items-center justify-center">
                  {selectedSnapshot.evidence.webcamSnapshot ? (
                    <img
                      src={selectedSnapshot.evidence.webcamSnapshot}
                      alt="Flagged Frame"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-slate-500">Image not captured</span>
                  )}
                </div>
              </div>

              <div>
                <div className="text-xs font-bold text-slate-400 mb-1.5 uppercase font-mono">Screen Snapshot Frame</div>
                <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950 aspect-video flex items-center justify-center">
                  {selectedSnapshot.evidence.screenSnapshot ? (
                    <img
                      src={selectedSnapshot.evidence.screenSnapshot}
                      alt="Screen Snapshot"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-slate-500">Screen share was inactive</span>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 p-3.5 rounded-xl bg-slate-900 border border-slate-800 space-y-2 text-xs">
              <div>
                <span className="text-slate-400 font-semibold">Incident Details: </span>
                <span className="text-slate-200">{selectedSnapshot.description}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-slate-400 font-mono">
                <div>Timestamp: <span className="text-white">T+{selectedSnapshot.formattedTime}</span></div>
                <div>Confidence: <span className="text-emerald-400">{Math.round(selectedSnapshot.confidence * 100)}%</span></div>
                <div>Gaze Region: <span className="text-cyan-400">{selectedSnapshot.evidence.regionTag || 'CENTER'}</span></div>
                <div>Head Yaw: <span className="text-indigo-400">{selectedSnapshot.evidence.headPoseSnapshot?.yaw ?? 0}°</span></div>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setSelectedSnapshot(null)}
                className="btn-secondary text-xs"
              >
                Close Evidence
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
