import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { GeminiAvatar } from './GeminiAvatar';
import { Conversation, AskJournalResponse } from '../types';
import { getConversations } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import {
  Sparkles,
  Search,
  BookOpen,
  Calendar,
  Layers,
  ArrowRight,
  ShieldCheck,
  RotateCw,
  Tag,
  AlertCircle,
} from 'lucide-react';

interface AskMyJournalViewProps {
  onOpenConversation: (id: string) => void;
  onStartNewJournal: () => void;
}

export const AskMyJournalView: React.FC<AskMyJournalViewProps> = ({
  onOpenConversation,
  onStartNewJournal,
}) => {
  const { currentUser, getIdToken } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [question, setQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [response, setResponse] = useState<AskJournalResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const suggestedQuestions = [
    'What have I been thinking about recently?',
    'What goals have I mentioned multiple times?',
    'What ideas keep coming back in my entries?',
    'What decisions have I been struggling with?',
    'What progress have I made?',
    'Summarize my main thought patterns.',
  ];

  useEffect(() => {
    if (!currentUser) return;
    const fetchUserJournals = async () => {
      try {
        const list = await getConversations(currentUser.uid);
        setConversations(list);
      } catch (err) {
        console.error('Error loading journals for Ask My Journal:', err);
      }
    };
    fetchUserJournals();
  }, [currentUser]);

  const handleAsk = async (queryText?: string) => {
    const textToAsk = (queryText || question).trim();
    if (!textToAsk || !currentUser) return;

    setQuestion(textToAsk);
    setIsLoading(true);
    setError(null);
    setResponse(null);

    try {
      const token = await getIdToken();
      if (!token) throw new Error('Authentication token unavailable.');

      const journalPayload = conversations
        .filter((c) => c.summary || c.title)
        .map((c) => ({
          id: c.id,
          title: c.title,
          summary: c.summary || '',
          themes: c.themes || [],
          goals: c.goals || [],
          openQuestions: c.openQuestions || [],
          date: new Date(c.createdAt).toISOString().split('T')[0],
        }));

      const res = await fetch('/api/journal/ask', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          question: textToAsk,
          journals: journalPayload,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to query your journal.');
      }

      const data: AskJournalResponse = await res.json();
      setResponse(data);
    } catch (err) {
      setError((err as Error).message || 'Unable to analyze journal at this moment.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8" id="ask-my-journal-view">
      {/* Header Banner */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-stone-900/60 border border-stone-800 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-cyan-500/10 via-indigo-500/5 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Semantic Journal Intelligence</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-100">
              Ask My Journal
            </h1>
            <p className="text-stone-400 text-sm max-w-xl leading-relaxed">
              Explore your personal thinking history. Gemini synthesizes patterns, recurring themes, and decisions exclusively from your private authenticated journal entries.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <GeminiAvatar
              state={isLoading ? 'thinking' : 'idle'}
              size="lg"
              showStatusBadge={false}
              pulseGlow={true}
            />
          </div>
        </div>

        {/* Live Privacy Guarantee */}
        <div className="mt-6 pt-4 border-t border-stone-800/80 flex flex-wrap items-center gap-4 text-xs font-mono text-stone-400">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Strict User UID Isolation Active</span>
          </div>
          <span className="text-stone-600">•</span>
          <span>Indexed Entries: {conversations.length}</span>
          <span className="text-stone-600">•</span>
          <span>Zero external model training</span>
        </div>
      </div>

      {/* Query Search Bar */}
      <div className="p-4 sm:p-6 rounded-2xl bg-stone-900/80 border border-stone-800 shadow-lg space-y-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleAsk();
          }}
          className="relative flex items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-500" />
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Ask anything about your past thoughts, goals, or recurring ideas..."
              className="w-full pl-12 pr-4 py-3.5 rounded-xl bg-stone-950 border border-stone-800 focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 text-stone-100 placeholder-stone-500 text-sm outline-none transition-all shadow-inner"
              id="ask-journal-input"
            />
          </div>

          <button
            type="submit"
            disabled={!question.trim() || isLoading}
            className="px-5 py-3.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-semibold text-sm transition-all shadow-md shadow-cyan-500/20 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-2"
            id="ask-journal-submit-btn"
          >
            {isLoading ? (
              <>
                <RotateCw className="w-4 h-4 animate-spin" />
                <span className="hidden sm:inline">Synthesizing...</span>
              </>
            ) : (
              <>
                <span>Ask</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        {/* Suggested Queries Chips */}
        <div>
          <div className="text-xs font-mono text-stone-500 uppercase tracking-wider mb-2">
            Suggested Reflections:
          </div>
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleAsk(q)}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-lg bg-stone-950/80 hover:bg-cyan-950/40 border border-stone-800 hover:border-cyan-500/30 text-xs text-stone-300 hover:text-cyan-300 transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Answer Stage */}
      {response && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 sm:p-8 rounded-3xl bg-stone-900/90 border border-cyan-500/30 shadow-2xl space-y-6"
        >
          {/* Answer Header with Verification Badge */}
          <div className="flex items-center justify-between border-b border-stone-800 pb-4">
            <div className="flex items-center gap-2.5">
              <GeminiAvatar state="speaking" size="sm" pulseGlow={false} />
              <span className="font-semibold text-stone-200 text-sm">Gemini Journal Synthesis</span>
            </div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/40 text-[11px] font-mono text-cyan-300">
              <Sparkles className="w-3 h-3 text-cyan-400" />
              <span>Based on your journal history</span>
            </div>
          </div>

          {/* Main Synthesized Text */}
          <div className="prose prose-invert max-w-none text-stone-200 text-sm sm:text-base leading-relaxed whitespace-pre-line">
            {response.answer}
          </div>

          {/* Observed Patterns */}
          {response.detectedPatterns && response.detectedPatterns.length > 0 && (
            <div className="p-4 rounded-2xl bg-stone-950/60 border border-stone-800/80 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-indigo-400">
                <Layers className="w-4 h-4" />
                <span>Observed Thought Patterns</span>
              </div>
              <ul className="space-y-1.5 text-xs text-stone-300">
                {response.detectedPatterns.map((pat, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-cyan-400">•</span>
                    <span>{pat}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Cited Journal Entries */}
          {response.citedEntries && response.citedEntries.length > 0 && (
            <div className="space-y-3 pt-2">
              <div className="text-xs font-mono uppercase tracking-wider text-stone-400 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-cyan-400" />
                <span>Referenced Private Entries</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {response.citedEntries.map((entry) => (
                  <button
                    key={entry.id}
                    onClick={() => onOpenConversation(entry.id)}
                    className="p-3.5 rounded-xl bg-stone-950/80 hover:bg-stone-800/80 border border-stone-800/90 hover:border-cyan-500/40 text-left transition-all group flex flex-col justify-between"
                  >
                    <div className="font-medium text-stone-200 text-xs group-hover:text-cyan-300 transition-colors line-clamp-1">
                      {entry.title}
                    </div>
                    {entry.date && (
                      <div className="text-[11px] font-mono text-stone-500 mt-2 flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        <span>{entry.date}</span>
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Suggested Follow-up Actions */}
          {response.suggestedFollowUps && response.suggestedFollowUps.length > 0 && (
            <div className="pt-2 border-t border-stone-800 flex flex-wrap items-center gap-2">
              <span className="text-xs font-mono text-stone-500">Explore further:</span>
              {response.suggestedFollowUps.map((fu, idx) => (
                <button
                  key={idx}
                  onClick={() => handleAsk(fu)}
                  className="px-3 py-1 rounded-lg bg-stone-950 border border-stone-800 hover:border-indigo-500/40 text-xs text-stone-300 hover:text-indigo-300 transition-colors"
                >
                  "{fu}"
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}

      {/* Empty State / Prompt if no entries */}
      {conversations.length === 0 && (
        <div className="p-8 rounded-3xl bg-stone-900/40 border border-stone-800 text-center space-y-4">
          <BookOpen className="w-10 h-10 text-stone-600 mx-auto" />
          <h3 className="text-base font-semibold text-stone-200">No Journal Entries Recorded Yet</h3>
          <p className="text-sm text-stone-400 max-w-md mx-auto">
            Once you have completed and saved your first thinking session with Gemini, this space will discover connections and answer questions across your thoughts.
          </p>
          <button
            onClick={onStartNewJournal}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 text-stone-950 font-semibold text-sm hover:bg-cyan-400 transition-colors inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Start Your First Journal</span>
          </button>
        </div>
      )}
    </div>
  );
};
