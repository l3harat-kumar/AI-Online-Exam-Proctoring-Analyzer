import React, { useState, useEffect, useRef } from 'react';
import { 
  BarChart3, 
  ShieldCheck, 
  AlertTriangle, 
  Eye, 
  Download, 
  Filter, 
  Clock, 
  UserCheck, 
  Compass, 
  CheckCircle2, 
  XCircle, 
  MessageSquare,
  Sparkles,
  Search,
  Maximize2
} from 'lucide-react';
import { ExamSessionData, SuspiciousMoment, ViolationType } from '../types/proctor';

interface ForensicDashboardProps {
  session: ExamSessionData;
  onUpdateVerdict: (verdict: 'CLEARED' | 'SUSPECTED' | 'DISQUALIFIED') => void;
  onUpdateExaminerNotes: (violationId: string, notes: string) => void;
  onExportPDF: () => void;
  isExporting: boolean;
}

export const ForensicDashboard: React.FC<ForensicDashboardProps> = ({
  session,
  onUpdateVerdict,
  onUpdateExaminerNotes,
  onExportPDF,
  isExporting
}) => {
  const heatmapCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<string>('ALL');
  const [activeMomentId, setActiveMomentId] = useState<string | null>(
    session.violations.length > 0 ? session.violations[0].id : null
  );
  const [activeTab, setActiveTab] = useState<'evidence' | 'analytics' | 'heatmap'>('evidence');

  // Render 2D Gaze Density Heatmap
  useEffect(() => {
    if (!heatmapCanvasRef.current) return;
    const canvas = heatmapCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width = 480;
    const h = canvas.height = 280;

    // Dark screen container
    ctx.fillStyle = '#090d16';
    ctx.fillRect(0, 0, w, h);

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += 40) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }

    // Draw Heatmap Points
    session.gazeHeatmap.forEach(pt => {
      const px = (pt.x / 100) * w;
      const py = (pt.y / 100) * h;
      const radius = 35 * pt.intensity;

      const grad = ctx.createRadialGradient(px, py, 2, px, py, radius);
      
      // Color grading based on location (Center vs Corners)
      const isCorner = pt.x > 70 || pt.x < 30 || pt.y > 70 || pt.y < 30;
      if (isCorner) {
        grad.addColorStop(0, 'rgba(239, 68, 68, 0.45)');
        grad.addColorStop(0.6, 'rgba(245, 158, 11, 0.2)');
        grad.addColorStop(1, 'rgba(239, 68, 68, 0)');
      } else {
        grad.addColorStop(0, 'rgba(16, 185, 129, 0.4)');
        grad.addColorStop(0.6, 'rgba(6, 182, 212, 0.15)');
        grad.addColorStop(1, 'rgba(16, 185, 129, 0)');
      }

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, 2 * Math.PI);
      ctx.fill();
    });

    // Outer border
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, w, h);
  }, [session.gazeHeatmap, activeTab]);

  const filteredViolations = session.violations.filter(v => {
    if (selectedFilter === 'ALL') return true;
    return v.type === selectedFilter;
  });

  const activeMoment = session.violations.find(v => v.id === activeMomentId) || session.violations[0];

  return (
    <div className="space-y-6">
      
      {/* Candidate Executive Summary Card */}
      <div className="glass-card p-6">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          
          {/* Candidate Profile */}
          <div className="flex items-center gap-4">
            <img
              src={session.candidate.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
              alt={session.candidate.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-indigo-500/40 shadow-md"
            />
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white">{session.candidate.name}</h2>
                <span className="badge badge-indigo font-mono text-[10px]">{session.candidate.id}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{session.candidate.examTitle}</p>
              <div className="flex items-center gap-4 mt-2 text-[11px] text-slate-400 font-mono">
                <span>CODE: {session.candidate.examCode}</span>
                <span>TIME: {session.candidate.scheduledTime}</span>
              </div>
            </div>
          </div>

          {/* Forensic Integrity Score & Examiner Verdict Action */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="bg-slate-900/80 px-4 py-3 rounded-xl border border-slate-800 text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400">Integrity Score</div>
              <div className={`text-2xl font-black font-mono ${
                session.finalIntegrityScore >= 80 ? 'text-emerald-400' : session.finalIntegrityScore >= 50 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {session.finalIntegrityScore}%
              </div>
            </div>

            {/* Examiner Verdict Selector */}
            <div className="bg-slate-900/80 p-2 rounded-xl border border-slate-800 flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-400 px-2">VERDICT:</span>
              <button
                onClick={() => onUpdateVerdict('CLEARED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  session.examinerVerdict === 'CLEARED'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'text-slate-400 hover:text-emerald-300 hover:bg-slate-800'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Cleared
              </button>
              <button
                onClick={() => onUpdateVerdict('SUSPECTED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  session.examinerVerdict === 'SUSPECTED'
                    ? 'bg-amber-600 text-white shadow-md shadow-amber-600/30'
                    : 'text-slate-400 hover:text-amber-300 hover:bg-slate-800'
                }`}
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                Suspected
              </button>
              <button
                onClick={() => onUpdateVerdict('DISQUALIFIED')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1 transition-all ${
                  session.examinerVerdict === 'DISQUALIFIED'
                    ? 'bg-rose-600 text-white shadow-md shadow-rose-600/30'
                    : 'text-slate-400 hover:text-rose-300 hover:bg-slate-800'
                }`}
              >
                <XCircle className="w-3.5 h-3.5" />
                Disqualified
              </button>
            </div>

            <button
              onClick={onExportPDF}
              disabled={isExporting}
              className="btn-primary text-xs"
            >
              <Download className="w-3.5 h-3.5" />
              {isExporting ? 'Generating Report...' : 'Download PDF Audit'}
            </button>
          </div>

        </div>
      </div>

      {/* Forensic Timeline Scrubber Bar */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            EXAM SESSION TIMELINE & FLAGGED MOMENT SCRUBBER
          </h3>
          <span className="text-xs font-mono text-slate-400">Total Duration: 90 Mins</span>
        </div>

        {/* Scrub Track */}
        <div className="relative w-full h-8 bg-slate-950 rounded-lg border border-slate-800 flex items-center px-4">
          <div className="w-full h-1.5 bg-slate-800 rounded-full relative">
            
            {/* Markers */}
            {session.violations.map((v) => {
              const leftPercent = Math.min(95, Math.max(5, (v.timeOffsetSec / (90 * 60)) * 100));
              const isSelected = activeMoment?.id === v.id;

              return (
                <button
                  key={v.id}
                  onClick={() => setActiveMomentId(v.id)}
                  className={`absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-4 h-4 rounded-full transition-all ${
                    isSelected ? 'ring-4 ring-indigo-500 scale-125 z-20' : 'hover:scale-110 z-10'
                  } ${
                    v.severity === 'critical' || v.severity === 'high' ? 'bg-rose-500' : 'bg-amber-500'
                  }`}
                  style={{ left: `${leftPercent}%` }}
                  title={`T+${v.formattedTime}: ${v.title}`}
                />
              );
            })}
          </div>
        </div>

        <div className="flex justify-between text-[10px] font-mono text-slate-500 mt-2">
          <span>00:00 (Start)</span>
          <span>30:00</span>
          <span>60:00</span>
          <span>90:00 (Submission)</span>
        </div>
      </div>

      {/* Main Forensic Content Area: Evidence Cards & Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Flagged Moments List (5 cols) */}
        <div className="lg:col-span-5 glass-card p-5 flex flex-col">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400" />
              FLAGGED MOMENTS ({session.violations.length})
            </h3>

            {/* Filter */}
            <select
              value={selectedFilter}
              onChange={(e) => setSelectedFilter(e.target.value)}
              className="text-xs bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-300 font-medium"
            >
              <option value="ALL">All Types</option>
              <option value="SUSPICIOUS_CORNER_GAZE">Corner Gaze</option>
              <option value="TAB_SWITCH_BLUR">Tab Switch</option>
              <option value="HEAD_TURNED_AWAY">Head Turn</option>
              <option value="FACE_MISSING">Absence</option>
            </select>
          </div>

          <div className="mt-4 space-y-3 flex-1 overflow-y-auto max-h-[520px] pr-1">
            {filteredViolations.length === 0 ? (
              <div className="text-center py-16 text-slate-500 text-xs">
                No flagged moments matching current filter criteria.
              </div>
            ) : (
              filteredViolations.map((v) => {
                const isSelected = activeMoment?.id === v.id;
                return (
                  <div
                    key={v.id}
                    onClick={() => setActiveMomentId(v.id)}
                    className={`p-3.5 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500 shadow-md shadow-indigo-500/10'
                        : 'bg-slate-900/50 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className={`w-2.5 h-2.5 rounded-full ${
                          v.severity === 'critical' || v.severity === 'high' ? 'bg-rose-500' : 'bg-amber-500'
                        }`} />
                        <span className="text-xs font-bold text-white">
                          {v.title}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 font-semibold">
                        +{v.formattedTime}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 mt-1 line-clamp-2">
                      {v.description}
                    </p>

                    <div className="mt-3 flex items-center justify-between text-[11px] font-mono">
                      <span className="badge badge-indigo text-[9px]">
                        CONFIDENCE: {Math.round(v.confidence * 100)}%
                      </span>
                      {v.evidence.regionTag && (
                        <span className="text-cyan-400 font-bold">
                          ZONE: {v.evidence.regionTag}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right: Active Moment High-Res Evidence & Notes Inspector (7 cols) */}
        <div className="lg:col-span-7 glass-card p-6 flex flex-col justify-between">
          {activeMoment ? (
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <span className="badge badge-high text-xs">{activeMoment.severity.toUpperCase()}</span>
                  <h3 className="text-base font-bold text-white">
                    {activeMoment.title}
                  </h3>
                </div>
                <span className="font-mono text-xs text-indigo-400 font-bold">
                  TIMESTAMP: T+{activeMoment.formattedTime}
                </span>
              </div>

              {/* Side-by-Side Visual Snapshots */}
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-bold text-slate-400 mb-1.5 uppercase font-mono flex items-center justify-between">
                    <span>Webcam & AI Telemetry</span>
                    <span className="text-indigo-400">Captured T+{activeMoment.formattedTime}</span>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950 aspect-video flex items-center justify-center shadow-inner">
                    {activeMoment.evidence.webcamSnapshot ? (
                      <img
                        src={activeMoment.evidence.webcamSnapshot}
                        alt="Webcam Snapshot"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-slate-500">Snapshot frame unavailable</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="text-xs font-bold text-slate-400 mb-1.5 uppercase font-mono flex items-center justify-between">
                    <span>Screen Capture Snapshot</span>
                    <span className="text-cyan-400">Synchronized</span>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-slate-700 bg-slate-950 aspect-video flex items-center justify-center shadow-inner">
                    {activeMoment.evidence.screenSnapshot ? (
                      <img
                        src={activeMoment.evidence.screenSnapshot}
                        alt="Screen Snapshot"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-xs text-slate-500">No screen capture stream</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Incident Telemetry Breakdown */}
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="glass-panel p-2.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Gaze Focus Zone</div>
                  <div className="text-xs font-mono font-bold text-cyan-300 mt-1">
                    {activeMoment.evidence.regionTag || 'CENTER'}
                  </div>
                </div>
                <div className="glass-panel p-2.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">Head Pose Yaw/Pitch</div>
                  <div className="text-xs font-mono font-bold text-indigo-300 mt-1">
                    {activeMoment.evidence.headPoseSnapshot ? `${activeMoment.evidence.headPoseSnapshot.yaw}° / ${activeMoment.evidence.headPoseSnapshot.pitch}°` : 'N/A'}
                  </div>
                </div>
                <div className="glass-panel p-2.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase">AI Confidence</div>
                  <div className="text-xs font-mono font-bold text-emerald-400 mt-1">
                    {Math.round(activeMoment.confidence * 100)}% Match
                  </div>
                </div>
              </div>

              {/* Examiner Annotation & Notes Input */}
              <div className="mt-5">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <MessageSquare className="w-3.5 h-3.5 text-indigo-400" />
                  Examiner Forensic Annotation
                </label>
                <textarea
                  value={activeMoment.examinerNotes || ''}
                  onChange={(e) => onUpdateExaminerNotes(activeMoment.id, e.target.value)}
                  placeholder="Type forensic examiner observations or justification here..."
                  className="w-full rounded-xl bg-slate-900/90 border border-slate-800 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 min-h-[70px]"
                />
              </div>
            </div>
          ) : (
            <div className="text-center py-20 text-slate-500 text-xs">
              Select a moment from the timeline or list to inspect evidence.
            </div>
          )}

          {/* 2D Gaze Density Canvas Visualizer */}
          <div className="mt-6 pt-4 border-t border-slate-800">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-indigo-400" />
              Cumulative Screen Gaze Density Heatmap
            </h4>
            <div className="flex justify-center">
              <canvas
                ref={heatmapCanvasRef}
                className="rounded-xl border border-slate-800 shadow-lg w-full max-w-[480px] h-[160px] object-cover"
              />
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};
