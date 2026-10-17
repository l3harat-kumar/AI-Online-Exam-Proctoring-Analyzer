import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  Clock, 
  HelpCircle, 
  Shield, 
  ArrowRight, 
  ArrowLeft, 
  FileCode, 
  Send, 
  AlertTriangle,
  Sparkles,
  Eye,
  Camera,
  Maximize2
} from 'lucide-react';
import { ScreenTracker } from '../ai/screenTracker';

interface CandidateExamRoomProps {
  screenTracker: ScreenTracker;
  onFinishExam: () => void;
  onSimulateViolation: (type: 'CORNER_GAZE' | 'TAB_SWITCH' | 'HEAD_TURN' | 'PHONE_GLANCE') => void;
}

interface Question {
  id: number;
  type: 'multiple_choice' | 'code' | 'written';
  title: string;
  description: string;
  codeSnippet?: string;
  options?: string[];
}

const EXAM_QUESTIONS: Question[] = [
  {
    id: 1,
    type: 'multiple_choice',
    title: 'Question 1: Graph Traversal Complexity',
    description: 'What is the asymptotic time complexity of Dijkstra\'s algorithm implemented with a Fibonacci heap on a directed graph with V vertices and E edges?',
    options: [
      'O(V log V + E)',
      'O(E log V)',
      'O(V^2 + E)',
      'O(V + E log E)'
    ]
  },
  {
    id: 2,
    type: 'code',
    title: 'Question 2: Memory & Concurrency Analysis',
    description: 'Identify the potential race condition in the following concurrent queue synchronization snippet:',
    codeSnippet: `class ConcurrentQueue<T> {
  private head: Node<T> | null = null;
  private tail: Node<T> | null = null;

  public enqueue(val: T): void {
    const node = new Node(val);
    if (!this.tail) {
      this.head = this.tail = node;
    } else {
      this.tail.next = node;
      this.tail = node; // Potential race condition across threads
    }
  }
}`
  },
  {
    id: 3,
    type: 'multiple_choice',
    title: 'Question 3: Dynamic Programming Subproblems',
    description: 'In the 0/1 Knapsack Problem with capacity W and N items, what determines the optimal substructure formulation?',
    options: [
      'DP[i][w] = max(DP[i-1][w], DP[i-1][w - wt[i]] + val[i])',
      'DP[i][w] = min(DP[i-1][w], DP[i][w - wt[i]])',
      'DP[i][w] = DP[i-1][w] + DP[i][w-1]',
      'DP[i][w] = max(DP[i][w-1], DP[i-1][w])'
    ]
  }
];

export const CandidateExamRoom: React.FC<CandidateExamRoomProps> = ({
  screenTracker,
  onFinishExam,
  onSimulateViolation
}) => {
  const [currentQIndex, setCurrentQIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, string>>({});
  const [timeLeftSec, setTimeLeftSec] = useState(5400); // 90 mins
  const [showWarningModal, setShowWarningModal] = useState<boolean>(false);
  const [warningMessage, setWarningMessage] = useState<string>('');

  // Exam Countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeLeftSec(prev => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const currentQ = EXAM_QUESTIONS[currentQIndex];

  const handleSelectOption = (opt: string) => {
    setSelectedAnswers(prev => ({ ...prev, [currentQ.id]: opt }));
  };

  const handleSimulateAction = (type: 'CORNER_GAZE' | 'TAB_SWITCH' | 'HEAD_TURN' | 'PHONE_GLANCE') => {
    onSimulateViolation(type);
    if (type === 'TAB_SWITCH') {
      setWarningMessage('Window focus was lost. Proctors have been notified of unauthorized window switching.');
      setShowWarningModal(true);
    } else if (type === 'CORNER_GAZE') {
      setWarningMessage('Suspicious gaze diversion detected: Sustained glance at top-right corner.');
      setShowWarningModal(true);
    } else if (type === 'HEAD_TURN') {
      setWarningMessage('Head pose deviation alert: Head turned away from screen view.');
      setShowWarningModal(true);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Top Exam Status Bar */}
      <div className="glass-card px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-l-4 border-indigo-500">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-indigo-400 font-bold">
            OFFICIAL SECURE EXAMINATION PORTAL
          </span>
          <h2 className="text-base font-bold text-white">
            CS 401: Advanced Algorithms & Concurrent Systems Final
          </h2>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-bold text-slate-400">TIME REMAINING:</span>
            <span className="font-mono text-sm font-bold text-white">{formatTime(timeLeftSec)}</span>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-semibold">
            <Shield className="w-3.5 h-3.5" />
            AI PROCTOR ACTIVE
          </div>
        </div>
      </div>

      {/* Interactive Simulation Sandbox Callout */}
      <div className="glass-panel p-4 border border-indigo-500/30 bg-indigo-950/20 rounded-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 text-indigo-300 font-bold text-xs">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              CANDIDATE BEHAVIOR TESTER & SIMULATION PANEL
            </div>
            <p className="text-slate-400 text-xs mt-0.5">
              Click any behavior below to simulate suspicious candidate actions and witness the AI detection pipeline in action:
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => handleSimulateAction('CORNER_GAZE')}
              className="text-xs px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 font-semibold transition-all"
            >
              Peek at Top-Right Corner
            </button>
            <button
              onClick={() => handleSimulateAction('TAB_SWITCH')}
              className="text-xs px-3 py-1.5 rounded-lg bg-rose-500/20 border border-rose-500/40 text-rose-300 hover:bg-rose-500/30 font-semibold transition-all"
            >
              Simulate Alt+Tab Switch
            </button>
            <button
              onClick={() => handleSimulateAction('HEAD_TURN')}
              className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/20 border border-purple-500/40 text-purple-300 hover:bg-purple-500/30 font-semibold transition-all"
            >
              Turn Head Away Left
            </button>
          </div>
        </div>
      </div>

      {/* Main Exam Paper Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left: Question Navigation Sidebar (3 cols) */}
        <div className="lg:col-span-3 glass-card p-5 h-fit">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Question Palette
          </h3>
          <div className="grid grid-cols-3 gap-2">
            {EXAM_QUESTIONS.map((q, idx) => {
              const isAnswered = Boolean(selectedAnswers[q.id]);
              const isCurrent = currentQIndex === idx;

              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentQIndex(idx)}
                  className={`p-2.5 rounded-lg text-xs font-bold font-mono transition-all ${
                    isCurrent 
                      ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/40' 
                      : isAnswered 
                        ? 'bg-emerald-950/60 border border-emerald-500/40 text-emerald-300' 
                        : 'bg-slate-900 border border-slate-800 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  Q{q.id}
                </button>
              );
            })}
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800 space-y-2 text-[11px] text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500"></span>
              <span>Current Question</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
              <span>Answered</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-slate-700"></span>
              <span>Unvisited</span>
            </div>
          </div>
        </div>

        {/* Right: Question Body & Answers (9 cols) */}
        <div className="lg:col-span-9 glass-card p-6 flex flex-col justify-between min-h-[460px]">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="badge badge-indigo text-xs">
                QUESTION {currentQ.id} OF {EXAM_QUESTIONS.length}
              </span>
              <span className="text-xs font-mono text-slate-400">Weight: 20 Points</span>
            </div>

            <h3 className="text-lg font-bold text-white mt-4">
              {currentQ.title}
            </h3>
            <p className="text-sm text-slate-300 mt-2 leading-relaxed">
              {currentQ.description}
            </p>

            {/* Code Snippet if applicable */}
            {currentQ.codeSnippet && (
              <div className="mt-4 rounded-xl bg-slate-950 border border-slate-800 p-4 font-mono text-xs text-indigo-300 overflow-x-auto">
                <pre>{currentQ.codeSnippet}</pre>
              </div>
            )}

            {/* Multiple Choice Options */}
            {currentQ.options && (
              <div className="mt-6 space-y-3">
                {currentQ.options.map((opt, i) => {
                  const isSelected = selectedAnswers[currentQ.id] === opt;
                  return (
                    <div
                      key={i}
                      onClick={() => handleSelectOption(opt)}
                      className={`p-4 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                        isSelected 
                          ? 'bg-indigo-600/20 border-indigo-500 text-white shadow-md shadow-indigo-500/10' 
                          : 'bg-slate-900/50 border-slate-800 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold font-mono ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                        }`}>
                          {String.fromCharCode(65 + i)}
                        </span>
                        <span className="text-sm">{opt}</span>
                      </div>

                      {isSelected && <CheckCircle2 className="w-5 h-5 text-indigo-400" />}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Bottom Navigation */}
          <div className="mt-8 pt-4 border-t border-slate-800 flex items-center justify-between">
            <button
              onClick={() => setCurrentQIndex(prev => Math.max(0, prev - 1))}
              disabled={currentQIndex === 0}
              className="btn-secondary text-xs disabled:opacity-40"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Previous
            </button>

            <div className="flex items-center gap-3">
              {currentQIndex < EXAM_QUESTIONS.length - 1 ? (
                <button
                  onClick={() => setCurrentQIndex(prev => prev + 1)}
                  className="btn-primary text-xs"
                >
                  Next Question
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  onClick={onFinishExam}
                  className="btn-primary text-xs bg-gradient-to-r from-emerald-600 to-teal-600 shadow-emerald-600/30"
                >
                  <Send className="w-3.5 h-3.5" />
                  Submit Examination
                </button>
              )}
            </div>
          </div>
        </div>

      </div>

      {/* Warning Modal when violation triggered */}
      {showWarningModal && (
        <div className="modal-backdrop" onClick={() => setShowWarningModal(false)}>
          <div className="glass-card max-w-md w-full p-6 border-amber-500/40" onClick={e => e.stopPropagation()}>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 mb-3 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h3 className="text-base font-bold text-white text-center">
              Candidate Behavioral Alert
            </h3>
            <p className="text-xs text-slate-300 text-center mt-2">
              {warningMessage}
            </p>

            <div className="mt-4 p-3 rounded-lg bg-slate-900 text-[11px] text-slate-400 text-center">
              Please maintain focus on the exam questionnaire. All off-screen glances, tab switches, and head movements are recorded for forensic audit.
            </div>

            <div className="mt-5 flex justify-center">
              <button
                onClick={() => setShowWarningModal(false)}
                className="btn-primary text-xs w-full"
              >
                I Acknowledge & Return to Exam
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
