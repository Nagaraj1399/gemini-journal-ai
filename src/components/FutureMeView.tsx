import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import {
  Compass,
  Sparkles,
  AlertTriangle,
  Target,
  Calendar,
  HelpCircle,
  ArrowRight,
  RefreshCw,
  CheckCircle2,
  ListPlus,
  ShieldCheck,
} from 'lucide-react';
import { FutureMeProjections, Conversation, Goal } from '../types';
import { requestFutureMe } from '../services/api';
import { saveGoal, saveSmartAction } from '../services/firestoreService';

interface FutureMeViewProps {
  userId: string;
  token: string;
  journals: Conversation[];
  goals: Goal[];
  memories?: string[];
  onNavigateToGoals: () => void;
}

export const FutureMeView: React.FC<FutureMeViewProps> = ({
  userId,
  token,
  journals,
  goals,
  memories = [],
  onNavigateToGoals,
}) => {
  const [projections, setProjections] = useState<FutureMeProjections | null>(null);
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    loadFutureMe();
  }, [journals.length, goals.length]);

  const loadFutureMe = async () => {
    try {
      setLoading(true);
      const data = await requestFutureMe(token, {
        journals: journals.slice(0, 15).map((j) => ({
          title: j.title,
          summary: j.summary || '',
          themes: j.themes || [],
          goals: j.goals || [],
          openQuestions: j.openQuestions || [],
          date: new Date(j.createdAt).toISOString().split('T')[0],
        })),
        goals: goals.slice(0, 10).map((g) => ({
          title: g.title,
          progress: g.progress,
          category: g.category,
        })),
        memories,
      });
      setProjections(data);
    } catch (err) {
      console.error('Failed to load Future Me projections:', err);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handlePromoteToGoal = async (priorityText: string) => {
    try {
      await saveGoal(userId, {
        title: priorityText,
        description: 'Generated from Future Me priorities synthesis.',
        category: 'Future Focus',
        status: 'In Progress',
        progress: 10,
        tasks: [
          { id: `t-1`, title: 'Define scope and first checkpoint', completed: false },
          { id: `t-2`, title: 'Block dedicated execution time', completed: false },
        ],
      });
      showNotification(`Added to goals: "${priorityText}"`);
    } catch (err) {
      console.error('Failed to add goal:', err);
    }
  };

  const handlePromoteToAction = async (priorityText: string) => {
    try {
      await saveSmartAction(userId, {
        title: priorityText,
        category: 'Personal',
        urgency: 'high',
        status: 'pending',
        sourceType: 'journal',
      });
      showNotification(`Action created: "${priorityText}"`);
    } catch (err) {
      console.error('Failed to add action:', err);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6" id="future-me-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 mb-6 border-b border-white/5 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Compass className="w-3.5 h-3.5 text-purple-400" />
              Temporal Synthesis
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Future Me</h1>
          <p className="text-sm text-slate-400">
            Forward-looking projections synthesized strictly from your private journal history and active goals.
          </p>
        </div>

        <button
          onClick={loadFutureMe}
          disabled={loading}
          className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-white text-xs font-medium flex items-center gap-1.5 transition-all self-end sm:self-auto"
          id="regenerate-future-me-btn"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Regenerate Projections
        </button>
      </div>

      {/* Notification */}
      {notification && (
        <div className="mb-4 p-3 rounded-xl bg-purple-950/80 border border-purple-500/30 text-purple-200 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-purple-400" />
          {notification}
        </div>
      )}

      {/* Disclaimer Badge */}
      <div className="mb-6 p-3.5 rounded-xl bg-slate-900/60 border border-white/5 flex items-start gap-2.5 text-xs text-slate-400">
        <ShieldCheck className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        <p>
          <strong className="text-slate-300">Privacy & Scope:</strong>{' '}
          {projections?.disclaimer ||
            'Projections are AI-generated thinking prompts synthesized strictly from your private journal history, not fixed predictions.'}
        </p>
      </div>

      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center text-slate-500">
          <RefreshCw className="w-8 h-8 animate-spin text-purple-400 mb-3" />
          <p className="text-sm text-slate-400 font-medium">Synthesizing Future Projections with Gemini 3.8 Flash...</p>
        </div>
      ) : projections ? (
        <div className="space-y-6">
          {/* Top 3 Cards Grid: Working Toward, Blockers, Next Focus */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Card 1: Currently Working Toward */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-white/5 flex flex-col">
              <div className="flex items-center gap-2 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-3">
                <Target className="w-4 h-4" />
                Currently Working Toward
              </div>
              <ul className="space-y-2.5 flex-1">
                {projections.currentlyWorkingToward.map((item, i) => (
                  <li key={i} className="text-xs text-slate-200 flex items-start gap-2 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 shrink-0 mt-1.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Card 2: Repeated Struggles & Blockers */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-white/5 flex flex-col">
              <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-3">
                <AlertTriangle className="w-4 h-4" />
                Repeated Struggles & Blockers
              </div>
              <ul className="space-y-2.5 flex-1">
                {projections.strugglesAndBlockers.map((item, i) => (
                  <li key={i} className="text-xs text-slate-200 flex items-start gap-2 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Card 3: What to Focus on Next */}
            <div className="p-5 rounded-2xl bg-slate-900/70 border border-white/5 flex flex-col">
              <div className="flex items-center gap-2 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
                <Sparkles className="w-4 h-4" />
                What to Focus on Next
              </div>
              <ul className="space-y-2.5 flex-1">
                {projections.nextFocusAreas.map((item, i) => (
                  <li key={i} className="text-xs text-slate-200 flex items-start gap-2 leading-relaxed">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0 mt-1.5" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Priorities Grid: Next 7 Days & Next 30 Days */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 7 Days */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-indigo-950/40 border border-indigo-500/20">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
                  <Calendar className="w-4 h-4 text-indigo-400" />
                  Suggested Priorities: Next 7 Days
                </div>
                <span className="text-[10px] text-slate-500">Short-term leverage</span>
              </div>

              <div className="space-y-3">
                {projections.next7DaysPriorities.map((priority, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950/60 border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                  >
                    <span className="text-xs text-slate-200 leading-snug flex-1 font-medium">
                      {priority}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                      <button
                        onClick={() => handlePromoteToAction(priority)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] transition-colors"
                        title="Add to Smart Actions"
                      >
                        + Action
                      </button>
                      <button
                        onClick={() => handlePromoteToGoal(priority)}
                        className="px-2 py-1 rounded bg-indigo-600/80 hover:bg-indigo-500 text-white font-medium text-[10px] transition-colors"
                        title="Add to Goal Center"
                      >
                        + Goal
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 30 Days */}
            <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 to-purple-950/40 border border-purple-500/20">
              <div className="flex items-center justify-between mb-4 pb-2 border-b border-white/5">
                <div className="flex items-center gap-2 text-purple-300 text-xs font-semibold uppercase tracking-wider">
                  <Compass className="w-4 h-4 text-purple-400" />
                  Suggested Priorities: Next 30 Days
                </div>
                <span className="text-[10px] text-slate-500">Long-term vision</span>
              </div>

              <div className="space-y-3">
                {projections.next30DaysPriorities.map((priority, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-950/60 border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                  >
                    <span className="text-xs text-slate-200 leading-snug flex-1 font-medium">
                      {priority}
                    </span>
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                      <button
                        onClick={() => handlePromoteToAction(priority)}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[10px] transition-colors"
                        title="Add to Smart Actions"
                      >
                        + Action
                      </button>
                      <button
                        onClick={() => handlePromoteToGoal(priority)}
                        className="px-2 py-1 rounded bg-purple-600/80 hover:bg-purple-500 text-white font-medium text-[10px] transition-colors"
                        title="Add to Goal Center"
                      >
                        + Goal
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Deep Questions for Future Self */}
          <div className="p-6 rounded-2xl bg-slate-900/70 border border-white/5">
            <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-4">
              <HelpCircle className="w-4 h-4" />
              Questions Your Future Self Should Answer
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {projections.futureSelfQuestions.map((q, i) => (
                <div
                  key={i}
                  className="p-4 rounded-xl bg-slate-950/70 border border-amber-500/20 text-xs text-slate-300 italic leading-relaxed"
                >
                  "{q}"
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="py-16 text-center text-slate-500">
          <p>No projections available. Complete a few journal entries to unlock Future Me synthesis.</p>
        </div>
      )}
    </div>
  );
};
