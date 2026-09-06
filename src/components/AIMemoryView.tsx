import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Brain,
  Sparkles,
  Plus,
  Trash2,
  CheckCircle2,
  Circle,
  Shield,
  Info,
  AlertTriangle,
  RefreshCw,
  Eye,
  Lock,
} from 'lucide-react';
import { AIMemory } from '../types';
import {
  getAIMemories,
  saveAIMemory,
  updateAIMemory,
  deleteAIMemory,
  clearAllMemories,
} from '../services/firestoreService';

interface AIMemoryViewProps {
  userId: string;
}

export const AIMemoryView: React.FC<AIMemoryViewProps> = ({ userId }) => {
  const [memories, setMemories] = useState<AIMemory[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newContent, setNewContent] = useState('');
  const [newCategory, setNewCategory] = useState<'goal' | 'preference' | 'habit' | 'boundary' | 'project'>('goal');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    loadMemories();
  }, [userId]);

  const loadMemories = async () => {
    try {
      setLoading(true);
      const data = await getAIMemories(userId);
      setMemories(data);
    } catch (err) {
      console.error('Failed to load AI memories:', err);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleToggleActive = async (mem: AIMemory) => {
    const updatedActive = !mem.isActive;
    try {
      await updateAIMemory(userId, mem.id, { isActive: updatedActive });
      setMemories((prev) =>
        prev.map((m) => (m.id === mem.id ? { ...m, isActive: updatedActive } : m))
      );
      showNotification(updatedActive ? 'Memory activated for Gemini context.' : 'Memory deactivated.');
    } catch (err) {
      console.error('Failed to update memory:', err);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteAIMemory(userId, id);
      setMemories((prev) => prev.filter((m) => m.id !== id));
      showNotification('Memory removed.');
    } catch (err) {
      console.error('Failed to delete memory:', err);
    }
  };

  const handleAddMemory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContent.trim()) return;

    try {
      const saved = await saveAIMemory(userId, {
        content: newContent.trim(),
        category: newCategory,
        confidence: 1.0,
        sourceType: 'explicit_user',
        isActive: true,
      });

      setMemories((prev) => [saved, ...prev]);
      setNewContent('');
      setIsAddModalOpen(false);
      showNotification('Memory stored securely.');
    } catch (err) {
      console.error('Failed to add memory:', err);
    }
  };

  const handleClearAll = async () => {
    try {
      await clearAllMemories(userId);
      setMemories([]);
      setShowClearConfirm(false);
      showNotification('All AI memories cleared.');
    } catch (err) {
      console.error('Failed to clear memories:', err);
    }
  };

  const categories = ['goal', 'preference', 'habit', 'boundary', 'project'];

  return (
    <div className="w-full max-w-5xl mx-auto px-4 sm:px-6 py-6" id="ai-memory-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 mb-6 border-b border-white/5 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Brain className="w-3.5 h-3.5 text-cyan-400" />
              Sovereign Memory Architecture
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">AI Memory Center</h1>
          <p className="text-sm text-slate-400">
            Control what Gemini remembers about your habits, goals, and thinking style. 100% transparent and editable.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          {memories.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-rose-950/40 border border-white/10 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 text-xs font-medium transition-all"
            >
              Clear All Memories
            </button>
          )}

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all"
            id="add-memory-btn"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Memory
          </button>
        </div>
      </div>

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3 rounded-xl bg-cyan-950/80 border border-cyan-500/30 text-cyan-200 text-xs flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            {notification}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Security & Transparency Banner */}
      <div className="mb-6 p-4 rounded-2xl bg-slate-900/60 border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-slate-400">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-cyan-400 shrink-0" />
          <p>
            <strong className="text-white">Strict UID Isolation:</strong> Memories are stored exclusively in your authenticated Firestore subcollection (<code className="text-cyan-300 font-mono text-[11px]">users/&#123;uid&#125;/memories</code>) and are only injected into your personal Gemini requests.
          </p>
        </div>
        <span className="shrink-0 px-2.5 py-1 rounded bg-white/5 text-slate-300 font-mono text-[11px]">
          {memories.filter((m) => m.isActive).length} active memory context items
        </span>
      </div>

      {/* Memories List */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mb-2" />
          <p className="text-xs">Loading AI memories...</p>
        </div>
      ) : memories.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-slate-900/40 border border-white/5 p-8">
          <Brain className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white mb-1">No Memories Stored Yet</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
            Teach Gemini about your preferences (e.g., "I prefer concise bullet points" or "I am training for a half-marathon in November").
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs inline-flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Add First Memory
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {memories.map((mem) => (
            <div
              key={mem.id}
              className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
                mem.isActive
                  ? 'bg-slate-900/80 border-white/10'
                  : 'bg-slate-950/40 border-white/5 opacity-50'
              }`}
            >
              <div className="flex items-start gap-3 flex-1">
                <button
                  onClick={() => handleToggleActive(mem)}
                  className="mt-0.5 text-slate-400 hover:text-cyan-400 transition-colors"
                  title={mem.isActive ? 'Deactivate Memory' : 'Activate Memory'}
                >
                  {mem.isActive ? (
                    <CheckCircle2 className="w-5 h-5 text-cyan-400" />
                  ) : (
                    <Circle className="w-5 h-5 text-slate-600" />
                  )}
                </button>

                <div>
                  <p className="text-sm font-medium text-slate-100 leading-snug">
                    "{mem.content}"
                  </p>
                  <div className="flex items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                    <span className="px-2 py-0.5 rounded bg-white/5 uppercase text-[10px] font-semibold text-slate-300">
                      {mem.category}
                    </span>
                    <span>Added {new Date(mem.createdAt).toLocaleDateString()}</span>
                    <span>• {mem.sourceType === 'explicit_user' ? 'Manual entry' : 'Learned from journal'}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                <button
                  onClick={() => handleDelete(mem.id)}
                  className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950/40 border border-white/5 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 transition-colors"
                  title="Delete memory"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add Memory Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                <h3 className="text-base font-bold text-white">Add AI Memory</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-xs text-slate-400 hover:text-white">
                  ✕
                </button>
              </div>

              <form onSubmit={handleAddMemory} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    What should Gemini remember?
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={newContent}
                    onChange={(e) => setNewContent(e.target.value)}
                    placeholder="e.g., I work best when taking 5-minute reflection pauses between tasks. Or: I am preparing for a technical keynote next month."
                    className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Category:</label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-slate-200 capitalize focus:outline-none focus:border-cyan-500"
                  >
                    {categories.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/5">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs transition-colors"
                  >
                    Save Memory
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Clear All Confirmation Modal */}
      <AnimatePresence>
        {showClearConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-sm rounded-2xl bg-slate-900 border border-rose-500/30 p-6 shadow-2xl text-center"
            >
              <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto mb-3" />
              <h3 className="text-base font-bold text-white mb-2">Clear All Memories?</h3>
              <p className="text-xs text-slate-300 mb-4">
                This will permanently delete all {memories.length} stored memories from your Firestore record. Gemini will no longer use this background context.
              </p>

              <div className="flex items-center justify-center gap-2">
                <button
                  onClick={() => setShowClearConfirm(false)}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 text-xs text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  onClick={handleClearAll}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs"
                >
                  Yes, Clear All
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
