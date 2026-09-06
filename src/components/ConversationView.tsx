import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Message, Conversation, JournalSummary } from '../types';
import {
  createConversation,
  getConversation,
  getMessages,
  addMessage,
  updateConversationWithSummary,
  getUserSettings,
  saveGoal,
} from '../services/firestoreService';
import { sendChatMessage, requestJournalSummary } from '../services/api';
import { SafeMarkdown } from './SafeMarkdown';
import { GeminiAvatar } from './GeminiAvatar';
import {
  Send,
  Sparkles,
  BookOpen,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Tag,
  Target,
  HelpCircle,
  X,
  Mic,
  ArrowRight,
  CheckSquare,
} from 'lucide-react';

interface ConversationViewProps {
  conversationId?: string | null;
  onBack: () => void;
  onJournalSaved: (conversationId: string) => void;
  onOpenVoiceMode?: () => void;
  initialMessageToSend?: string | null;
  onClearInitialMessage?: () => void;
}

export const ConversationView: React.FC<ConversationViewProps> = ({
  conversationId: initialConvId,
  onBack,
  onJournalSaved,
  onOpenVoiceMode,
  initialMessageToSend,
  onClearInitialMessage,
}) => {
  const { currentUser, getIdToken } = useAuth();

  const [activeConvId, setActiveConvId] = useState<string | null>(initialConvId || null);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [summarizing, setSummarizing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [summaryPreview, setSummaryPreview] = useState<JournalSummary | null>(null);
  const [showSummaryModal, setShowSummaryModal] = useState(false);
  const [exportGoalsToPlanner, setExportGoalsToPlanner] = useState(true);

  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const promptSuggestions = [
    'Help me reflect on today',
    'Help me brainstorm an idea',
    'Turn this thought into a plan',
    'Help me make a difficult decision',
    'What patterns do you notice in my thinking?',
    'Help me prioritize my goals',
  ];

  // Auto-scroll to bottom of conversation
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Load existing conversation and messages if initialConvId exists
  useEffect(() => {
    if (!currentUser) return;
    let isMounted = true;

    async function loadData() {
      if (!initialConvId) {
        setConversation(null);
        setMessages([]);
        setActiveConvId(null);
        return;
      }

      try {
        const [conv, msgList] = await Promise.all([
          getConversation(currentUser.uid, initialConvId),
          getMessages(currentUser.uid, initialConvId),
        ]);
        if (isMounted) {
          setConversation(conv);
          setMessages(msgList);
          setActiveConvId(initialConvId);
        }
      } catch (err) {
        console.error('[CONV_LOAD_ERROR]', err);
        if (isMounted) setErrorMsg('Failed to load conversation history.');
      }
    }

    loadData();
    return () => {
      isMounted = false;
    };
  }, [currentUser, initialConvId]);

  // Check for initialMessageToSend (from Voice Mode or email/calendar reflection)
  useEffect(() => {
    if (initialMessageToSend && currentUser) {
      handleSendMessage(initialMessageToSend);
      if (onClearInitialMessage) onClearInitialMessage();
    }
  }, [initialMessageToSend, currentUser]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = (textToSend || inputText).trim();
    if (!text || loading || !currentUser) return;

    setErrorMsg(null);
    setInputText('');

    try {
      const token = await getIdToken();
      if (!token) throw new Error('Authentication session lost. Please refresh or sign in again.');

      // 1. If no conversation exists yet, initialize one
      let convId = activeConvId;
      if (!convId) {
        const titleCandidate = text.slice(0, 40) + (text.length > 40 ? '...' : '');
        convId = await createConversation(currentUser.uid, titleCandidate);
        setActiveConvId(convId);
        const newConv = await getConversation(currentUser.uid, convId);
        setConversation(newConv);
      }

      // 2. Optimistically add user message to Firestore & UI
      const userMsg = await addMessage(currentUser.uid, convId, { role: 'user', content: text });
      const updatedMessages = [...messages, userMsg];
      setMessages(updatedMessages);

      // 3. Check AI Memory settings
      const settings = await getUserSettings(currentUser.uid);
      const aiMemoryContext = settings.rememberLongTermGoals
        ? { rememberGoals: true, userGoals: conversation?.goals }
        : undefined;

      // 4. Send to server-side Gemini API
      setLoading(true);

      const replyContent = await sendChatMessage(token, {
        messages: updatedMessages.map((m) => ({ role: m.role, content: m.content })),
        aiMemoryContext,
      });

      // 5. Store Gemini reply in Firestore & update UI
      const aiMsg = await addMessage(currentUser.uid, convId, { role: 'model', content: replyContent });
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: any) {
      console.error('[SEND_MSG_ERROR]', err);
      setErrorMsg(err.message || 'Failed to send message. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Automatic Journal Summarization
  const handleGenerateSummary = async () => {
    if (!currentUser || messages.length === 0 || !activeConvId) return;

    setSummarizing(true);
    setErrorMsg(null);

    try {
      const token = await getIdToken();
      if (!token) throw new Error('Authentication expired. Please sign in again.');

      const summaryResult = await requestJournalSummary(
        token,
        messages.map((m) => ({ role: m.role, content: m.content }))
      );

      setSummaryPreview(summaryResult);
      setShowSummaryModal(true);
    } catch (err: any) {
      console.error('[SUMMARIZE_ERROR]', err);
      setErrorMsg(err.message || 'Failed to summarize conversation. Please try again.');
    } finally {
      setSummarizing(false);
    }
  };

  const handleConfirmSaveJournal = async () => {
    if (!currentUser || !activeConvId || !summaryPreview) return;

    try {
      await updateConversationWithSummary(currentUser.uid, activeConvId, summaryPreview);

      // If requested, export identified goals into Goal Center!
      if (exportGoalsToPlanner && summaryPreview.goals && summaryPreview.goals.length > 0) {
        for (const goalTitle of summaryPreview.goals) {
          try {
            await saveGoal(currentUser.uid, {
              title: goalTitle,
              category: 'Personal Growth',
              sourceJournalId: activeConvId,
              status: 'Not Started',
              progress: 0,
              tasks: [{ id: `t-${Date.now()}-1`, title: 'Clarify initial step', completed: false }],
            });
          } catch (e) {
            console.warn('Could not auto-save goal to planner:', e);
          }
        }
      }

      setShowSummaryModal(false);
      onJournalSaved(activeConvId);
    } catch (err: any) {
      console.error('[SAVE_JOURNAL_ERROR]', err);
      setErrorMsg('Failed to save journal record to database.');
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 flex flex-col h-[calc(100vh-5rem)]" id="gemini-thinking-space">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between pb-3 border-b border-stone-800 shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-100 hover:bg-stone-800 transition-colors"
            title="Back to Dashboard"
            id="back-to-dashboard-btn"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2.5">
            <GeminiAvatar
              state={loading ? 'thinking' : 'idle'}
              size="sm"
              pulseGlow={loading}
            />
            <div>
              <h2 className="text-sm sm:text-base font-semibold text-stone-100 truncate max-w-xs sm:max-w-md">
                {conversation?.title || 'Private Thinking Session'}
              </h2>
              <div className="flex items-center gap-2 text-xs font-mono text-stone-500">
                <span className="text-emerald-400 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Isolated UID Vault</span>
                </span>
                {conversation?.summary && (
                  <span className="px-1.5 py-0.2 rounded bg-cyan-950 border border-cyan-800 text-cyan-300 text-[10px]">
                    Saved Journal
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Buttons: Voice Mode & Save Journal */}
        <div className="flex items-center gap-2">
          {onOpenVoiceMode && (
            <button
              onClick={onOpenVoiceMode}
              className="p-2 rounded-xl bg-stone-900 border border-stone-800 text-cyan-300 hover:border-cyan-500/40 hover:bg-stone-800 transition-colors"
              title="Voice Mode"
              id="voice-mode-trigger-btn"
            >
              <Mic className="w-4 h-4" />
            </button>
          )}

          {messages.length >= 2 && (
            <button
              onClick={handleGenerateSummary}
              disabled={summarizing || loading}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-semibold text-xs transition-all shadow-md shadow-cyan-500/20 flex items-center gap-1.5 disabled:opacity-50"
              id="save-as-journal-btn"
            >
              {summarizing ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <BookOpen className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Save Journal Entry</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Error Notification */}
      {errorMsg && (
        <div className="mt-3 p-3 rounded-xl bg-rose-950/50 border border-rose-800/60 text-xs text-rose-300 flex items-center justify-between">
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg(null)} className="text-rose-400 hover:text-rose-200">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Chat Messages Container */}
      <div className="flex-1 overflow-y-auto py-6 space-y-6">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto space-y-6">
            <GeminiAvatar state="idle" size="lg" showStatusBadge={true} pulseGlow={true} />
            <div>
              <h3 className="text-xl font-bold text-stone-100">
                What is on your mind?
              </h3>
              <p className="text-xs sm:text-sm text-stone-400 mt-1 leading-relaxed">
                Gemini is ready to think with you. Unpack decisions, reflect on your week, or structure new goals in absolute privacy.
              </p>
            </div>

            {/* Prompt Suggestion Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left">
              {promptSuggestions.map((prompt, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(prompt)}
                  className="p-3 rounded-xl bg-stone-900/80 hover:bg-stone-800 border border-stone-800 hover:border-cyan-500/30 transition-all text-xs text-stone-200 font-medium flex items-center justify-between group cursor-pointer"
                >
                  <span>{prompt}</span>
                  <Sparkles className="w-3.5 h-3.5 text-stone-500 group-hover:text-cyan-400 transition-colors shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div className="flex items-center gap-1.5 text-[10px] font-mono text-stone-500 px-1 mb-1">
                {msg.role === 'model' && (
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                )}
                <span>{msg.role === 'user' ? 'You' : 'Gemini Thinking Partner'}</span>
                <span>·</span>
                <span>
                  {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-gradient-to-r from-cyan-600 to-indigo-600 text-white rounded-br-xs shadow-md'
                    : 'bg-stone-900/90 border border-stone-800 text-stone-200 rounded-bl-xs shadow-md'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <SafeMarkdown content={msg.content} />
                )}
              </div>
            </div>
          ))
        )}

        {/* Loading / Thinking Indicator */}
        {loading && (
          <div className="flex flex-col items-start space-y-1">
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-stone-500 px-1">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-ping" />
              <span>Gemini is thinking with you...</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-stone-900 border border-indigo-500/30 text-stone-400 rounded-bl-xs flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" />
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-bounce [animation-delay:0.2s]" />
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce [animation-delay:0.4s]" />
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Composer */}
      <div className="pt-3 border-t border-stone-800 shrink-0">
        <div className="relative rounded-2xl bg-stone-900/90 border border-stone-800 focus-within:border-cyan-500 transition-all p-2 flex items-end gap-2 shadow-lg">
          <textarea
            ref={textareaRef}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Type your thought or question... (Enter to send, Shift+Enter for newline)"
            rows={2}
            className="flex-1 bg-transparent resize-none p-1 text-xs sm:text-sm text-stone-100 placeholder:text-stone-500 focus:outline-none leading-relaxed"
          />

          <button
            onClick={() => handleSendMessage()}
            disabled={!inputText.trim() || loading}
            className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-stone-950 disabled:opacity-30 transition-all cursor-pointer shrink-0 font-semibold"
            title="Send"
            id="send-chat-msg-btn"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>

        <div className="flex items-center justify-between text-[11px] font-mono text-stone-500 px-2 pt-1.5">
          <span>🔒 Messages are transmitted over encrypted TLS & processed privately.</span>
          <span>Max 4,000 chars</span>
        </div>
      </div>

      {/* Modal: Structured Journal Summary Review */}
      {showSummaryModal && summaryPreview && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-stone-950 rounded-3xl border border-cyan-500/30 shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-5 bg-stone-900/80 border-b border-stone-800 text-stone-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <GeminiAvatar state="success" size="sm" pulseGlow={false} />
                <div>
                  <h3 className="text-base font-bold text-stone-100">
                    Structured Journal Entry
                  </h3>
                  <p className="text-[11px] font-mono text-stone-400">
                    Synthesized by Gemini from your conversation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowSummaryModal(false)}
                className="text-stone-400 hover:text-stone-100 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs sm:text-sm">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block">
                  Title
                </span>
                <input
                  type="text"
                  value={summaryPreview.title}
                  onChange={(e) =>
                    setSummaryPreview({ ...summaryPreview, title: e.target.value })
                  }
                  className="mt-1 w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-sm font-semibold text-stone-100 focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 block">
                  Summary
                </span>
                <textarea
                  value={summaryPreview.summary}
                  onChange={(e) =>
                    setSummaryPreview({ ...summaryPreview, summary: e.target.value })
                  }
                  rows={3}
                  className="mt-1 w-full px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-xs text-stone-200 leading-relaxed focus:outline-none focus:border-cyan-500 resize-none"
                />
              </div>

              {/* Themes */}
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 flex items-center gap-1 mb-1.5">
                  <Tag className="w-3 h-3 text-cyan-400" />
                  <span>Themes</span>
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {summaryPreview.themes.map((th, i) => (
                    <span
                      key={i}
                      className="px-2.5 py-1 rounded-lg bg-stone-900 border border-stone-800 text-stone-300 text-xs font-mono"
                    >
                      {th}
                    </span>
                  ))}
                </div>
              </div>

              {/* Goals */}
              {summaryPreview.goals.length > 0 && (
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 flex items-center gap-1 mb-1.5">
                    <Target className="w-3 h-3 text-indigo-400" />
                    <span>Identified Goals</span>
                  </span>
                  <ul className="space-y-1">
                    {summaryPreview.goals.map((g, i) => (
                      <li key={i} className="flex items-start gap-2 text-stone-300 text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                        <span>{g}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Open Questions */}
              {summaryPreview.openQuestions.length > 0 && (
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-stone-400 flex items-center gap-1 mb-1.5">
                    <HelpCircle className="w-3 h-3 text-cyan-400" />
                    <span>Open Questions</span>
                  </span>
                  <ul className="space-y-1">
                    {summaryPreview.openQuestions.map((q, i) => (
                      <li key={i} className="text-stone-300 text-xs italic">
                        "{q}"
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Option to sync goals to Goal Center */}
              {summaryPreview.goals.length > 0 && (
                <div className="pt-2 border-t border-stone-800 flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="export-goals-check"
                    checked={exportGoalsToPlanner}
                    onChange={(e) => setExportGoalsToPlanner(e.target.checked)}
                    className="rounded bg-stone-900 border-stone-700 text-cyan-500 focus:ring-0"
                  />
                  <label htmlFor="export-goals-check" className="text-xs text-stone-300 cursor-pointer">
                    Also export identified goals to <span className="text-indigo-400 font-semibold">Goal Center</span>
                  </label>
                </div>
              )}
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-stone-900 border-t border-stone-800 flex items-center justify-end gap-2.5">
              <button
                onClick={() => setShowSummaryModal(false)}
                className="px-4 py-2 rounded-xl text-stone-400 hover:text-stone-200 text-xs font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSaveJournal}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-semibold text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Save to Journal Vault</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
