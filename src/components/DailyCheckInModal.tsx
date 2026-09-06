import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles,
  Sun,
  Compass,
  Lightbulb,
  Trash2,
  Target,
  ArrowRight,
  Mic,
  BookOpen,
  RefreshCw,
  HelpCircle,
} from 'lucide-react';
import { DailyCheckInResult } from '../types';
import { requestDailyCheckIn } from '../services/api';

interface DailyCheckInModalProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
  recentThemes?: string[];
  activeGoals?: string[];
  onStartJournal: (initialPrompt: string) => void;
  onStartVoice: (initialPrompt: string) => void;
}

export const DailyCheckInModal: React.FC<DailyCheckInModalProps> = ({
  isOpen,
  onClose,
  token,
  recentThemes = [],
  activeGoals = [],
  onStartJournal,
  onStartVoice,
}) => {
  const [selectedApproach, setSelectedApproach] = useState<string>('Reflect');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DailyCheckInResult | null>(null);

  const approaches = [
    {
      id: 'Reflect',
      label: 'Reflect',
      desc: 'Gentle check-in on feelings and headspace',
      icon: Sun,
      color: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
    },
    {
      id: 'Plan',
      label: 'Plan',
      desc: 'Clarify top priorities and avoid overwhelm',
      icon: Compass,
      color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
    },
    {
      id: 'Brainstorm',
      label: 'Brainstorm',
      desc: 'Creative ideation and expansive thinking',
      icon: Lightbulb,
      color: 'text-purple-400 bg-purple-500/10 border-purple-500/30',
    },
    {
      id: 'Unload',
      label: 'Unload',
      desc: 'Clear mental clutter and reset',
      icon: Trash2,
      color: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
    },
    {
      id: 'Set Goals',
      label: 'Set Goals',
      desc: 'Lock in progress and accountable targets',
      icon: Target,
      color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30',
    },
  ];

  const handleFetchCheckIn = async (approach: string) => {
    setSelectedApproach(approach);
    try {
      setLoading(true);
      const data = await requestDailyCheckIn(token, {
        approach,
        recentThemes: recentThemes.slice(0, 4),
        activeGoals: activeGoals.slice(0, 4),
      });
      setResult(data);
    } catch (err) {
      console.error('Check-in error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-xl rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <h3 className="text-base font-bold text-white">Daily AI Check-In</h3>
          </div>
          <button onClick={onClose} className="text-xs text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        {/* Approach Selector */}
        <div>
          <p className="text-xs font-semibold text-slate-300 mb-2.5">
            How would you like to approach your mind right now?
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
            {approaches.map((appr) => {
              const Icon = appr.icon;
              const isSelected = selectedApproach === appr.id;

              return (
                <button
                  key={appr.id}
                  onClick={() => handleFetchCheckIn(appr.id)}
                  className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                    isSelected
                      ? `${appr.color} shadow-lg shadow-cyan-500/10`
                      : 'bg-slate-950/60 border-white/5 hover:border-white/20 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <Icon className="w-3.5 h-3.5" />
                    <span className="text-xs font-bold">{appr.label}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 line-clamp-1">{appr.desc}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Loading / Result Area */}
        {loading ? (
          <div className="py-10 flex flex-col items-center justify-center text-slate-500">
            <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mb-2" />
            <p className="text-xs text-slate-400">Crafting personalized {selectedApproach} prompt...</p>
          </div>
        ) : result ? (
          <div className="space-y-4 pt-2 border-t border-white/5">
            <div className="p-3.5 rounded-xl bg-slate-950/70 border border-white/5">
              <p className="text-xs text-slate-400 font-semibold mb-1 uppercase tracking-wider">
                Thinking Prompt:
              </p>
              <p className="text-sm text-slate-100 font-medium leading-relaxed">
                "{result.starterPrompt}"
              </p>
            </div>

            {result.suggestedQuestions && result.suggestedQuestions.length > 0 && (
              <div>
                <p className="text-[11px] text-slate-400 font-semibold mb-1 flex items-center gap-1">
                  <HelpCircle className="w-3 h-3 text-cyan-400" />
                  Guiding Questions:
                </p>
                <ul className="space-y-1 text-xs text-slate-300">
                  {result.suggestedQuestions.map((q, idx) => (
                    <li key={idx} className="flex items-start gap-1.5">
                      <span className="text-cyan-400">•</span>
                      <span>{q}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {result.affirmation && (
              <p className="text-xs text-cyan-300 italic bg-cyan-950/30 border border-cyan-500/20 p-2.5 rounded-xl">
                ✦ {result.affirmation}
              </p>
            )}

            {/* Launch Options */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
              <button
                onClick={() => {
                  onClose();
                  onStartVoice(result.starterPrompt);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs flex items-center gap-1.5 transition-colors"
              >
                <Mic className="w-3.5 h-3.5 text-cyan-400" />
                Speak with Voice Agent
              </button>

              <button
                onClick={() => {
                  onClose();
                  onStartJournal(result.starterPrompt);
                }}
                className="px-3.5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-lg shadow-cyan-500/20"
              >
                <BookOpen className="w-3.5 h-3.5" />
                Start Journal Session
              </button>
            </div>
          </div>
        ) : (
          <div className="text-center py-6">
            <button
              onClick={() => handleFetchCheckIn('Reflect')}
              className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs"
            >
              Generate Daily Prompt
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
};
