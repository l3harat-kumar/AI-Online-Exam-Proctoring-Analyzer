import React, { useState } from 'react';
import { 
  ShieldAlert, 
  Video, 
  BarChart3, 
  Users, 
  PlaySquare, 
  CheckCircle2, 
  AlertTriangle, 
  XCircle, 
  Eye, 
  Download, 
  Search, 
  Filter,
  Monitor,
  Camera,
  Layers,
  ArrowRight
} from 'lucide-react';
import { LiveProctorView } from './LiveProctorView';
import { CheatingComparisonReport } from './CheatingComparisonReport';
import { ExamSimulationView } from './ExamSimulationView';
import { AdminViewTab, ExamSessionData, RiskLevel, SuspiciousMoment } from '../types/proctor';
import { IntegrityEngine } from '../ai/integrityEngine';
import { ScreenTracker } from '../ai/screenTracker';
import { MOCK_SESSIONS } from '../data/mockScenarios';

interface AdminPanelProps {
  activeSession: ExamSessionData;
  onSelectCandidateSession: (session: ExamSessionData) => void;
  integrityEngine: IntegrityEngine;
  screenTracker: ScreenTracker;
  onViolationOccurred: (violation: SuspiciousMoment) => void;
  onUpdateScore: (score: number, risk: RiskLevel) => void;
  onUpdateVerdict: (verdict: 'CLEARED' | 'SUSPECTED' | 'DISQUALIFIED') => void;
  onUpdateExaminerNotes: (violationId: string, notes: string) => void;
  onExportPDF: () => void;
  isExporting: boolean;
  onSimulateAction: (type: 'CORNER_GAZE' | 'TAB_SWITCH' | 'HEAD_TURN' | 'FACE_MISSING' | 'MULTI_FACE') => void;
  initialTab?: AdminViewTab;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  activeSession,
  onSelectCandidateSession,
  integrityEngine,
  screenTracker,
  onViolationOccurred,
  onUpdateScore,
  onUpdateVerdict,
  onUpdateExaminerNotes,
  onExportPDF,
  isExporting,
  onSimulateAction,
  initialTab = 'comparative_report'
}) => {
  const [adminTab, setAdminTab] = useState<AdminViewTab>(initialTab);
  const [searchTerm, setSearchTerm] = useState('');

  // Combine live session with mock archived sessions
  const allSessionsList: ExamSessionData[] = [
    activeSession,
    MOCK_SESSIONS['session-alex-morgan'],
    MOCK_SESSIONS['session-marcus-vance']
  ].filter((v, i, a) => a.findIndex(t => t.id === v.id) === i);

  const filteredSessions = allSessionsList.filter(s => 
    s.candidate.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.candidate.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    s.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      
      {/* Admin Command Navigation Bar */}
      <div className="glass-card px-6 py-3.5 flex flex-col md:flex-row items-center justify-between gap-4 border-l-4 border-indigo-500">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-white uppercase tracking-tight">
              Examiner & Proctor Command Center
            </h2>
            <p className="text-[11px] text-slate-400">
              Active Session: <span className="font-mono text-indigo-300 font-semibold">{activeSession.candidate.name} ({activeSession.candidate.id})</span>
            </p>
          </div>
        </div>

        {/* Sub-view Navigation */}
        <div className="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            onClick={() => setAdminTab('comparative_report')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              adminTab === 'comparative_report'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            Cheating & Integrity Report
          </button>

          <button
            onClick={() => setAdminTab('live_monitor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              adminTab === 'live_monitor'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            Live Video & Screen Feed
          </button>

          <button
            onClick={() => setAdminTab('all_candidates')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              adminTab === 'all_candidates'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Candidate Roster ({allSessionsList.length})
          </button>

          <button
            onClick={() => setAdminTab('testbench')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              adminTab === 'testbench'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <PlaySquare className="w-3.5 h-3.5" />
            AI Testbench
          </button>
        </div>
      </div>

      {/* VIEW: COMPARATIVE CHEATING REPORT */}
      {adminTab === 'comparative_report' && (
        <CheatingComparisonReport
          session={activeSession}
          onUpdateVerdict={onUpdateVerdict}
          onUpdateExaminerNotes={onUpdateExaminerNotes}
          onExportPDF={onExportPDF}
          isExporting={isExporting}
        />
      )}

      {/* VIEW: LIVE VIDEO & SCREEN FEED */}
      {adminTab === 'live_monitor' && (
        <LiveProctorView
          integrityEngine={integrityEngine}
          screenTracker={screenTracker}
          integrityScore={activeSession.finalIntegrityScore}
          riskLevel={activeSession.finalRiskLevel}
          violations={activeSession.violations}
          onViolationOccurred={onViolationOccurred}
          onUpdateScore={onUpdateScore}
        />
      )}

      {/* VIEW: ALL CANDIDATES ROSTER */}
      {adminTab === 'all_candidates' && (
        <div className="space-y-6">
          <div className="glass-card p-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                  Examination Candidates & Session Audits
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Select a candidate session to review comparative behavioral telemetry and export forensic audit certificates.
                </p>
              </div>

              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search candidate name or ID..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3.5 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSessions.map((s) => {
                const isSelected = activeSession.id === s.id;
                const isHighRisk = s.finalRiskLevel === 'HIGH' || s.finalRiskLevel === 'CRITICAL';
                const isSafe = s.finalRiskLevel === 'SAFE';

                return (
                  <div
                    key={s.id}
                    onClick={() => {
                      onSelectCandidateSession(s);
                      setAdminTab('comparative_report');
                    }}
                    className={`glass-card p-5 cursor-pointer transition-all ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-950/20 shadow-lg shadow-indigo-500/10'
                        : 'hover:border-slate-700 hover:bg-slate-850'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <img
                          src={s.candidate.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'}
                          alt={s.candidate.name}
                          className="w-11 h-11 rounded-xl object-cover border border-slate-700"
                        />
                        <div>
                          <h4 className="text-xs font-bold text-white">{s.candidate.name}</h4>
                          <span className="text-[10px] font-mono text-slate-400">{s.candidate.id}</span>
                        </div>
                      </div>

                      <span className={`badge ${
                        isHighRisk ? 'badge-high' : isSafe ? 'badge-safe' : 'badge-medium'
                      } text-[9px]`}>
                        {s.finalIntegrityScore}% SCORE
                      </span>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 space-y-1 text-[11px] text-slate-400">
                      <div className="flex justify-between">
                        <span>Violations Flagged:</span>
                        <span className="font-mono font-bold text-white">{s.violations.length}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tab Switches:</span>
                        <span className="font-mono font-bold text-white">{s.tabSwitchCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Academic Verdict:</span>
                        <span className={`font-bold ${
                          s.examinerVerdict === 'CLEARED' ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {s.examinerVerdict || 'PENDING'}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-indigo-400 font-semibold">
                      <span>View Full Cheating Audit</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* VIEW: TESTBENCH */}
      {adminTab === 'testbench' && (
        <ExamSimulationView
          onLoadScenario={(scen) => {
            onSelectCandidateSession(scen);
            setAdminTab('comparative_report');
          }}
          onSimulateAction={onSimulateAction}
          activeSession={activeSession}
        />
      )}

    </div>
  );
};
