import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Conversation, Insight } from '../types';
import {
  getConversations,
  getInsights,
  saveInsights,
  deleteInsight,
} from '../services/firestoreService';
import { requestPersonalInsights } from '../services/api';
import { GeminiAvatar } from './GeminiAvatar';
import {
  Compass,
  Sparkles,
  Calendar,
  Clock,
  Target,
  HelpCircle,
  Tag,
  ArrowRight,
  Trash2,
  Loader2,
  ShieldCheck,
  Lightbulb,
} from 'lucide-react';

interface PersonalInsightsViewProps {
  onStartReflectionConversation: (initialPrompt: string) => void;
  onOpenJournalDetail: (id: string) => void;
}

export const PersonalInsightsView: React.FC<PersonalInsightsViewProps> = ({
  onStartReflectionConversation,
  onOpenJournalDetail,
}) => {
  const { currentUser, getIdToken } = useAuth();
  const [journals, setJournals] = useState<Conversation[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'recurring' | 'reflections'>('timeline');

  useEffect(() => {
    if (!currentUser) return;
    loadData();
  }, [currentUser]);

  const loadData = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const [convList, insightList] = await Promise.all([
        getConversations(currentUser.uid),
        getInsights(currentUser.uid),
      ]);
      setJournals(convList.filter((c) => c.summary && c.summary.trim().length > 0));
      setInsights(insightList);
    } catch (err) {
      console.error('[LOAD_INSIGHTS_ERROR]', err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInsights = async () => {
    if (!currentUser || journals.length === 0) return;
    setGenerating(true);

    try {
      const token = await getIdToken();
      if (!token) throw new Error('Authentication expired.');

      const inputJournals = journals.map((j) => ({
        title: j.title,
        summary: j.summary || '',
        themes: j.themes || [],
        goals: j.goals || [],
        openQuestions: j.openQuestions || [],
        date: new Date(j.createdAt).toLocaleDateString(),
      }));

      const newGenerated = await requestPersonalInsights(token, inputJournals);

      // Save insights to user's Firestore collection
      const saved = await saveInsights(currentUser.uid, newGenerated);
      setInsights((prev) => [...saved, ...prev]);
    } catch (err) {
      console.error('[GENERATE_INSIGHTS_ERROR]', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleDeleteInsight = async (id: string) => {
    if (!currentUser) return;
    try {
      await deleteInsight(currentUser.uid, id);
      setInsights((prev) => prev.filter((i) => i.id !== id));
    } catch (err) {
      console.error('[DELETE_INSIGHT_ERROR]', err);
    }
  };

  // Compile timeline items from actual journal entries
  const sortedJournals = [...journals].sort((a, b) => a.createdAt - b.createdAt);

  const recurringThemeInsights = insights.filter(
    (i) => i.type === 'recurring_theme' || i.frequency
  );

  const reflectionInsights = insights.filter(
    (i) => i.type === 'reflection' || i.reflectionPrompt
  );

  const allGoals = Array.from(new Set(journals.flatMap((j) => j.goals || []))).filter(Boolean);
  const allQuestions = Array.from(new Set(journals.flatMap((j) => j.openQuestions || []))).filter(
    Boolean
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 text-[10px] font-mono border border-emerald-500/30">
            <Compass className="w-3 h-3" />
            <span>AI Pattern Synthesizer</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-100">
            Personal Insight Timeline
          </h1>
          <p className="text-xs sm:text-sm text-stone-400">
            Synthesizes patterns, recurring topics, and goal progression across your private thinking history.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleGenerateInsights}
            disabled={generating || journals.length === 0}
            className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-stone-950 text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 disabled:opacity-40 shadow-md shadow-cyan-500/20"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-stone-950" />
                <span>Analyzing Patterns...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Analyze Thinking History</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Strict Privacy Assurance Box */}
      <div className="p-4 rounded-2xl bg-stone-900/80 border border-emerald-500/30 text-xs text-stone-300 flex items-center gap-3 font-mono">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
        <div>
          <span className="font-semibold text-emerald-400">Strict User Isolation:</span> Insights are derived exclusively from your own journal summaries. Your entries are never merged into global collections or shared across users.
        </div>
      </div>

      {/* View Tabs */}
      <div className="flex items-center gap-2 border-b border-stone-800 pb-2">
        <button
          onClick={() => setActiveTab('timeline')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
            activeTab === 'timeline'
              ? 'bg-stone-800 text-cyan-300 border border-stone-700'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
          }`}
        >
          Thinking Timeline ({journals.length})
        </button>

        <button
          onClick={() => setActiveTab('recurring')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
            activeTab === 'recurring'
              ? 'bg-stone-800 text-cyan-300 border border-stone-700'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
          }`}
        >
          Recurring Themes ({recurringThemeInsights.length})
        </button>

        <button
          onClick={() => setActiveTab('reflections')}
          className={`px-3 py-1.5 rounded-xl text-xs font-medium transition-colors ${
            activeTab === 'reflections'
              ? 'bg-stone-800 text-cyan-300 border border-stone-700'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
          }`}
        >
          Suggested Reflections ({reflectionInsights.length})
        </button>
      </div>

      {/* Tab 1: Chronological Thinking Timeline */}
      {activeTab === 'timeline' && (
        <div className="space-y-6">
          {sortedJournals.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-stone-900/60 border border-stone-800 space-y-3">
              <Clock className="w-10 h-10 text-stone-600 mx-auto" />
              <h3 className="text-base font-semibold text-stone-200">
                Timeline begins with your first journal entry
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Save conversations with Gemini to construct your chronological thinking timeline and observe how your ideas evolve.
              </p>
            </div>
          ) : (
            <div className="relative pl-6 sm:pl-8 border-l-2 border-stone-800 space-y-8 my-4">
              {sortedJournals.map((entry) => (
                <div key={entry.id} className="relative group">
                  <div className="absolute -left-[31px] sm:-left-[39px] top-2 w-4 h-4 rounded-full bg-cyan-500 border-4 border-stone-950 transition-transform group-hover:scale-125" />

                  <div
                    onClick={() => onOpenJournalDetail(entry.id)}
                    className="p-5 rounded-3xl bg-stone-900/80 border border-stone-800 hover:border-cyan-500/40 transition-all cursor-pointer shadow-xl"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-2">
                      <h3 className="text-base font-semibold text-stone-100 group-hover:text-cyan-400 transition-colors">
                        {entry.title}
                      </h3>
                      <span className="text-xs font-mono text-stone-500 flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-stone-500" />
                        <span>
                          {new Date(entry.createdAt).toLocaleDateString(undefined, {
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric',
                          })}
                        </span>
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm text-stone-400 leading-relaxed line-clamp-2">
                      {entry.summary}
                    </p>

                    {/* Timeline Tags */}
                    <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-stone-800">
                      {entry.themes?.map((t, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded-md bg-stone-950 border border-stone-800 text-[11px] font-mono text-cyan-300"
                        >
                          {t}
                        </span>
                      ))}
                      {entry.goals && entry.goals.length > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-indigo-950 border border-indigo-800/60 text-[11px] font-mono text-indigo-300">
                          {entry.goals[0]}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Recurring Themes Section */}
      {activeTab === 'recurring' && (
        <div className="space-y-4">
          {recurringThemeInsights.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-stone-900/60 border border-stone-800 space-y-3">
              <Tag className="w-10 h-10 text-stone-600 mx-auto" />
              <h3 className="text-base font-semibold text-stone-200">
                No recurring themes identified yet
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Click "Analyze Thinking History" above once you have recorded multiple journal entries to detect recurring topics.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {recurringThemeInsights.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-3xl bg-stone-900/80 border border-stone-800 flex flex-col justify-between shadow-xl"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-[10px] uppercase font-mono tracking-wider text-cyan-400">
                      <span>Recurring Focus</span>
                      {item.frequency && (
                        <span className="px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 font-semibold">
                          Appeared in {item.frequency} entries
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-stone-100">
                      {item.title}
                    </h3>
                    <p className="text-xs text-stone-400 leading-relaxed">
                      {item.description}
                    </p>

                    {item.reflectionPrompt && (
                      <div className="mt-3 p-3 rounded-2xl bg-stone-950 border border-cyan-500/30 text-xs text-stone-300">
                        <p className="font-semibold text-cyan-300 mb-1 flex items-center gap-1.5">
                          <Lightbulb className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Reflection Prompt</span>
                        </p>
                        <p className="italic">"{item.reflectionPrompt}"</p>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-stone-800 flex items-center justify-between">
                    {item.reflectionPrompt ? (
                      <button
                        onClick={() =>
                          onStartReflectionConversation(
                            `I'd like to reflect on my recurring theme "${item.title}". Specifically: ${item.reflectionPrompt}`
                          )
                        }
                        className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                      >
                        <span>Reflect on this with Gemini</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    ) : (
                      <span />
                    )}

                    <button
                      onClick={() => handleDeleteInsight(item.id)}
                      className="p-1 text-stone-500 hover:text-rose-400 transition-colors"
                      title="Delete Insight"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Suggested Reflections */}
      {activeTab === 'reflections' && (
        <div className="space-y-4">
          {reflectionInsights.length === 0 ? (
            <div className="p-12 text-center rounded-3xl bg-stone-900/60 border border-stone-800 space-y-3">
              <Sparkles className="w-10 h-10 text-stone-600 mx-auto" />
              <h3 className="text-base font-semibold text-stone-200">
                No reflection prompts generated yet
              </h3>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Gemini generates gentle reflection questions based on your recurring open questions and goals.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {reflectionInsights.map((item) => (
                <div
                  key={item.id}
                  className="p-5 rounded-3xl bg-stone-900/80 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-xl"
                >
                  <div className="space-y-1 max-w-2xl">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-amber-400">
                      Observation
                    </span>
                    <h3 className="text-base font-bold text-stone-100">
                      {item.title}
                    </h3>
                    <p className="text-xs text-stone-400 leading-relaxed">
                      {item.description}
                    </p>
                    {item.reflectionPrompt && (
                      <p className="text-xs italic text-stone-300 pt-1">
                        "{item.reflectionPrompt}"
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() =>
                        onStartReflectionConversation(
                          `I want to reflect on this insight: "${item.title}". ${item.reflectionPrompt || item.description}`
                        )
                      }
                      className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-stone-950 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Start Reflection</span>
                    </button>

                    <button
                      onClick={() => handleDeleteInsight(item.id)}
                      className="p-2 text-stone-500 hover:text-rose-400 transition-colors"
                      title="Delete Insight"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Global Goals & Questions Summary Strip */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-stone-800">
        <div className="p-5 rounded-3xl bg-stone-900/80 border border-stone-800 space-y-3 shadow-xl">
          <h3 className="text-sm font-bold text-stone-200 flex items-center gap-2">
            <Target className="w-4 h-4 text-indigo-400" />
            <span>Cumulative Goals Tracked ({allGoals.length})</span>
          </h3>
          {allGoals.length === 0 ? (
            <p className="text-xs text-stone-500">No goals recorded yet.</p>
          ) : (
            <ul className="space-y-1.5 text-xs text-stone-300">
              {allGoals.slice(0, 5).map((goal, idx) => (
                <li key={idx} className="flex items-start gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0 mt-1.5" />
                  <span>{goal}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="p-5 rounded-3xl bg-stone-900/80 border border-stone-800 space-y-3 shadow-xl">
          <h3 className="text-sm font-bold text-stone-200 flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-amber-400" />
            <span>Recurring Open Questions ({allQuestions.length})</span>
          </h3>
          {allQuestions.length === 0 ? (
            <p className="text-xs text-stone-500">No open questions noted yet.</p>
          ) : (
            <ul className="space-y-1.5 text-xs text-stone-300 italic">
              {allQuestions.slice(0, 4).map((q, idx) => (
                <li key={idx}>"{q}"</li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
};
