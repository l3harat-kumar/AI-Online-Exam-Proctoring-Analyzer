import React, { useState } from 'react';
import { 
  ShieldAlert, 
  ShieldCheck, 
  AlertTriangle, 
  XCircle, 
  CheckCircle2, 
  Download, 
  BarChart2, 
  TrendingUp, 
  Eye, 
  Clock, 
  Monitor, 
  Compass, 
  MessageSquare,
  Sparkles,
  Layers,
  ChevronRight
} from 'lucide-react';
import { calculateComparativeCheatingAnalysis } from '../ai/cheatingClassifier';
import { ExamSessionData, SuspiciousMoment } from '../types/proctor';

interface CheatingComparisonReportProps {
  session: ExamSessionData;
  onUpdateVerdict: (verdict: 'CLEARED' | 'SUSPECTED' | 'DISQUALIFIED') => void;
  onUpdateExaminerNotes: (violationId: string, notes: string) => void;
  onExportPDF: () => void;
  isExporting: boolean;
}

export const CheatingComparisonReport: React.FC<CheatingComparisonReportProps> = ({
  session,
  onUpdateVerdict,
  onUpdateExaminerNotes,
  onExportPDF,
  isExporting
}) => {
  const [selectedSnapshot, setSelectedSnapshot] = useState<SuspiciousMoment | null>(null);

  // Compute comparative analysis against cohort benchmark
  const analysis = calculateComparativeCheatingAnalysis(session);

  const getVerdictStyles = (verdict: string) => {
    switch (verdict) {
      case 'CONFIRMED_CHEATING':
        return {
          bg: 'bg-rose-950/40 border-rose-500/60',
          badge: 'badge-high',
          icon: <XCircle className="w-8 h-8 text-rose-400" />,
          title: 'CONFIRMED CHEATING DETECTED',
          textColor: 'text-rose-300'
        };
      case 'SUSPECTED_CHEATING':
        return {
          bg: 'bg-amber-950/40 border-amber-500/60',
          badge: 'badge-medium',
          icon: <AlertTriangle className="w-8 h-8 text-amber-400" />,
          title: 'SUSPECTED CHEATING (MANUAL REVIEW REQUIRED)',
          textColor: 'text-amber-300'
        };
      default:
        return {
          bg: 'bg-emerald-950/40 border-emerald-500/60',
          badge: 'badge-safe',
          icon: <CheckCircle2 className="w-8 h-8 text-emerald-400" />,
          title: 'EXAM INTEGRITY CLEARED (NO CHEATING DETECTED)',
          textColor: 'text-emerald-300'
        };
    }
  };

  const styles = getVerdictStyles(analysis.verdict);

  return (
    <div className="space-y-6">
      
      {/* 1. EXECUTIVE CHEATING VERDICT HERO BANNER */}
      <div className={`glass-card p-6 border-2 ${styles.bg} rounded-2xl shadow-xl`}>
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="p-3 rounded-2xl bg-slate-900/80 border border-slate-700/60 shadow-inner">
              {styles.icon}
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className={`badge ${styles.badge} text-[11px]`}>
                  AUTOMATED FORENSIC DETERMINATION
                </span>
                <span className="text-xs font-mono text-slate-400">
                  SESSION: {session.id}
                </span>
              </div>
              <h2 className={`text-xl font-black tracking-tight ${styles.textColor}`}>
                {styles.title}
              </h2>
              <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
                {analysis.verdictReason}
              </p>
            </div>
          </div>

          {/* Cheating Probability Gauge & Download */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="bg-slate-900/90 px-5 py-3 rounded-xl border border-slate-800 text-right">
              <div className="text-[10px] uppercase font-bold text-slate-400">
                Cheating Likelihood
              </div>
              <div className={`text-2xl font-black font-mono ${
                analysis.cheatingLikelihoodPercent >= 60 ? 'text-rose-400' : analysis.cheatingLikelihoodPercent >= 25 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {analysis.cheatingLikelihoodPercent}%
              </div>
            </div>

            <button
              onClick={onExportPDF}
              disabled={isExporting}
              className="btn-primary"
            >
              <Download className="w-4 h-4" />
              {isExporting ? 'Generating PDF...' : 'Download Official PDF Report'}
            </button>
          </div>
        </div>

        {/* Primary Anomaly Indicator Badges */}
        {analysis.primaryAnomalies.length > 0 && (
          <div className="mt-5 pt-4 border-t border-slate-800/80 space-y-1.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Primary Anomaly Triggers Identified:
            </div>
            <div className="flex flex-wrap gap-2">
              {analysis.primaryAnomalies.map((anom, idx) => (
                <div
                  key={idx}
                  className="px-3 py-1 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-1.5"
                >
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  <span>{anom}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. COMPARATIVE BENCHMARK MATRIX (Candidate Data vs Cohort Class Average) */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-indigo-400" />
              COMPARATIVE BEHAVIORAL MATRIX (CANDIDATE VS CLASS COHORT BENCHMARK)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Quantified comparison against standard benchmark averages derived from thousands of monitored exam sessions.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          
          {/* Metric 1: Corner Glances */}
          <div className="glass-panel p-4 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <Eye className="w-3.5 h-3.5 text-indigo-400" />
                Corner Glances
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <div className="text-xl font-bold font-mono text-white">
                    {analysis.factorScores.cornerGlances.candidate}
                  </div>
                  <div className="text-[10px] text-slate-400">Candidate Count</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-slate-400">
                    {analysis.factorScores.cornerGlances.benchmarkAvg}
                  </div>
                  <div className="text-[10px] text-slate-500">Cohort Avg</div>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800">
              <span className={`badge ${
                analysis.factorScores.cornerGlances.status === 'CRITICAL' ? 'badge-high' : analysis.factorScores.cornerGlances.status === 'ELEVATED' ? 'badge-medium' : 'badge-safe'
              } text-[9px]`}>
                {analysis.factorScores.cornerGlances.status}
              </span>
            </div>
          </div>

          {/* Metric 2: Tab Switches */}
          <div className="glass-panel p-4 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <Monitor className="w-3.5 h-3.5 text-cyan-400" />
                Tab Switches
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <div className="text-xl font-bold font-mono text-white">
                    {analysis.factorScores.tabSwitches.candidate}
                  </div>
                  <div className="text-[10px] text-slate-400">Candidate Count</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-slate-400">
                    {analysis.factorScores.tabSwitches.benchmarkAvg}
                  </div>
                  <div className="text-[10px] text-slate-500">Cohort Avg</div>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800">
              <span className={`badge ${
                analysis.factorScores.tabSwitches.status === 'CRITICAL' ? 'badge-high' : analysis.factorScores.tabSwitches.status === 'ELEVATED' ? 'badge-medium' : 'badge-safe'
              } text-[9px]`}>
                {analysis.factorScores.tabSwitches.status}
              </span>
            </div>
          </div>

          {/* Metric 3: Gaze Deviation % */}
          <div className="glass-panel p-4 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <Compass className="w-3.5 h-3.5 text-purple-400" />
                Gaze Deviation
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <div className="text-xl font-bold font-mono text-white">
                    {analysis.factorScores.gazeDeviation.candidate}%
                  </div>
                  <div className="text-[10px] text-slate-400">Off-Screen %</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-slate-400">
                    {analysis.factorScores.gazeDeviation.benchmarkAvg}%
                  </div>
                  <div className="text-[10px] text-slate-500">Cohort Avg</div>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800">
              <span className={`badge ${
                analysis.factorScores.gazeDeviation.status === 'CRITICAL' ? 'badge-high' : analysis.factorScores.gazeDeviation.status === 'ELEVATED' ? 'badge-medium' : 'badge-safe'
              } text-[9px]`}>
                {analysis.factorScores.gazeDeviation.status}
              </span>
            </div>
          </div>

          {/* Metric 4: Head Pose Deviations */}
          <div className="glass-panel p-4 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
                Head Turns &gt;25°
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <div className="text-xl font-bold font-mono text-white">
                    {analysis.factorScores.headPoseDeviations.candidate}%
                  </div>
                  <div className="text-[10px] text-slate-400">Time Tilted</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-slate-400">
                    {analysis.factorScores.headPoseDeviations.benchmarkAvg}%
                  </div>
                  <div className="text-[10px] text-slate-500">Cohort Avg</div>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800">
              <span className={`badge ${
                analysis.factorScores.headPoseDeviations.status === 'CRITICAL' ? 'badge-high' : analysis.factorScores.headPoseDeviations.status === 'ELEVATED' ? 'badge-medium' : 'badge-safe'
              } text-[9px]`}>
                {analysis.factorScores.headPoseDeviations.status}
              </span>
            </div>
          </div>

          {/* Metric 5: Absence Duration */}
          <div className="glass-panel p-4 flex flex-col justify-between">
            <div>
              <div className="text-[11px] font-bold text-slate-400 uppercase flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 text-emerald-400" />
                Absence Duration
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <div>
                  <div className="text-xl font-bold font-mono text-white">
                    {analysis.factorScores.absenceDurationSec.candidate}s
                  </div>
                  <div className="text-[10px] text-slate-400">Off-Camera</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-mono text-slate-400">
                    {analysis.factorScores.absenceDurationSec.benchmarkAvg}s
                  </div>
                  <div className="text-[10px] text-slate-500">Cohort Avg</div>
                </div>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-800">
              <span className={`badge ${
                analysis.factorScores.absenceDurationSec.status === 'CRITICAL' ? 'badge-high' : analysis.factorScores.absenceDurationSec.status === 'ELEVATED' ? 'badge-medium' : 'badge-safe'
              } text-[9px]`}>
                {analysis.factorScores.absenceDurationSec.status}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* 3. EXAMINER VERDICT OVERRIDE & SIGN-OFF */}
      <div className="glass-card p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-white uppercase tracking-wider">
            Examiner Final Academic Verdict Sign-Off
          </h4>
          <p className="text-xs text-slate-400 mt-0.5">
            Select official decision based on comparative telemetry and visual evidence:
          </p>
        </div>

        <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-xl border border-slate-800">
          <button
            onClick={() => onUpdateVerdict('CLEARED')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              session.examinerVerdict === 'CLEARED'
                ? 'bg-emerald-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Clear Candidate
          </button>
          <button
            onClick={() => onUpdateVerdict('SUSPECTED')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              session.examinerVerdict === 'SUSPECTED'
                ? 'bg-amber-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            Flag for Inquiry
          </button>
          <button
            onClick={() => onUpdateVerdict('DISQUALIFIED')}
            className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              session.examinerVerdict === 'DISQUALIFIED'
                ? 'bg-rose-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            Disqualify Exam
          </button>
        </div>
      </div>

      {/* 4. SYNCHRONIZED VISUAL EVIDENCE GALLERY (Flagged Moments) */}
      <div className="glass-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            SYNCHRONIZED VISUAL EVIDENCE GALLERY ({session.violations.length} MOMENTS)
          </h3>
          <span className="text-xs font-mono text-slate-400">
            Click any card to inspect full high-resolution telemetry
          </span>
        </div>

        {session.violations.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            <CheckCircle2 className="w-10 h-10 text-emerald-500/40 mx-auto mb-2" />
            No suspicious activities or cheating anomalies were captured during this exam.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {session.violations.map((v) => (
              <div
                key={v.id}
                onClick={() => setSelectedSnapshot(v)}
                className="rounded-xl bg-slate-900/60 border border-slate-800 hover:border-indigo-500/50 p-3.5 cursor-pointer transition-all hover:bg-slate-850 group"
              >
                {/* Snapshot Image Preview */}
                <div className="rounded-lg overflow-hidden bg-slate-950 aspect-video mb-3 border border-slate-800 relative">
                  {v.evidence.webcamSnapshot ? (
                    <img
                      src={v.evidence.webcamSnapshot}
                      alt={v.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-[10px] text-slate-500">
                      Visual snapshot available
                    </div>
                  )}
                  <span className="absolute top-2 left-2 badge badge-high text-[9px]">
                    T+{v.formattedTime}
                  </span>
                </div>

                <div className="flex items-start justify-between gap-1">
                  <h4 className="text-xs font-bold text-white group-hover:text-indigo-300">
                    {v.title}
                  </h4>
                </div>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-2">
                  {v.description}
                </p>

                <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[10px] font-mono text-slate-400">
                  <span>CONFIDENCE: {Math.round(v.confidence * 100)}%</span>
                  <span className="text-indigo-400 font-bold flex items-center gap-0.5">
                    Inspect <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Snapshot Modal */}
      {selectedSnapshot && (
        <div className="modal-backdrop" onClick={() => setSelectedSnapshot(null)}>
          <div className="glass-card max-w-2xl w-full p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="badge badge-high text-xs">{selectedSnapshot.severity.toUpperCase()}</span>
                <h3 className="text-sm font-bold text-white">{selectedSnapshot.title}</h3>
              </div>
              <button onClick={() => setSelectedSnapshot(null)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <div className="text-[10px] font-mono text-slate-400 mb-1">WEBCAM AI HUD CAPTURE</div>
                <div className="rounded-xl overflow-hidden bg-slate-950 aspect-video border border-slate-800">
                  {selectedSnapshot.evidence.webcamSnapshot && (
                    <img src={selectedSnapshot.evidence.webcamSnapshot} alt="Webcam" className="w-full h-full object-cover" />
                  )}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-mono text-slate-400 mb-1">SCREEN SNAPSHOT</div>
                <div className="rounded-xl overflow-hidden bg-slate-950 aspect-video border border-slate-800">
                  {selectedSnapshot.evidence.screenSnapshot ? (
                    <img src={selectedSnapshot.evidence.screenSnapshot} alt="Screen" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">Screen preview</div>
                  )}
                </div>
              </div>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
              <div><strong className="text-slate-300">Incident: </strong><span className="text-slate-400">{selectedSnapshot.description}</span></div>
              <div className="text-slate-400 font-mono">Timestamp: T+{selectedSnapshot.formattedTime} | Confidence: {Math.round(selectedSnapshot.confidence * 100)}%</div>
            </div>

            <div className="mt-4">
              <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                Examiner Annotation
              </label>
              <textarea
                value={selectedSnapshot.examinerNotes || ''}
                onChange={(e) => onUpdateExaminerNotes(selectedSnapshot.id, e.target.value)}
                placeholder="Enter examiner verification notes..."
                className="w-full rounded-xl bg-slate-900 border border-slate-800 p-2.5 text-xs text-white placeholder-slate-500 min-h-[60px]"
              />
            </div>

            <div className="mt-4 flex justify-end">
              <button onClick={() => setSelectedSnapshot(null)} className="btn-secondary text-xs">
                Close Evidence
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
