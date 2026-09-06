import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { WeeklyReflection, Conversation } from '../types';
import {
  getWeeklyReflections,
  saveWeeklyReflection,
  deleteWeeklyReflection,
  getConversations,
} from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import { GeminiAvatar } from './GeminiAvatar';
import {
  CalendarDays,
  Sparkles,
  CheckCircle2,
  Clock,
  HelpCircle,
  TrendingUp,
  RotateCw,
  ArrowRight,
  ShieldCheck,
  Trash2,
  BookOpen,
  ChevronRight,
} from 'lucide-react';

export const WeeklyReflectionView: React.FC = () => {
  const { currentUser, getIdToken } = useAuth();
  const [reflections, setReflections] = useState<WeeklyReflection[]>([]);
  const [selectedReflection, setSelectedReflection] = useState<WeeklyReflection | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;
    try {
      const [savedReflections, userConversations] = await Promise.all([
        getWeeklyReflections(currentUser.uid),
        getConversations(currentUser.uid),
      ]);
      setReflections(savedReflections);
      setConversations(userConversations);
      if (savedReflections.length > 0 && !selectedReflection) {
        setSelectedReflection(savedReflections[0]);
      }
    } catch (err) {
      console.error('Error loading weekly reflections:', err);
    }
  };

  const handleGenerateWeekly = async () => {
    if (!currentUser) return;
    setIsGenerating(true);
    setStatusMessage(null);

    const now = new Date();
    const weekLabel = `Week of ${now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;

    try {
      const token = await getIdToken();
      const journalPayload = conversations
        .filter((c) => c.summary || c.title)
        .slice(0, 15)
        .map((c) => ({
          title: c.title,
          summary: c.summary || '',
          themes: c.themes || [],
          goals: c.goals || [],
          openQuestions: c.openQuestions || [],
          date: new Date(c.createdAt).toISOString().split('T')[0],
        }));

      const res = await fetch('/api/journal/weekly-reflection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          weekLabel,
          journals: journalPayload,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate weekly review from Gemini.');
      const data = await res.json();

      const saved = await saveWeeklyReflection(currentUser.uid, {
        weekLabel: data.weekLabel || weekLabel,
        focusAreas: data.focusAreas || [],
        accomplishments: data.accomplishments || [],
        unfinishedItems: data.unfinishedItems || [],
        recurringThemes: data.recurringThemes || [],
        openQuestions: data.openQuestions || [],
        goalsNeedingAttention: data.goalsNeedingAttention || [],
        suggestedNextSteps: data.suggestedNextSteps || [],
        startNextWeekWith: data.startNextWeekWith || '',
      });

      setReflections((prev) => [saved, ...prev]);
      setSelectedReflection(saved);
      setStatusMessage('Weekly reflection synthesized and saved to your private journal vault.');
    } catch (err) {
      setStatusMessage((err as Error).message || 'Error generating review.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!currentUser) return;
    try {
      await deleteWeeklyReflection(currentUser.uid, id);
      setReflections((prev) => prev.filter((r) => r.id !== id));
      if (selectedReflection?.id === id) {
        setSelectedReflection(reflections.find((r) => r.id !== id) || null);
      }
    } catch (err) {
      console.error('Error deleting weekly reflection:', err);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8" id="weekly-reflection-view">
      {/* Hero Header */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-stone-900/60 border border-stone-800 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-xs font-mono uppercase tracking-wider">
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Weekly AI Reflection</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-100">
              Weekly Thinking Review
            </h1>
            <p className="text-stone-400 text-sm max-w-xl leading-relaxed">
              Synthesize your focus, milestones accomplished, unfinished challenges, and recurring questions across the past week. Grounded exclusively in your private journal entries.
            </p>
          </div>

          <button
            onClick={handleGenerateWeekly}
            disabled={isGenerating}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-semibold text-sm transition-all shadow-lg shadow-indigo-600/25 flex items-center gap-2 disabled:opacity-50"
            id="generate-weekly-review-btn"
          >
            {isGenerating ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span>Synthesizing Week...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Generate Weekly Review</span>
              </>
            )}
          </button>
        </div>

        {statusMessage && (
          <div className="mt-4 p-3 rounded-xl bg-cyan-950/50 border border-cyan-800/60 text-cyan-300 text-xs font-mono">
            {statusMessage}
          </div>
        )}
      </div>

      {/* Main Layout: Past Weeks Sidebar + Detailed Review Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Past Weeks Archive Sidebar */}
        <div className="lg:col-span-1 space-y-3">
          <div className="text-xs font-mono text-stone-500 uppercase tracking-wider px-1">
            Archived Reviews ({reflections.length})
          </div>
          {reflections.length === 0 ? (
            <div className="p-4 rounded-2xl bg-stone-900/40 border border-stone-800 text-xs text-stone-500 text-center">
              No weekly reflections saved yet.
            </div>
          ) : (
            <div className="space-y-2">
              {reflections.map((r) => (
                <button
                  key={r.id}
                  onClick={() => setSelectedReflection(r)}
                  className={`w-full p-3.5 rounded-xl border text-left transition-all flex items-center justify-between group ${
                    selectedReflection?.id === r.id
                      ? 'bg-stone-800/90 border-cyan-500/50 text-cyan-300 shadow-md'
                      : 'bg-stone-900/60 border-stone-800/80 text-stone-300 hover:bg-stone-800/50'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="text-xs font-semibold">{r.weekLabel}</div>
                    <div className="text-[10px] font-mono text-stone-500">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-stone-600 group-hover:text-stone-300" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Detailed Review Card */}
        <div className="lg:col-span-3">
          {selectedReflection ? (
            <motion.div
              key={selectedReflection.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-6 sm:p-8 rounded-3xl bg-stone-900/90 border border-stone-800 shadow-2xl space-y-8"
            >
              {/* Review Title & Delete */}
              <div className="flex items-center justify-between border-b border-stone-800 pb-5">
                <div className="flex items-center gap-3">
                  <GeminiAvatar state="success" size="sm" pulseGlow={false} />
                  <div>
                    <h2 className="text-xl font-bold text-stone-100">{selectedReflection.weekLabel}</h2>
                    <span className="text-xs font-mono text-stone-400">
                      Private Reflection Synthesized on{' '}
                      {new Date(selectedReflection.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(selectedReflection.id)}
                  className="p-2 text-stone-500 hover:text-rose-400 rounded-lg hover:bg-stone-800 transition-colors"
                  title="Delete this weekly review"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Start Next Week With - Highlight Banner */}
              {selectedReflection.startNextWeekWith && (
                <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-950/60 to-cyan-950/60 border border-indigo-500/30 space-y-1.5 shadow-inner">
                  <div className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Start Next Week With</span>
                  </div>
                  <p className="text-sm font-medium text-stone-100 italic leading-relaxed">
                    "{selectedReflection.startNextWeekWith}"
                  </p>
                </div>
              )}

              {/* 2-Column Content Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Focus Areas */}
                <div className="space-y-3 p-4 rounded-2xl bg-stone-950/60 border border-stone-800/80">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-indigo-400 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    <span>What I Focused On</span>
                  </h3>
                  <ul className="space-y-1.5 text-xs text-stone-300">
                    {selectedReflection.focusAreas?.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-indigo-400">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Accomplishments */}
                <div className="space-y-3 p-4 rounded-2xl bg-stone-950/60 border border-stone-800/80">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>What I Accomplished</span>
                  </h3>
                  <ul className="space-y-1.5 text-xs text-stone-300">
                    {selectedReflection.accomplishments?.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-emerald-400">✓</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Unfinished Challenges */}
                <div className="space-y-3 p-4 rounded-2xl bg-stone-950/60 border border-stone-800/80">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-amber-400 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span>What Remains Unfinished</span>
                  </h3>
                  <ul className="space-y-1.5 text-xs text-stone-300">
                    {selectedReflection.unfinishedItems?.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-amber-400">○</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Open Questions */}
                <div className="space-y-3 p-4 rounded-2xl bg-stone-950/60 border border-stone-800/80">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    <span>Important Open Questions</span>
                  </h3>
                  <ul className="space-y-1.5 text-xs text-stone-300">
                    {selectedReflection.openQuestions?.map((item, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="text-cyan-400">?</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Suggested Next Steps */}
              {selectedReflection.suggestedNextSteps?.length > 0 && (
                <div className="space-y-2.5 p-4 rounded-2xl bg-stone-950/60 border border-stone-800/80">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-stone-400">
                    Suggested Next Steps
                  </h3>
                  <div className="space-y-1.5">
                    {selectedReflection.suggestedNextSteps.map((step, idx) => (
                      <div key={idx} className="flex items-center gap-2 text-xs text-stone-300">
                        <ArrowRight className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
                        <span>{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          ) : (
            <div className="p-12 rounded-3xl bg-stone-900/40 border border-stone-800 text-center space-y-4">
              <CalendarDays className="w-10 h-10 text-stone-600 mx-auto" />
              <h3 className="text-base font-semibold text-stone-200">No Weekly Review Selected</h3>
              <p className="text-xs text-stone-400 max-w-sm mx-auto">
                Generate your first weekly reflection review to synthesize your recent thoughts and set your trajectory for the upcoming week.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
