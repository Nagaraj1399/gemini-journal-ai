import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Conversation, Insight, Goal, WeeklyReflection, AppView, SmartAction, AIMemory } from '../types';
import {
  getConversations,
  getInsights,
  getGoals,
  getWeeklyReflections,
  getSmartActions,
  getAIMemories,
} from '../services/firestoreService';
import { GeminiAvatar } from './GeminiAvatar';
import { DailyCheckInModal } from './DailyCheckInModal';
import {
  PlusCircle,
  BookOpen,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Calendar,
  Tag,
  Target,
  Clock,
  HelpCircle,
  Mail,
  Search,
  CheckCircle2,
  CalendarDays,
  Compass,
  Mic,
  RotateCw,
  Lock,
  ListTodo,
  Share2,
  Camera,
  Brain,
  Sun,
  ShieldAlert,
  ChevronRight,
  Radio,
} from 'lucide-react';

interface DashboardProps {
  onStartNewConversation: () => void;
  onOpenConversation: (id: string) => void;
  onOpenJournalDetail: (id: string) => void;
  onNavigate: (view: AppView) => void;
  onOpenVoiceMode: () => void;
  onStartJournalWithPrompt: (prompt: string) => void;
  token?: string;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onStartNewConversation,
  onOpenConversation,
  onOpenJournalDetail,
  onNavigate,
  onOpenVoiceMode,
  onStartJournalWithPrompt,
  token = '',
}) => {
  const { currentUser } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [reflections, setReflections] = useState<WeeklyReflection[]>([]);
  const [actions, setActions] = useState<SmartAction[]>([]);
  const [memories, setMemories] = useState<AIMemory[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [isCheckInOpen, setIsCheckInOpen] = useState(false);

  useEffect(() => {
    if (!currentUser) return;
    let isMounted = true;

    async function loadDashboardData() {
      setLoading(true);
      try {
        const [convList, insightList, goalList, reflectionList, actionList, memoryList] =
          await Promise.all([
            getConversations(currentUser!.uid),
            getInsights(currentUser!.uid),
            getGoals(currentUser!.uid),
            getWeeklyReflections(currentUser!.uid),
            getSmartActions(currentUser!.uid),
            getAIMemories(currentUser!.uid),
          ]);

        if (isMounted) {
          setConversations(convList);
          setInsights(insightList);
          setGoals(goalList);
          setReflections(reflectionList);
          setActions(actionList);
          setMemories(memoryList);
        }
      } catch (err) {
        console.error('[DASHBOARD_LOAD_ERROR]', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadDashboardData();
    return () => {
      isMounted = false;
    };
  }, [currentUser]);

  const journalsWithSummary = conversations.filter((c) => c.summary && c.summary.trim().length > 0);

  // Extract open questions
  const openQuestions = Array.from(
    new Set(
      journalsWithSummary
        .flatMap((c) => c.openQuestions || [])
        .filter((q) => q && q.trim().length > 0)
    )
  ).slice(0, 4);

  // Extract recurring themes
  const themeCounts: Record<string, number> = {};
  journalsWithSummary.forEach((c) => {
    c.themes?.forEach((t) => {
      const trimmed = t.trim();
      if (trimmed) {
        themeCounts[trimmed] = (themeCounts[trimmed] || 0) + 1;
      }
    });
  });
  const topThemes = Object.entries(themeCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const activeGoalsList = goals.filter((g) => g.status !== 'Completed').slice(0, 3);
  const pendingActions = actions.filter((a) => a.status === 'pending');
  const latestWeekly = reflections[0] || null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8" id="gemini-command-center">
      {/* 1. Command Center Hero Header */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-slate-900/70 border border-white/10 backdrop-blur-xl overflow-hidden shadow-2xl">
        {/* Ambient Glow */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-cyan-500/15 via-indigo-500/10 to-transparent rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono uppercase tracking-wider">
              <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span>AI Life Command Center</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight text-white">
              Welcome back{currentUser?.displayName ? `, ${currentUser.displayName.split(' ')[0]}` : ''}.
            </h1>
            <p className="text-slate-400 text-sm sm:text-base max-w-xl leading-relaxed">
              Your private sanctuary to think, reflect, plan, and uncover cognitive patterns.
              Zero third-party tracking, zero model training on personal entries.
            </p>
          </div>

          <div className="flex items-center gap-4">
            <GeminiAvatar state="idle" size="lg" showStatusBadge={true} pulseGlow={true} />
          </div>
        </div>

        {/* Quick Check-in & Action Bar */}
        <div className="mt-6 pt-6 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider mr-1">
              Daily Check-in:
            </span>
            <button
              onClick={() => setIsCheckInOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-1.5 transition-all"
              id="daily-checkin-quick-btn"
            >
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              Start Daily AI Check-In
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('voice-agent')}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-cyan-500/20 transition-all"
              id="hero-talk-voice-agent-btn"
            >
              <Mic className="w-4 h-4" />
              Launch Voice Agent
            </button>
            <button
              onClick={onStartNewConversation}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
              id="hero-new-journal-btn"
            >
              <PlusCircle className="w-4 h-4 text-cyan-400" />
              New Journal
            </button>
          </div>
        </div>

        {/* Action Buttons Hub */}
        <div className="mt-6 pt-6 border-t border-white/5 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2.5">
          <button
            onClick={() => onNavigate('voice-agent')}
            className="p-3 rounded-2xl bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition-all flex flex-col items-center justify-center gap-1.5 text-center shadow-inner"
            id="action-voice-agent-nav-btn"
          >
            <Mic className="w-5 h-5 text-cyan-400 animate-pulse" />
            <span>Voice Agent</span>
          </button>

          <button
            onClick={() => onNavigate('actions')}
            className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-cyan-500/40 text-slate-200 text-xs font-medium transition-all flex flex-col items-center justify-center gap-1.5 text-center"
            id="action-smart-actions-btn"
          >
            <ListTodo className="w-5 h-5 text-cyan-400" />
            <span>Actions ({pendingActions.length})</span>
          </button>

          <button
            onClick={() => onNavigate('future-me')}
            className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-purple-500/40 text-slate-200 text-xs font-medium transition-all flex flex-col items-center justify-center gap-1.5 text-center"
            id="action-future-me-btn"
          >
            <Compass className="w-5 h-5 text-purple-400" />
            <span>Future Me</span>
          </button>

          <button
            onClick={() => onNavigate('thought-graph')}
            className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-sky-500/40 text-slate-200 text-xs font-medium transition-all flex flex-col items-center justify-center gap-1.5 text-center"
            id="action-thought-graph-btn"
          >
            <Share2 className="w-5 h-5 text-sky-400" />
            <span>Thought Graph</span>
          </button>

          <button
            onClick={() => onNavigate('image-journal')}
            className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-amber-500/40 text-slate-200 text-xs font-medium transition-all flex flex-col items-center justify-center gap-1.5 text-center"
            id="action-image-journal-btn"
          >
            <Camera className="w-5 h-5 text-amber-400" />
            <span>Image Journal</span>
          </button>

          <button
            onClick={() => onNavigate('ask')}
            className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-indigo-500/40 text-slate-200 text-xs font-medium transition-all flex flex-col items-center justify-center gap-1.5 text-center"
            id="action-ask-journal-btn"
          >
            <Search className="w-5 h-5 text-indigo-400" />
            <span>Ask Journal</span>
          </button>

          <button
            onClick={() => onNavigate('goals')}
            className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-emerald-500/40 text-slate-200 text-xs font-medium transition-all flex flex-col items-center justify-center gap-1.5 text-center"
            id="action-goals-btn"
          >
            <Target className="w-5 h-5 text-emerald-400" />
            <span>Goals ({goals.length})</span>
          </button>

          <button
            onClick={() => onNavigate('ai-memory')}
            className="p-3 rounded-2xl bg-slate-900 hover:bg-slate-800 border border-white/10 hover:border-cyan-500/40 text-slate-200 text-xs font-medium transition-all flex flex-col items-center justify-center gap-1.5 text-center"
            id="action-memory-btn"
          >
            <Brain className="w-5 h-5 text-cyan-400" />
            <span>AI Memory ({memories.length})</span>
          </button>
        </div>
      </div>

      {/* 2. Security & Privacy Live Status Indicator */}
      <div className="p-4 rounded-2xl bg-slate-900/80 border border-emerald-500/30 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 font-mono text-xs">
        <div className="flex items-center gap-2.5 text-emerald-400 font-bold">
          <Lock className="w-4 h-4" />
          <span>VAULT ENCRYPTED & ISOLATED</span>
        </div>
        <div className="flex flex-wrap items-center gap-4 text-slate-400 text-[11px]">
          <div>
            <span className="text-slate-500">Auth:</span>{' '}
            <span className="text-emerald-300">Firebase UID Verified</span>
          </div>
          <span className="text-slate-700 hidden sm:inline">•</span>
          <div>
            <span className="text-slate-500">Firestore Rules:</span>{' '}
            <span className="text-emerald-300">Strict Subcollection Isolation</span>
          </div>
          <span className="text-slate-700 hidden sm:inline">•</span>
          <div>
            <span className="text-slate-500">AI Model:</span>{' '}
            <span className="text-cyan-300">Gemini 3.8 Flash (Server Only)</span>
          </div>
          <span className="text-slate-700 hidden sm:inline">•</span>
          <button
            onClick={() => onNavigate('security')}
            className="text-cyan-400 hover:underline flex items-center gap-1"
          >
            Run 10-Point Audit <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 3. Dashboard Core Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Card 1: Recent Journals */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/10 hover:border-cyan-500/30 transition-all space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-cyan-400">
                <BookOpen className="w-4 h-4" />
                <span>Recent Journals</span>
              </div>
              <button
                onClick={() => onNavigate('history')}
                className="text-xs text-slate-500 hover:text-slate-300 font-mono"
              >
                View all ({conversations.length})
              </button>
            </div>

            {conversations.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-950/60 border border-white/5 text-center space-y-2">
                <p className="text-xs text-slate-400">No journal sessions recorded yet.</p>
                <button
                  onClick={onStartNewConversation}
                  className="text-xs text-cyan-400 hover:underline inline-flex items-center gap-1"
                >
                  Start your first session <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {conversations.slice(0, 3).map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => onOpenJournalDetail(conv.id)}
                    className="p-3 rounded-xl bg-slate-950/70 hover:bg-slate-800/80 border border-white/5 hover:border-cyan-500/30 cursor-pointer transition-all space-y-1"
                  >
                    <div className="text-xs font-semibold text-slate-200 truncate">{conv.title}</div>
                    {conv.summary && (
                      <p className="text-[11px] text-slate-400 line-clamp-1">{conv.summary}</p>
                    )}
                    <div className="text-[10px] font-mono text-slate-500 pt-0.5">
                      {new Date(conv.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={onStartNewConversation}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <PlusCircle className="w-4 h-4 text-cyan-400" />
            <span>Begin New Reflection</span>
          </button>
        </div>

        {/* Card 2: Smart Actions Quick Panel */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/10 hover:border-cyan-500/30 transition-all space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-cyan-400">
                <ListTodo className="w-4 h-4" />
                <span>Pending Smart Actions</span>
              </div>
              <button
                onClick={() => onNavigate('actions')}
                className="text-xs text-slate-500 hover:text-slate-300 font-mono"
              >
                Manage ({pendingActions.length})
              </button>
            </div>

            {pendingActions.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-950/60 border border-white/5 text-center space-y-2">
                <p className="text-xs text-slate-400">No pending action items.</p>
                <button
                  onClick={() => onNavigate('actions')}
                  className="text-xs text-cyan-400 hover:underline inline-flex items-center gap-1"
                >
                  Extract from journals <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {pendingActions.slice(0, 3).map((act) => (
                  <div
                    key={act.id}
                    className="p-2.5 rounded-xl bg-slate-950/70 border border-white/5 flex items-center justify-between text-xs"
                  >
                    <span className="text-slate-200 truncate flex-1 mr-2">{act.title}</span>
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded font-semibold uppercase ${
                        act.urgency === 'high'
                          ? 'bg-rose-500/10 text-rose-300'
                          : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      {act.urgency}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigate('actions')}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <ListTodo className="w-4 h-4 text-cyan-400" />
            <span>Open Smart Action Center</span>
          </button>
        </div>

        {/* Card 3: Active Goals */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/10 hover:border-emerald-500/30 transition-all space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-emerald-400">
                <Target className="w-4 h-4" />
                <span>Active Goals</span>
              </div>
              <button
                onClick={() => onNavigate('goals')}
                className="text-xs text-slate-500 hover:text-slate-300 font-mono"
              >
                Goal Center
              </button>
            </div>

            {activeGoalsList.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-950/60 border border-white/5 text-center space-y-2">
                <p className="text-xs text-slate-400">No active goals yet.</p>
                <button
                  onClick={() => onNavigate('goals')}
                  className="text-xs text-emerald-400 hover:underline inline-flex items-center gap-1"
                >
                  Create your first goal <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {activeGoalsList.map((g) => (
                  <div key={g.id} className="space-y-1.5 p-3 rounded-xl bg-slate-950/70 border border-white/5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-200 truncate">{g.title}</span>
                      <span className="font-mono text-emerald-400 text-[11px]">{g.progress}%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full bg-emerald-500 rounded-full"
                        style={{ width: `${g.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => onNavigate('goals')}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5"
          >
            <Target className="w-4 h-4 text-emerald-400" />
            <span>Manage All Goals</span>
          </button>
        </div>

        {/* Card 4: Future Me Teaser */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/10 hover:border-purple-500/30 transition-all space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-purple-400">
                <Compass className="w-4 h-4" />
                <span>Future Me</span>
              </div>
              <span className="text-[10px] text-slate-500">Temporal AI</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Synthesizes your past hurdles and active goals to project high-leverage 7-day and 30-day focus priorities.
            </p>
          </div>

          <button
            onClick={() => onNavigate('future-me')}
            className="w-full py-2.5 rounded-xl bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
          >
            <Compass className="w-4 h-4" />
            <span>Open Future Me Projections</span>
          </button>
        </div>

        {/* Card 5: Thought Graph Teaser */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/10 hover:border-sky-500/30 transition-all space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-sky-400">
                <Share2 className="w-4 h-4" />
                <span>Thought Graph</span>
              </div>
              <span className="text-[10px] text-slate-500">Cognitive Map</span>
            </div>

            <p className="text-xs text-slate-400 leading-relaxed">
              Interactive topological web connecting journal entries, recurrent themes, unresolved questions, and goals.
            </p>
          </div>

          <button
            onClick={() => onNavigate('thought-graph')}
            className="w-full py-2.5 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 border border-sky-500/30 text-sky-300 text-xs font-semibold transition-all flex items-center justify-center gap-1.5"
          >
            <Share2 className="w-4 h-4" />
            <span>Explore Cognitive Graph</span>
          </button>
        </div>

        {/* Card 6: Recurring Themes */}
        <div className="p-6 rounded-3xl bg-slate-900/80 border border-white/10 space-y-4 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-amber-400">
              <Tag className="w-4 h-4" />
              <span>Recurring Themes</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">Observed in journals</span>
          </div>

          {topThemes.length === 0 ? (
            <p className="text-xs text-slate-500">Themes will emerge as you journal with Gemini.</p>
          ) : (
            <div className="flex flex-wrap gap-2 pt-1">
              {topThemes.map(([theme, count]) => (
                <button
                  key={theme}
                  onClick={() =>
                    onStartJournalWithPrompt(
                      `Let's reflect on the recurring theme of "${theme}" in my thinking.`
                    )
                  }
                  className="px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-white/5 text-xs text-slate-300 hover:text-amber-300 transition-colors flex items-center gap-1.5"
                >
                  <span>{theme}</span>
                  <span className="text-[10px] font-mono text-slate-500">({count})</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Daily Check-In Modal */}
      <DailyCheckInModal
        isOpen={isCheckInOpen}
        onClose={() => setIsCheckInOpen(false)}
        token={token}
        recentThemes={topThemes.map(([t]) => t)}
        activeGoals={activeGoalsList.map((g) => g.title)}
        onStartJournal={(p) => {
          setIsCheckInOpen(false);
          onStartJournalWithPrompt(p);
        }}
        onStartVoice={(p) => {
          setIsCheckInOpen(false);
          onNavigate('voice-agent');
        }}
      />
    </div>
  );
};
