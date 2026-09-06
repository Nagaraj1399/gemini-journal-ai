import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Conversation } from '../types';
import { getConversations, deleteConversation } from '../services/firestoreService';
import {
  Search,
  BookOpen,
  Calendar,
  Tag,
  Target,
  Trash2,
  ArrowRight,
  Filter,
  PlusCircle,
  HelpCircle,
  Clock,
  Sparkles,
} from 'lucide-react';

interface JournalHistoryViewProps {
  onOpenJournalDetail: (id: string) => void;
  onStartNewJournal: () => void;
}

export const JournalHistoryView: React.FC<JournalHistoryViewProps> = ({
  onOpenJournalDetail,
  onStartNewJournal,
}) => {
  const { currentUser } = useAuth();
  const [journals, setJournals] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTheme, setSelectedTheme] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  const fetchJournals = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const all = await getConversations(currentUser.uid);
      setJournals(all);
    } catch (err) {
      console.error('[LOAD_JOURNALS_ERROR]', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJournals();
  }, [currentUser]);

  const handleDeletePrompt = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setEntryToDelete(id);
  };

  const confirmDelete = async () => {
    if (!currentUser || !entryToDelete) return;
    const id = entryToDelete;
    try {
      setDeletingId(id);
      await deleteConversation(currentUser.uid, id);
      setJournals((prev) => prev.filter((j) => j.id !== id));
      setEntryToDelete(null);
    } catch (err) {
      console.error('[DELETE_JOURNAL_ERROR]', err);
    } finally {
      setDeletingId(null);
    }
  };

  // Collect all unique themes
  const allThemes = Array.from(
    new Set(
      journals
        .flatMap((j) => j.themes || [])
        .map((t) => t.trim())
        .filter((t) => t.length > 0)
    )
  );

  // Filter journals based on search query and selected theme (strict user-scoped search)
  const filteredJournals = journals.filter((j) => {
    const matchesTheme = !selectedTheme || (j.themes && j.themes.includes(selectedTheme));
    if (!matchesTheme) return false;

    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const matchTitle = j.title?.toLowerCase().includes(q);
    const matchSummary = j.summary?.toLowerCase().includes(q);
    const matchThemes = j.themes?.some((t) => t.toLowerCase().includes(q));
    const matchGoals = j.goals?.some((g) => g.toLowerCase().includes(q));

    return matchTitle || matchSummary || matchThemes || matchGoals;
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-800">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-100">
            Journal Vault Archive
          </h1>
          <p className="text-xs sm:text-sm text-stone-400 mt-1">
            Browse, search, and revisit your private reflections and ideas.
          </p>
        </div>

        <button
          onClick={onStartNewJournal}
          className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-stone-950 text-xs sm:text-sm font-semibold transition-all flex items-center gap-2 self-start sm:self-auto shadow-md shadow-cyan-500/20"
        >
          <PlusCircle className="w-4 h-4" />
          <span>New Journal</span>
        </button>
      </div>

      {/* Search & Filter Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search your private journal archive by keyword, goal, or theme..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-xs sm:text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none focus:border-cyan-500"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-200"
            >
              Clear
            </button>
          )}
        </div>

        {allThemes.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <span className="text-xs text-stone-400 flex items-center gap-1 shrink-0">
              <Filter className="w-3.5 h-3.5" />
              <span>Theme:</span>
            </span>
            <button
              onClick={() => setSelectedTheme(null)}
              className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors ${
                selectedTheme === null
                  ? 'bg-cyan-500 text-stone-950 font-semibold'
                  : 'bg-stone-900 text-stone-300 hover:bg-stone-800'
              }`}
            >
              All
            </button>
            {allThemes.map((theme) => (
              <button
                key={theme}
                onClick={() => setSelectedTheme(selectedTheme === theme ? null : theme)}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium shrink-0 transition-colors ${
                  selectedTheme === theme
                    ? 'bg-cyan-500 text-stone-950 font-semibold'
                    : 'bg-stone-900 text-stone-300 hover:bg-stone-800'
                }`}
              >
                {theme}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Journal Cards List */}
      {loading ? (
        <div className="p-12 text-center text-xs text-stone-500">
          Loading your journal entries from secure Firestore vault...
        </div>
      ) : filteredJournals.length === 0 ? (
        <div className="p-12 rounded-3xl bg-stone-900/60 border border-stone-800 text-center space-y-3">
          <BookOpen className="w-10 h-10 text-stone-600 mx-auto" />
          <h3 className="text-base font-semibold text-stone-200">
            No journal entries match your query
          </h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            {searchQuery || selectedTheme
              ? 'Try adjusting your search terms or filters.'
              : 'You have not saved any journal entries yet. Start a conversation with Gemini to create one.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredJournals.map((journal) => (
            <div
              key={journal.id}
              onClick={() => onOpenJournalDetail(journal.id)}
              className="p-5 rounded-3xl bg-stone-900/80 border border-stone-800 hover:border-cyan-500/40 transition-all cursor-pointer flex flex-col justify-between group shadow-xl"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-semibold text-stone-100 group-hover:text-cyan-400 transition-colors line-clamp-1">
                    {journal.title}
                  </h3>
                  <button
                    onClick={(e) => handleDeletePrompt(e, journal.id)}
                    className="p-1 text-stone-600 hover:text-rose-400 transition-colors"
                    title="Delete journal"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {journal.summary && (
                  <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                    {journal.summary}
                  </p>
                )}

                {/* Themes Chips */}
                {journal.themes && journal.themes.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {journal.themes.slice(0, 3).map((t, i) => (
                      <span
                        key={i}
                        className="px-2 py-0.5 rounded-md bg-stone-950 border border-stone-800 text-[10px] font-mono text-cyan-300"
                      >
                        {t}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-4 mt-3 border-t border-stone-800/80 flex items-center justify-between text-[11px] font-mono text-stone-500">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" />
                  <span>{new Date(journal.createdAt).toLocaleDateString()}</span>
                </div>
                <span className="flex items-center gap-1 text-cyan-400 group-hover:translate-x-0.5 transition-transform">
                  View Entry <ArrowRight className="w-3 h-3" />
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {entryToDelete && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-stone-950 rounded-3xl border border-stone-800 p-6 space-y-4">
            <h3 className="text-base font-bold text-stone-100">Delete this journal entry?</h3>
            <p className="text-xs text-stone-400 leading-relaxed">
              This action will permanently delete this journal entry and all conversation transcripts from your Firestore account.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setEntryToDelete(null)}
                className="px-4 py-2 rounded-xl text-stone-400 hover:text-stone-200 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={deletingId !== null}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-stone-50 text-xs font-semibold"
              >
                {deletingId ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
