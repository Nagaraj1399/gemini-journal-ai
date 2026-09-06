import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ListTodo,
  Sparkles,
  CheckCircle2,
  Circle,
  Clock,
  Trash2,
  Edit2,
  Target,
  Plus,
  Filter,
  Check,
  Calendar,
  AlertCircle,
  Bell,
  RefreshCw,
  BookOpen,
} from 'lucide-react';
import { SmartAction, Conversation, Goal } from '../types';
import {
  getSmartActions,
  saveSmartAction,
  updateSmartAction,
  deleteSmartAction,
  saveGoal,
} from '../services/firestoreService';
import { extractSmartActions } from '../services/api';

interface SmartActionsViewProps {
  userId: string;
  token: string;
  journals: Conversation[];
  onNavigateToGoals: () => void;
}

export const SmartActionsView: React.FC<SmartActionsViewProps> = ({
  userId,
  token,
  journals,
  onNavigateToGoals,
}) => {
  const [actions, setActions] = useState<SmartAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'done'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  // Extraction Modal State
  const [isExtractModalOpen, setIsExtractModalOpen] = useState(false);
  const [extractInputText, setExtractInputText] = useState('');
  const [selectedJournalId, setSelectedJournalId] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedPreview, setExtractedPreview] = useState<Array<{
    title: string;
    category: 'Work' | 'Personal' | 'Communication' | 'Wellness' | 'Learning';
    urgency: 'high' | 'medium' | 'low';
    selected: boolean;
  }>>([]);

  // Add Manual Action State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState<'Work' | 'Personal' | 'Communication' | 'Wellness' | 'Learning'>('Personal');
  const [newUrgency, setNewUrgency] = useState<'high' | 'medium' | 'low'>('medium');
  const [newDeadline, setNewDeadline] = useState('');

  // Editing State
  const [editingActionId, setEditingActionId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const [notification, setNotification] = useState<string | null>(null);

  useEffect(() => {
    loadActions();
  }, [userId]);

  const loadActions = async () => {
    try {
      setLoading(true);
      const data = await getSmartActions(userId);
      setActions(data);
    } catch (err) {
      console.error('Failed to load smart actions:', err);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  };

  const handleToggleDone = async (action: SmartAction) => {
    const newStatus = action.status === 'done' ? 'pending' : 'done';
    try {
      await updateSmartAction(userId, action.id, { status: newStatus });
      setActions((prev) =>
        prev.map((a) => (a.id === action.id ? { ...a, status: newStatus } : a))
      );
      showNotification(newStatus === 'done' ? 'Action marked as completed!' : 'Action marked as pending.');
    } catch (err) {
      console.error('Failed to update action status:', err);
    }
  };

  const handleDelete = async (actionId: string) => {
    try {
      await deleteSmartAction(userId, actionId);
      setActions((prev) => prev.filter((a) => a.id !== actionId));
      showNotification('Action deleted.');
    } catch (err) {
      console.error('Failed to delete action:', err);
    }
  };

  const handleConvertToGoal = async (action: SmartAction) => {
    try {
      await saveGoal(userId, {
        title: action.title,
        description: `Promoted from Smart Action (${action.category}, Urgency: ${action.urgency}).`,
        category: action.category,
        deadline: action.deadline,
        status: 'In Progress',
        progress: 15,
        tasks: [
          { id: `t-${Date.now()}-1`, title: 'Define scope and milestones', completed: false },
          { id: `t-${Date.now()}-2`, title: 'Execute primary deliverables', completed: false },
        ],
      });

      await updateSmartAction(userId, action.id, { status: 'converted_to_goal' });
      setActions((prev) =>
        prev.map((a) => (a.id === action.id ? { ...a, status: 'converted_to_goal' } : a))
      );
      showNotification(`"${action.title}" successfully added to Goal Center!`);
    } catch (err) {
      console.error('Failed to convert action to goal:', err);
    }
  };

  const handleApproveReminder = async (action: SmartAction) => {
    try {
      const updated = !action.reminderApproved;
      await updateSmartAction(userId, action.id, { reminderApproved: updated });
      setActions((prev) =>
        prev.map((a) => (a.id === action.id ? { ...a, reminderApproved: updated } : a))
      );
      showNotification(updated ? 'Reminder approved & scheduled.' : 'Reminder disabled.');
    } catch (err) {
      console.error('Failed to toggle reminder approval:', err);
    }
  };

  const handleCreateManualAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    try {
      const saved = await saveSmartAction(userId, {
        title: newTitle.trim(),
        category: newCategory,
        urgency: newUrgency,
        deadline: newDeadline || undefined,
        status: 'pending',
        sourceType: 'manual',
      });

      setActions((prev) => [saved, ...prev]);
      setNewTitle('');
      setNewDeadline('');
      setIsAddModalOpen(false);
      showNotification('New action item created.');
    } catch (err) {
      console.error('Failed to create manual action:', err);
    }
  };

  const handleStartExtraction = async () => {
    let textToAnalyze = extractInputText;
    if (selectedJournalId) {
      const j = journals.find((item) => item.id === selectedJournalId);
      if (j) {
        textToAnalyze = `${j.title}\n\n${j.summary || ''}\n\nGoals: ${(j.goals || []).join(', ')}`;
      }
    }

    if (!textToAnalyze.trim()) return;

    try {
      setIsExtracting(true);
      const results = await extractSmartActions(token, textToAnalyze);
      setExtractedPreview(results.map((r) => ({ ...r, selected: true })));
    } catch (err) {
      console.error('Extraction error:', err);
      showNotification('Unable to extract actions. Please try again.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSaveExtractedActions = async () => {
    const toSave = extractedPreview.filter((p) => p.selected);
    if (toSave.length === 0) return;

    try {
      const savePromises = toSave.map((item) =>
        saveSmartAction(userId, {
          title: item.title,
          category: item.category,
          urgency: item.urgency,
          status: 'pending',
          sourceType: 'journal',
          sourceId: selectedJournalId || undefined,
        })
      );

      const savedList = await Promise.all(savePromises);
      setActions((prev) => [...savedList, ...prev]);
      setIsExtractModalOpen(false);
      setExtractedPreview([]);
      setExtractInputText('');
      setSelectedJournalId('');
      showNotification(`Saved ${savedList.length} new action item${savedList.length === 1 ? '' : 's'}!`);
    } catch (err) {
      console.error('Failed to save extracted actions:', err);
    }
  };

  // Filter actions
  const filteredActions = actions.filter((action) => {
    if (statusFilter === 'pending' && action.status !== 'pending') return false;
    if (statusFilter === 'done' && action.status !== 'done' && action.status !== 'converted_to_goal') return false;
    if (categoryFilter !== 'all' && action.category !== categoryFilter) return false;
    return true;
  });

  const categories = ['Work', 'Personal', 'Communication', 'Wellness', 'Learning'];

  return (
    <div className="w-full max-w-6xl mx-auto px-4 sm:px-6 py-6" id="smart-actions-view">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 mb-6 border-b border-white/5 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <ListTodo className="w-3.5 h-3.5 text-cyan-400" />
              Action Intelligence
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Smart Action Extractor</h1>
          <p className="text-sm text-slate-400">
            Extract actionable next steps directly from your journals, voice sessions, and reflections.
          </p>
        </div>

        <div className="flex items-center gap-2.5 self-end sm:self-auto">
          <button
            onClick={() => setIsExtractModalOpen(true)}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 hover:from-cyan-500 hover:to-indigo-500 text-slate-950 font-semibold text-xs flex items-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all"
            id="open-extract-actions-btn"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Extract from Journal
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-white/10 text-white text-xs font-medium flex items-center gap-1.5 transition-all"
            id="add-custom-action-btn"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Action
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

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 p-3 rounded-xl bg-slate-900/60 border border-white/5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-slate-500 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3" />
            Status:
          </span>
          {(['all', 'pending', 'done'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-2.5 py-1 rounded-lg text-xs capitalize transition-all ${
                statusFilter === s
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold border border-cyan-500/30'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto">
          <span className="text-xs text-slate-500 mr-1">Category:</span>
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-2 py-0.5 rounded text-xs transition-all ${
              categoryFilter === 'all'
                ? 'bg-slate-700 text-white'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-2 py-0.5 rounded text-xs transition-all ${
                categoryFilter === cat
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Actions List */}
      {loading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-500">
          <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mb-2" />
          <p className="text-xs">Loading smart actions...</p>
        </div>
      ) : filteredActions.length === 0 ? (
        <div className="py-16 text-center rounded-2xl bg-slate-900/40 border border-white/5 p-8">
          <ListTodo className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-white mb-1">No Actions in this View</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mb-4">
            Extract actionable next steps directly from your private journals or create a custom task.
          </p>
          <button
            onClick={() => setIsExtractModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-slate-950 font-semibold text-xs inline-flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Extract Actions with AI
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredActions.map((action) => {
            const isDone = action.status === 'done';
            const isConverted = action.status === 'converted_to_goal';

            return (
              <motion.div
                key={action.id}
                layout
                className={`p-4 rounded-xl border transition-all ${
                  isDone
                    ? 'bg-slate-950/40 border-white/5 opacity-60'
                    : isConverted
                    ? 'bg-indigo-950/30 border-indigo-500/20'
                    : 'bg-slate-900/80 border-white/10 hover:border-cyan-500/30'
                } flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3`}
              >
                {/* Left: Checkbox & Content */}
                <div className="flex items-start gap-3 flex-1">
                  <button
                    onClick={() => handleToggleDone(action)}
                    className="mt-0.5 text-slate-400 hover:text-cyan-400 transition-colors shrink-0"
                    title={isDone ? 'Mark Pending' : 'Mark Done'}
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-500" />
                    )}
                  </button>

                  <div className="flex-1">
                    <p
                      className={`text-sm font-medium ${
                        isDone ? 'line-through text-slate-500' : 'text-slate-100'
                      }`}
                    >
                      {action.title}
                    </p>

                    <div className="flex flex-wrap items-center gap-2 mt-1.5 text-[11px] text-slate-400">
                      <span className="px-2 py-0.5 rounded bg-white/5 text-slate-300 font-medium">
                        {action.category}
                      </span>

                      <span
                        className={`px-2 py-0.5 rounded font-semibold ${
                          action.urgency === 'high'
                            ? 'bg-rose-500/10 text-rose-300 border border-rose-500/20'
                            : action.urgency === 'medium'
                            ? 'bg-amber-500/10 text-amber-300 border border-amber-500/20'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {action.urgency.toUpperCase()}
                      </span>

                      {action.deadline && (
                        <span className="flex items-center gap-1 text-slate-400">
                          <Calendar className="w-3 h-3" />
                          {action.deadline}
                        </span>
                      )}

                      {isConverted && (
                        <span className="text-indigo-400 font-medium flex items-center gap-1">
                          <Target className="w-3 h-3" />
                          In Goal Center
                        </span>
                      )}

                      <span className="text-slate-600">
                        Via {action.sourceType}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right: Operations */}
                <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                  {!isConverted && !isDone && (
                    <button
                      onClick={() => handleConvertToGoal(action)}
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 text-xs font-medium flex items-center gap-1 transition-colors"
                      title="Promote to full goal with milestones"
                    >
                      <Target className="w-3 h-3" />
                      Add to Goals
                    </button>
                  )}

                  <button
                    onClick={() => handleApproveReminder(action)}
                    className={`p-1.5 rounded-lg border text-xs transition-colors ${
                      action.reminderApproved
                        ? 'bg-cyan-500/10 border-cyan-500/30 text-cyan-300'
                        : 'bg-slate-800/80 border-white/5 text-slate-400 hover:text-slate-200'
                    }`}
                    title={action.reminderApproved ? 'Reminder Approved' : 'Enable Approved Reminder'}
                  >
                    <Bell className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={() => handleDelete(action.id)}
                    className="p-1.5 rounded-lg bg-slate-800/80 hover:bg-rose-950/40 border border-white/5 hover:border-rose-500/30 text-slate-400 hover:text-rose-300 transition-colors"
                    title="Delete action"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* MODAL: Extract from Journal / Text */}
      <AnimatePresence>
        {isExtractModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl rounded-2xl bg-slate-900 border border-white/10 p-6 shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            >
              <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-4">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-base font-bold text-white">Extract Smart Actions</h3>
                </div>
                <button
                  onClick={() => setIsExtractModalOpen(false)}
                  className="text-xs text-slate-400 hover:text-white"
                >
                  ✕
                </button>
              </div>

              <div className="flex-1 overflow-y-auto space-y-4 pr-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Select a Journal Entry to Analyze:
                  </label>
                  <select
                    value={selectedJournalId}
                    onChange={(e) => {
                      setSelectedJournalId(e.target.value);
                      if (e.target.value) setExtractInputText('');
                    }}
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">-- Choose from saved journal entries --</option>
                    {journals.map((j) => (
                      <option key={j.id} value={j.id}>
                        {j.title} ({new Date(j.createdAt).toLocaleDateString()})
                      </option>
                    ))}
                  </select>
                </div>

                {!selectedJournalId && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">
                      Or Paste Text / Meeting Notes / Brainstorm:
                    </label>
                    <textarea
                      rows={4}
                      value={extractInputText}
                      onChange={(e) => setExtractInputText(e.target.value)}
                      placeholder="e.g., Today I discussed the launch plan with Sarah. I need to finish the slide deck by Friday, reply to Arun about the design mockups, and schedule time to review the budget."
                      className="w-full bg-slate-950 border border-white/10 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                )}

                <button
                  onClick={handleStartExtraction}
                  disabled={isExtracting || (!selectedJournalId && !extractInputText.trim())}
                  className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-slate-950 font-semibold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-cyan-500/20 transition-all"
                >
                  {isExtracting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Analyzing with Gemini 3.8 Flash...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      Detect Action Items
                    </>
                  )}
                </button>

                {/* Preview of Extracted Items */}
                {extractedPreview.length > 0 && (
                  <div className="pt-3 border-t border-white/5">
                    <h4 className="text-xs font-semibold text-cyan-300 mb-2">
                      Detected Actions (Select which to save):
                    </h4>
                    <div className="space-y-2">
                      {extractedPreview.map((item, idx) => (
                        <div
                          key={idx}
                          onClick={() =>
                            setExtractedPreview((prev) =>
                              prev.map((p, i) => (i === idx ? { ...p, selected: !p.selected } : p))
                            )
                          }
                          className={`p-3 rounded-xl border cursor-pointer flex items-center justify-between gap-3 ${
                            item.selected
                              ? 'bg-cyan-950/40 border-cyan-500/40 text-slate-100'
                              : 'bg-slate-950/50 border-white/5 opacity-50 text-slate-400'
                          }`}
                        >
                          <div className="flex items-center gap-2 flex-1">
                            <span
                              className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                                item.selected
                                  ? 'bg-cyan-500 border-cyan-400 text-slate-950'
                                  : 'border-slate-600'
                              }`}
                            >
                              {item.selected && <Check className="w-3 h-3" />}
                            </span>
                            <span className="text-xs font-medium">{item.title}</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-400 shrink-0">
                            {item.category} • {item.urgency}
                          </span>
                        </div>
                      ))}
                    </div>

                    <div className="mt-4 flex items-center justify-end gap-2">
                      <button
                        onClick={() => setIsExtractModalOpen(false)}
                        className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveExtractedActions}
                        disabled={extractedPreview.filter((p) => p.selected).length === 0}
                        className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-colors"
                      >
                        Save {extractedPreview.filter((p) => p.selected).length} Selected Actions
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL: Add Manual Action */}
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
                <h3 className="text-base font-bold text-white">Create Smart Action</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="text-xs text-slate-400 hover:text-white">
                  ✕
                </button>
              </div>

              <form onSubmit={handleCreateManualAction} className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Action Title:</label>
                  <input
                    type="text"
                    required
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Draft proposal for client review"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Category:</label>
                    <select
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value as any)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      {categories.map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1">Urgency:</label>
                    <select
                      value={newUrgency}
                      onChange={(e) => setNewUrgency(e.target.value as any)}
                      className="w-full bg-slate-950 border border-white/10 rounded-xl px-2.5 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
                    >
                      <option value="high">High</option>
                      <option value="medium">Medium</option>
                      <option value="low">Low</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Target Deadline (Optional):</label>
                  <input
                    type="text"
                    value={newDeadline}
                    onChange={(e) => setNewDeadline(e.target.value)}
                    placeholder="e.g. Tomorrow, End of week, Oct 15"
                    className="w-full bg-slate-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  />
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
                    Save Action
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
