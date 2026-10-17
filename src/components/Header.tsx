import React from 'react';
import {
  ShieldAlert,
  Download,
  User,
  ShieldCheck,
} from 'lucide-react';
import { RiskLevel, UserRole } from '../types/index';

interface HeaderProps {
  currentRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  integrityScore: number;
  riskLevel: RiskLevel;
  totalViolations: number;
  onExportPDF: () => void;
  isExporting: boolean;
  candidateName: string;
}

export const Header: React.FC<HeaderProps> = ({
  currentRole,
  onSelectRole,
  integrityScore,
  riskLevel,
  totalViolations,
  onExportPDF,
  isExporting,
  candidateName,
}) => {
  const getRiskBadgeClass = (risk: RiskLevel) => {
    switch (risk) {
      case 'SAFE': return 'badge-safe';
      case 'LOW': return 'badge-low';
      case 'MEDIUM': return 'badge-medium';
      case 'HIGH':
      case 'CRITICAL': return 'badge-high';
      default: return '';
    }
  };

  return (
    <header className="card mb-6 px-6 py-4 border-b border-[var(--border)] flex flex-col lg:flex-row items-center justify-between gap-4">
      {/* Brand */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
          <ShieldAlert className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
            MOMENTS <span className="text-indigo-400 font-mono text-sm px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20">AI PROCTOR</span>
          </h1>
          <p className="text-xs text-slate-400">Autonomous Behavioral &amp; Eye‑Gaze Examination Integrity Engine</p>
        </div>
      </div>

      {/* Role Switcher */}
      <div className="flex items-center p-1.5 rounded-2xl bg-slate-900 border-2 border-slate-800 shadow-inner">
        <button
          onClick={() => onSelectRole('candidate')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            currentRole === 'candidate'
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/40 scale-102'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <User className="w-4 h-4 text-cyan-300" /> Candidate Exam Portal
        </button>
        <button
          onClick={() => onSelectRole('admin')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            currentRole === 'admin'
              ? 'bg-gradient-to-r from-indigo-600 to-indigo-700 text-white shadow-lg shadow-indigo-600/40 scale-102'
              : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-indigo-300" /> Admin / Examiner Panel
        </button>
      </div>

      {/* Integrity Score & Export */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3 bg-slate-900/80 px-3.5 py-1.5 rounded-xl border border-slate-800">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Integrity</div>
            <div className="font-mono text-base font-extrabold text-white flex items-center justify-end gap-1">
              {integrityScore}%
            </div>
          </div>
          <span className={`badge ${getRiskBadgeClass(riskLevel)}`}>{riskLevel}</span>
        </div>
        <button
          onClick={onExportPDF}
          disabled={isExporting}
          className="btn-primary text-xs"
          title="Export Examiner PDF Forensic Audit Report"
        >
          <Download className="w-3.5 h-3.5" />
          {isExporting ? 'Generating…' : 'Export PDF'}
        </button>
      </div>
    </header>
  );
};
