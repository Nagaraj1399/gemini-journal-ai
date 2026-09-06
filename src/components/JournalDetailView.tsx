import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Conversation, Message } from '../types';
import { getConversation, getMessages, deleteConversation, saveGoal } from '../services/firestoreService';
import { SafeMarkdown } from './SafeMarkdown';
import { GeminiAvatar } from './GeminiAvatar';
import {
  ArrowLeft,
  Calendar,
  Tag,
  Target,
  HelpCircle,
  MessageSquare,
  Sparkles,
  Trash2,
  Compass,
  CheckCircle2,
  Plus,
} from 'lucide-react';

interface JournalDetailViewProps {
  journalId: string;
  onBack: () => void;
  onContinueConversation: (id: string) => void;
  onNavigateToInsights: () => void;
}

export const JournalDetailView: React.FC<JournalDetailViewProps> = ({
  journalId,
  onBack,
  onContinueConversation,
  onNavigateToInsights,
}) => {
  const { currentUser } = useAuth();
  const [journal, setJournal] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [addedGoals, setAddedGoals] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!currentUser || !journalId) return;

    async function loadDetail() {
      setLoading(true);
      try {
        const [j, msgList] = await Promise.all([
          getConversation(currentUser.uid, journalId),
          getMessages(currentUser.uid, journalId),
        ]);
        setJournal(j);
        setMessages(msgList);
      } catch (err) {
        console.error('[LOAD_DETAIL_ERROR]', err);
      } finally {
        setLoading(false);
      }
    }

    loadDetail();
  }, [currentUser, journalId]);

  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const confirmDelete = async () => {
    if (!currentUser || !journalId) return;
    try {
      setDeleting(true);
      await deleteConversation(currentUser.uid, journalId);
      setShowDeleteModal(false);
      onBack();
    } catch (err) {
      console.error('[DELETE_DETAIL_ERROR]', err);
    } finally {
      setDeleting(false);
    }
  };

  const handleAddGoalToPlanner = async (goalText: string) => {
    if (!currentUser) return;
    try {
      await saveGoal(currentUser.uid, {
        title: goalText,
        category: 'Personal Growth',
        sourceJournalId: journalId,
        status: 'Not Started',
        progress: 0,
        tasks: [{ id: `t-${Date.now()}`, title: 'Begin first step', completed: false }],
      });
      setAddedGoals((prev) => ({ ...prev, [goalText]: true }));
    } catch (e) {
      console.error('Failed to add goal:', e);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center text-xs text-stone-500 font-mono">
        Retrieving encrypted journal entry...
      </div>
    );
  }

  if (!journal) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-12 text-center space-y-4">
        <p className="text-sm text-stone-400">Journal entry not found.</p>
        <button
          onClick={onBack}
          className="px-4 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-200 text-xs font-medium"
        >
          Return to History
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
      {/* Top Navigation & Action Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-xs font-mono text-stone-400 hover:text-cyan-400 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Journal Archive</span>
        </button>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onContinueConversation(journal.id)}
            className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-stone-950 text-xs font-semibold transition-all flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Continue Thinking Session</span>
          </button>

          <button
            onClick={onNavigateToInsights}
            className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 text-stone-200 text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <Compass className="w-3.5 h-3.5 text-emerald-400" />
            <span>Personal Insights</span>
          </button>

          <button
            onClick={() => setShowDeleteModal(true)}
            disabled={deleting}
            className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-rose-950/40 border border-rose-900/40 text-rose-400 text-xs font-medium transition-colors flex items-center gap-1.5"
            title="Delete Journal"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Delete</span>
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="bg-stone-950 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl border border-stone-800">
            <h3 className="text-base font-bold text-stone-100">Delete Journal Entry</h3>
            <p className="text-xs text-stone-400 leading-relaxed">
              Are you sure you want to permanently delete this journal entry and its full conversation transcript? This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="px-4 py-2 rounded-xl text-xs text-stone-400 hover:text-stone-200"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white"
              >
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Journal Article Content */}
      <article className="space-y-6">
        <div>
          <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-stone-100 leading-tight">
            {journal.title}
          </h1>
          <div className="flex items-center gap-2 mt-2 text-xs font-mono text-stone-500">
            <Calendar className="w-3.5 h-3.5 text-stone-400" />
            <span>
              {new Date(journal.createdAt).toLocaleDateString(undefined, {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
          </div>
        </div>

        {/* Structured Summary Card */}
        {journal.summary && (
          <div className="p-6 rounded-3xl bg-stone-900/80 border border-cyan-500/30 space-y-4 shadow-xl">
            <h2 className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>Structured Gemini Reflection</span>
            </h2>
            <p className="text-stone-200 text-sm sm:text-base leading-relaxed">
              {journal.summary}
            </p>

            {/* Themes, Goals, Open Questions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-4 border-t border-stone-800">
              {/* Themes */}
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 flex items-center gap-1 mb-2">
                  <Tag className="w-3 h-3 text-cyan-400" />
                  <span>Themes</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {journal.themes && journal.themes.length > 0 ? (
                    journal.themes.map((t, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-0.5 rounded-lg bg-stone-950 border border-stone-800 text-xs font-mono text-stone-300"
                      >
                        {t}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-stone-500">No themes tagged</span>
                  )}
                </div>
              </div>

              {/* Goals */}
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 flex items-center gap-1 mb-2">
                  <Target className="w-3 h-3 text-indigo-400" />
                  <span>Goals / Next Steps</span>
                </span>
                {journal.goals && journal.goals.length > 0 ? (
                  <ul className="space-y-2 text-xs text-stone-300">
                    {journal.goals.map((g, i) => (
                      <li key={i} className="flex items-start justify-between gap-1.5">
                        <div className="flex items-start gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                          <span>{g}</span>
                        </div>
                        {addedGoals[g] ? (
                          <span className="text-[10px] font-mono text-emerald-400">Added</span>
                        ) : (
                          <button
                            onClick={() => handleAddGoalToPlanner(g)}
                            className="text-[10px] font-mono text-cyan-400 hover:underline shrink-0"
                            title="Add to Goal Center"
                          >
                            + Plan
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-xs text-stone-500">No goals extracted</span>
                )}
              </div>

              {/* Open Questions */}
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 flex items-center gap-1 mb-2">
                  <HelpCircle className="w-3 h-3 text-amber-400" />
                  <span>Open Questions</span>
                </span>
                {journal.openQuestions && journal.openQuestions.length > 0 ? (
                  <ul className="space-y-1.5 text-xs text-stone-300 italic">
                    {journal.openQuestions.map((q, i) => (
                      <li key={i}>"{q}"</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-xs text-stone-500">None</span>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Conversation Transcript Section */}
        <div className="space-y-4 pt-4 border-t border-stone-800">
          <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-stone-400">
            <MessageSquare className="w-4 h-4 text-stone-500" />
            <span>Full Thinking Transcript ({messages.length} messages)</span>
          </div>

          <div className="space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`p-4 rounded-2xl ${
                  m.role === 'user'
                    ? 'bg-stone-900 border border-stone-800 ml-8 text-stone-200'
                    : 'bg-stone-950 border border-stone-800/80 mr-8 text-stone-300'
                }`}
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-stone-500 mb-2">
                  <span>{m.role === 'user' ? 'You' : 'Gemini Thinking Partner'}</span>
                  <span>{new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
                <div className="text-xs sm:text-sm leading-relaxed">
                  {m.role === 'user' ? (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  ) : (
                    <SafeMarkdown content={m.content} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </article>
    </div>
  );
};
