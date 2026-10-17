import React, { useState } from 'react';
import { 
  PlaySquare, 
  Sparkles, 
  CheckCircle2, 
  AlertTriangle, 
  UserCheck, 
  ArrowRight, 
  ShieldAlert, 
  Layers, 
  Camera, 
  Monitor, 
  Flame 
} from 'lucide-react';
import { MOCK_SESSIONS } from '../data/mockScenarios';
import { ExamSessionData, SuspiciousMoment } from '../types/proctor';

interface ExamSimulationViewProps {
  onLoadScenario: (session: ExamSessionData) => void;
  onSimulateAction: (actionType: 'CORNER_GAZE' | 'TAB_SWITCH' | 'HEAD_TURN' | 'FACE_MISSING' | 'MULTI_FACE') => void;
  activeSession: ExamSessionData;
}

export const ExamSimulationView: React.FC<ExamSimulationViewProps> = ({
  onLoadScenario,
  onSimulateAction,
  activeSession
}) => {
  const [selectedScenarioKey, setSelectedScenarioKey] = useState<string>('session-alex-morgan');

  const handleSelect = (key: string) => {
    setSelectedScenarioKey(key);
    const scen = MOCK_SESSIONS[key];
    if (scen) {
      onLoadScenario(scen);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Introduction Header */}
      <div className="glass-card p-6 border-l-4 border-cyan-500">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold">
              AI VERIFICATION SUITE & SCENARIO TESTBENCH
            </span>
            <h2 className="text-lg font-bold text-white mt-0.5">
              Automated Behavioral Anomaly Evaluation & Test Matrix
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Test and benchmark the Moments AI behavioral engine against realistic exam scenarios or fire synthetic behavioral violations to observe instant score degradation and snapshot generation.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="badge badge-indigo">
              <Sparkles className="w-3.5 h-3.5" />
              SYNTHESIS ENGINE READY
            </span>
          </div>
        </div>
      </div>

      {/* Pre-Configured Benchmark Scenarios */}
      <div>
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-4 flex items-center gap-2">
          <PlaySquare className="w-4 h-4 text-indigo-400" />
          Pre-Loaded Examination Datasets
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Scenario 1: Alex Morgan */}
          <div
            onClick={() => handleSelect('session-alex-morgan')}
            className={`glass-card p-5 cursor-pointer transition-all ${
              selectedScenarioKey === 'session-alex-morgan'
                ? 'border-indigo-500 bg-indigo-950/20 shadow-lg shadow-indigo-500/10'
                : 'hover:border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={MOCK_SESSIONS['session-alex-morgan'].candidate.avatarUrl}
                  alt="Alex Morgan"
                  className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                />
                <div>
                  <h4 className="text-sm font-bold text-white">Alex Morgan</h4>
                  <p className="text-xs text-slate-400">CS 401: Advanced Algorithms</p>
                </div>
              </div>
              <span className="badge badge-high text-[10px]">HIGH RISK (48%)</span>
            </div>

            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              <strong>Pattern Detected:</strong> Repeated glance patterns to top-right corner (physical reference notes) + 14.8s browser tab switch during coding problem #4.
            </p>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Violations: 6 Flagged</span>
              <span className="text-indigo-400 font-bold flex items-center gap-1">
                Load Scenario <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

          {/* Scenario 2: Marcus Vance */}
          <div
            onClick={() => handleSelect('session-marcus-vance')}
            className={`glass-card p-5 cursor-pointer transition-all ${
              selectedScenarioKey === 'session-marcus-vance'
                ? 'border-indigo-500 bg-indigo-950/20 shadow-lg shadow-indigo-500/10'
                : 'hover:border-slate-700'
            }`}
          >
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={MOCK_SESSIONS['session-marcus-vance'].candidate.avatarUrl}
                  alt="Marcus Vance"
                  className="w-12 h-12 rounded-xl object-cover border border-slate-700"
                />
                <div>
                  <h4 className="text-sm font-bold text-white">Marcus Vance</h4>
                  <p className="text-xs text-slate-400">CS 401: Advanced Algorithms</p>
                </div>
              </div>
              <span className="badge badge-safe text-[10px]">SAFE (97%)</span>
            </div>

            <p className="text-xs text-slate-300 mt-3 leading-relaxed">
              <strong>Pattern Detected:</strong> Clean benchmark session. Candidate maintained consistent eye focus on the exam questionnaire with zero unauthorized tab switches or extreme head turns.
            </p>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400 font-mono">
              <span>Violations: 0 Flagged</span>
              <span className="text-emerald-400 font-bold flex items-center gap-1">
                Load Scenario <ArrowRight className="w-3.5 h-3.5" />
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Real-time Interactive Trigger Simulator */}
      <div className="glass-card p-6">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
          <Flame className="w-4 h-4 text-rose-400" />
          Interactive Behavioral Event Generator
        </h3>
        <p className="text-xs text-slate-400 mb-5">
          Trigger real-time violation events to test AI scoring deductions, telemetry updates, and snapshot evidence logging:
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          
          <button
            onClick={() => onSimulateAction('CORNER_GAZE')}
            className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-amber-500/50 hover:bg-amber-950/20 text-left transition-all group"
          >
            <div className="flex items-center justify-between text-amber-400 font-bold text-xs">
              <span>Top-Right Corner Glance</span>
              <span className="font-mono text-[10px] bg-amber-500/10 px-2 py-0.5 rounded">-8 Pts</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Simulates candidate looking at sticky notes outside question area.
            </p>
          </button>

          <button
            onClick={() => onSimulateAction('TAB_SWITCH')}
            className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/50 hover:bg-rose-950/20 text-left transition-all group"
          >
            <div className="flex items-center justify-between text-rose-400 font-bold text-xs">
              <span>Alt+Tab / Window Blur</span>
              <span className="font-mono text-[10px] bg-rose-500/10 px-2 py-0.5 rounded">-15 Pts</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Simulates candidate switching to unauthorized browser tab.
            </p>
          </button>

          <button
            onClick={() => onSimulateAction('HEAD_TURN')}
            className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-purple-500/50 hover:bg-purple-950/20 text-left transition-all group"
          >
            <div className="flex items-center justify-between text-purple-400 font-bold text-xs">
              <span>Head Turn Left (&gt;35°)</span>
              <span className="font-mono text-[10px] bg-purple-500/10 px-2 py-0.5 rounded">-10 Pts</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Simulates candidate looking away to communicate with another person.
            </p>
          </button>

          <button
            onClick={() => onSimulateAction('FACE_MISSING')}
            className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/50 hover:bg-rose-950/20 text-left transition-all group"
          >
            <div className="flex items-center justify-between text-rose-400 font-bold text-xs">
              <span>Candidate Left Desk</span>
              <span className="font-mono text-[10px] bg-rose-500/10 px-2 py-0.5 rounded">-15 Pts</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Simulates face absence from webcam frame for &gt;2 seconds.
            </p>
          </button>

          <button
            onClick={() => onSimulateAction('MULTI_FACE')}
            className="p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-rose-500/50 hover:bg-rose-950/20 text-left transition-all group"
          >
            <div className="flex items-center justify-between text-rose-400 font-bold text-xs">
              <span>Multiple Faces in View</span>
              <span className="font-mono text-[10px] bg-rose-500/10 px-2 py-0.5 rounded">-25 Pts</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Simulates second individual entering the testing room.
            </p>
          </button>

        </div>
      </div>

    </div>
  );
};
