import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Goal, GoalTask } from '../types';
import { getGoals, saveGoal, updateGoal, deleteGoal } from '../services/firestoreService';
import { useAuth } from '../contexts/AuthContext';
import { GeminiAvatar } from './GeminiAvatar';
import {
  Target,
  Plus,
  CheckCircle2,
  Circle,
  Calendar,
  Sparkles,
  Trash2,
  Edit3,
  Check,
  RotateCw,
  Tag,
  Clock,
  ArrowRight,
  AlertCircle,
  CheckSquare,
} from 'lucide-react';

interface GoalCenterViewProps {
  initialConvertGoal?: { title: string; category?: string; description?: string } | null;
  onClearInitialConvert?: () => void;
}

export const GoalCenterView: React.FC<GoalCenterViewProps> = ({
  initialConvertGoal,
  onClearInitialConvert,
}) => {
  const { currentUser, getIdToken } = useAuth();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('All');
  const [isCreating, setIsCreating] = useState(false);
  const [isAiGeneratingMilestones, setIsAiGeneratingMilestones] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<Goal | null>(null);

  // New Goal Form State
  const [newTitle, setNewTitle] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newCategory, setNewCategory] = useState('Career');
  const [newDeadline, setNewDeadline] = useState('');
  const [newTasks, setNewTasks] = useState<GoalTask[]>([]);
  const [taskInput, setTaskInput] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    if (!currentUser) return;
    loadGoals();
  }, [currentUser]);

  // Handle incoming idea converted from journal
  useEffect(() => {
    if (initialConvertGoal) {
      setNewTitle(initialConvertGoal.title);
      setNewDesc(initialConvertGoal.description || '');
      setNewCategory(initialConvertGoal.category || 'Career');
      setIsCreating(true);
      if (onClearInitialConvert) onClearInitialConvert();
    }
  }, [initialConvertGoal]);

  const loadGoals = async () => {
    if (!currentUser) return;
    setIsLoading(true);
    try {
      const list = await getGoals(currentUser.uid);
      setGoals(list);
    } catch (err) {
      console.error('Error loading goals:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAiBreakdown = async () => {
    if (!newTitle.trim()) {
      setFormError('Please enter a goal title before requesting AI milestones.');
      return;
    }
    setFormError(null);
    setIsAiGeneratingMilestones(true);

    try {
      const token = await getIdToken();
      const res = await fetch('/api/goals/breakdown', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newTitle,
          description: newDesc,
          category: newCategory,
        }),
      });

      if (!res.ok) throw new Error('Could not generate milestone tasks.');
      const data = await res.json();
      if (Array.isArray(data.tasks)) {
        setNewTasks((prev) => [...prev, ...data.tasks]);
      }
    } catch (err) {
      setFormError((err as Error).message || 'Failed to generate milestones.');
    } finally {
      setIsAiGeneratingMilestones(false);
    }
  };

  const handleAddTask = () => {
    if (!taskInput.trim()) return;
    setNewTasks((prev) => [
      ...prev,
      { id: `t-${Date.now()}`, title: taskInput.trim(), completed: false },
    ]);
    setTaskInput('');
  };

  const handleRemoveTask = (taskId: string) => {
    setNewTasks((prev) => prev.filter((t) => t.id !== taskId));
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !currentUser) {
      setFormError('Goal title is required.');
      return;
    }

    try {
      const totalTasks = newTasks.length;
      const completedTasks = newTasks.filter((t) => t.completed).length;
      const calculatedProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
      const status: Goal['status'] =
        calculatedProgress === 100 ? 'Completed' : calculatedProgress > 0 ? 'In Progress' : 'Not Started';

      await saveGoal(currentUser.uid, {
        title: newTitle.trim(),
        description: newDesc.trim(),
        category: newCategory,
        deadline: newDeadline || undefined,
        tasks: newTasks,
        progress: calculatedProgress,
        status,
      });

      // Reset form
      setNewTitle('');
      setNewDesc('');
      setNewDeadline('');
      setNewTasks([]);
      setIsCreating(false);
      setFormError(null);
      await loadGoals();
    } catch (err) {
      setFormError((err as Error).message || 'Failed to save goal.');
    }
  };

  const toggleTaskStatus = async (goal: Goal, taskId: string) => {
    if (!currentUser) return;
    const updatedTasks = goal.tasks.map((t) =>
      t.id === taskId ? { ...t, completed: !t.completed } : t
    );
    const total = updatedTasks.length;
    const completed = updatedTasks.filter((t) => t.completed).length;
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;
    const status: Goal['status'] =
      progress === 100 ? 'Completed' : progress > 0 ? 'In Progress' : 'Not Started';

    // Optimistic UI update
    setGoals((prev) =>
      prev.map((g) => (g.id === goal.id ? { ...g, tasks: updatedTasks, progress, status } : g))
    );

    try {
      await updateGoal(currentUser.uid, goal.id, {
        tasks: updatedTasks,
        progress,
        status,
      });
    } catch (err) {
      console.error('Error toggling task:', err);
      loadGoals();
    }
  };

  const confirmDelete = async () => {
    if (!goalToDelete || !currentUser) return;
    try {
      await deleteGoal(currentUser.uid, goalToDelete.id);
      setGoals((prev) => prev.filter((g) => g.id !== goalToDelete.id));
      setGoalToDelete(null);
    } catch (err) {
      console.error('Error deleting goal:', err);
    }
  };

  const filteredGoals = goals.filter((g) => {
    if (filterStatus === 'All') return true;
    return g.status === filterStatus;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8" id="goal-center-view">
      {/* Header Banner */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-stone-900/60 border border-stone-800 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono uppercase tracking-wider">
              <Target className="w-3.5 h-3.5" />
              <span>Goal & Action Planner</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-100">
              Goal Center
            </h1>
            <p className="text-stone-400 text-sm max-w-xl leading-relaxed">
              Transform your private journal thoughts into measurable outcomes. Let Gemini suggest sequenced milestones, and retain full editorial authority over your plans.
            </p>
          </div>

          <button
            onClick={() => setIsCreating(!isCreating)}
            className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-semibold text-sm transition-all shadow-md shadow-cyan-500/20 flex items-center gap-2"
            id="create-new-goal-btn"
          >
            <Plus className="w-4 h-4" />
            <span>{isCreating ? 'Cancel' : 'New Goal'}</span>
          </button>
        </div>
      </div>

      {/* Create / Convert Goal Form */}
      <AnimatePresence>
        {isCreating && (
          <motion.form
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            onSubmit={handleSaveGoal}
            className="p-6 sm:p-8 rounded-3xl bg-stone-900/90 border border-cyan-500/30 shadow-2xl space-y-6 overflow-hidden"
            id="goal-creation-form"
          >
            <div className="flex items-center justify-between border-b border-stone-800 pb-4">
              <h2 className="text-lg font-semibold text-stone-100 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                <span>Create Measurable Goal</span>
              </h2>
              <span className="text-xs font-mono text-stone-400">Private Firestore Storage</span>
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-stone-400">
                  Goal Title *
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. Master Cloud Architecture & Google Cloud Professional Cert"
                  className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 focus:border-cyan-500 text-stone-100 text-sm outline-none"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-stone-400">
                  Category
                </label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 focus:border-cyan-500 text-stone-100 text-sm outline-none"
                >
                  <option value="Career">Career</option>
                  <option value="Learning">Learning</option>
                  <option value="Health">Health</option>
                  <option value="Personal">Personal</option>
                  <option value="Project">Project</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2 space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-stone-400">
                  Context & Description
                </label>
                <textarea
                  rows={2}
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  placeholder="Why is this important? What does success look like?"
                  className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 focus:border-cyan-500 text-stone-100 text-sm outline-none resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-mono uppercase tracking-wider text-stone-400">
                  Target Deadline
                </label>
                <input
                  type="date"
                  value={newDeadline}
                  onChange={(e) => setNewDeadline(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-800 focus:border-cyan-500 text-stone-100 text-sm outline-none"
                />
              </div>
            </div>

            {/* AI Milestone Generation Section */}
            <div className="p-4 rounded-2xl bg-stone-950/80 border border-stone-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <GeminiAvatar state={isAiGeneratingMilestones ? 'thinking' : 'idle'} size="sm" />
                  <span className="text-xs font-semibold text-stone-200">Gemini Milestone Synthesizer</span>
                </div>
                <button
                  type="button"
                  onClick={handleAiBreakdown}
                  disabled={isAiGeneratingMilestones || !newTitle.trim()}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-300 text-xs font-medium transition-all flex items-center gap-1.5 disabled:opacity-40"
                >
                  {isAiGeneratingMilestones ? (
                    <>
                      <RotateCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating Milestones...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Suggest Action Milestones</span>
                    </>
                  )}
                </button>
              </div>

              {/* Task Checklist Items */}
              {newTasks.length > 0 && (
                <div className="space-y-2 pt-2">
                  {newTasks.map((t, idx) => (
                    <div
                      key={t.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-stone-900 border border-stone-800 text-xs text-stone-200"
                    >
                      <div className="flex items-center gap-2 flex-1">
                        <CheckSquare className="w-4 h-4 text-cyan-400" />
                        <span>{t.title}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveTask(t.id)}
                        className="p-1 text-stone-500 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add Custom Task Input */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="text"
                  value={taskInput}
                  onChange={(e) => setTaskInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddTask();
                    }
                  }}
                  placeholder="Add custom milestone task..."
                  className="flex-1 px-3.5 py-2 rounded-xl bg-stone-900 border border-stone-800 text-xs text-stone-200 outline-none focus:border-stone-600"
                />
                <button
                  type="button"
                  onClick={handleAddTask}
                  className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-medium"
                >
                  Add
                </button>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsCreating(false)}
                className="px-4 py-2 rounded-xl text-stone-400 hover:text-stone-200 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-semibold text-xs transition-all shadow-md"
              >
                Save Goal to Firestore
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4 border-b border-stone-800 pb-3">
        <div className="flex items-center gap-1.5">
          {['All', 'Not Started', 'In Progress', 'Completed'].map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterStatus(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                filterStatus === tab
                  ? 'bg-stone-800 text-cyan-400 border border-stone-700'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
        <div className="text-xs font-mono text-stone-500">
          {filteredGoals.length} {filteredGoals.length === 1 ? 'goal' : 'goals'}
        </div>
      </div>

      {/* Goals Grid */}
      {isLoading ? (
        <div className="p-12 text-center text-stone-500 text-sm font-mono flex items-center justify-center gap-2">
          <RotateCw className="w-4 h-4 animate-spin text-cyan-400" />
          <span>Synchronizing goals from Firestore...</span>
        </div>
      ) : filteredGoals.length === 0 ? (
        <div className="p-12 rounded-3xl bg-stone-900/40 border border-stone-800 text-center space-y-3">
          <Target className="w-10 h-10 text-stone-600 mx-auto" />
          <h3 className="text-base font-semibold text-stone-200">No Goals Found</h3>
          <p className="text-sm text-stone-400 max-w-sm mx-auto">
            {filterStatus === 'All'
              ? 'You have not created any goals yet. Turn thoughts into concrete actions or add a new goal above.'
              : `No goals found with status "${filterStatus}".`}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredGoals.map((goal) => (
            <div
              key={goal.id}
              className="p-5 rounded-2xl bg-stone-900/80 border border-stone-800/80 hover:border-cyan-500/30 transition-all space-y-4 shadow-lg flex flex-col justify-between"
            >
              <div className="space-y-3">
                {/* Badge & Category */}
                <div className="flex items-center justify-between">
                  <span className="px-2.5 py-0.5 rounded-full bg-stone-800 border border-stone-700 text-[11px] font-mono text-cyan-300">
                    {goal.category}
                  </span>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[11px] font-mono px-2 py-0.5 rounded-full ${
                        goal.status === 'Completed'
                          ? 'bg-emerald-950/60 text-emerald-400 border border-emerald-800'
                          : goal.status === 'In Progress'
                          ? 'bg-indigo-950/60 text-indigo-300 border border-indigo-800'
                          : 'bg-stone-800 text-stone-400'
                      }`}
                    >
                      {goal.status}
                    </span>
                    <button
                      onClick={() => setGoalToDelete(goal)}
                      className="p-1 text-stone-500 hover:text-rose-400 transition-colors"
                      title="Delete Goal"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="text-base font-semibold text-stone-100">{goal.title}</h3>
                  {goal.description && (
                    <p className="text-xs text-stone-400 mt-1 leading-relaxed line-clamp-2">
                      {goal.description}
                    </p>
                  )}
                </div>

                {/* Progress Bar */}
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-stone-400">Progress</span>
                    <span className="text-cyan-400 font-semibold">{goal.progress}%</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-stone-950 overflow-hidden border border-stone-800">
                    <motion.div
                      className="h-full bg-gradient-to-r from-indigo-500 to-cyan-400 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${goal.progress}%` }}
                      transition={{ duration: 0.6, ease: 'easeOut' }}
                    />
                  </div>
                </div>

                {/* Milestone Tasks Checklist */}
                {goal.tasks && goal.tasks.length > 0 && (
                  <div className="space-y-1.5 pt-2 border-t border-stone-800/80">
                    <div className="text-[11px] font-mono text-stone-500 uppercase tracking-wider">
                      Tasks ({goal.tasks.filter((t) => t.completed).length}/{goal.tasks.length})
                    </div>
                    <div className="space-y-1">
                      {goal.tasks.map((task) => (
                        <button
                          key={task.id}
                          onClick={() => toggleTaskStatus(goal, task.id)}
                          className="w-full flex items-start gap-2 p-1.5 rounded-lg hover:bg-stone-950/60 text-left transition-colors group"
                        >
                          {task.completed ? (
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5 flex-shrink-0" />
                          ) : (
                            <Circle className="w-4 h-4 text-stone-600 group-hover:text-cyan-400 mt-0.5 flex-shrink-0" />
                          )}
                          <span
                            className={`text-xs ${
                              task.completed
                                ? 'line-through text-stone-500'
                                : 'text-stone-300 group-hover:text-stone-100'
                            }`}
                          >
                            {task.title}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Deadline Footer */}
              {goal.deadline && (
                <div className="pt-3 border-t border-stone-800/80 flex items-center gap-1.5 text-[11px] font-mono text-stone-500">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                  <span>Target: {goal.deadline}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {goalToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-md p-6 rounded-2xl bg-stone-950 border border-stone-800 text-stone-100 space-y-4 shadow-2xl"
            >
              <div className="flex items-center gap-3 text-rose-400">
                <Trash2 className="w-5 h-5" />
                <h3 className="text-base font-semibold">Delete Goal</h3>
              </div>
              <p className="text-xs text-stone-400 leading-relaxed">
                Are you sure you want to delete "{goalToDelete.title}"? All associated milestone tasks will be permanently removed from your private Firestore database.
              </p>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setGoalToDelete(null)}
                  className="px-4 py-2 rounded-xl text-stone-400 hover:text-stone-200 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmDelete}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold"
                >
                  Delete Permanently
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
