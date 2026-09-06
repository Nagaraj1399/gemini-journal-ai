import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Square,
  Sparkles,
  BookOpen,
  Target,
  ArrowRight,
  RefreshCw,
  Clock,
  ListTodo,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Send,
  Radio,
} from 'lucide-react';
import { GeminiAvatar } from './GeminiAvatar';
import { GeminiAvatarState, VoiceTranscriptTurn, Conversation, Goal, SmartAction } from '../types';
import { sendVoiceTurn } from '../services/api';
import { saveVoiceSession, updateConversationSummary, createConversation, saveGoal, saveSmartAction } from '../services/firestoreService';

interface VoiceAgentViewProps {
  token: string;
  userId: string;
  recentJournals: Conversation[];
  activeGoals: Goal[];
  approvedMemories?: string[];
  onOpenJournalDetail: (id: string) => void;
  onNavigateToGoals: () => void;
  onNavigateToActions: () => void;
}

export const VoiceAgentView: React.FC<VoiceAgentViewProps> = ({
  token,
  userId,
  recentJournals,
  activeGoals,
  approvedMemories = [],
  onOpenJournalDetail,
  onNavigateToGoals,
  onNavigateToActions,
}) => {
  const [avatarState, setAvatarState] = useState<GeminiAvatarState>('idle');
  const [isListening, setIsListening] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [transcript, setTranscript] = useState<VoiceTranscriptTurn[]>([]);
  const [currentSpeechInput, setCurrentSpeechInput] = useState('');
  const [textInputFallback, setTextInputFallback] = useState('');
  const [sessionStartTime] = useState(Date.now());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Journal conversion state
  const [suggestedDraft, setSuggestedDraft] = useState<{
    title: string;
    summary: string;
    themes: string[];
    goals: string[];
    openQuestions: string[];
  } | null>(null);
  const [savedJournalId, setSavedJournalId] = useState<string | null>(null);
  const [isSavingJournal, setIsSavingJournal] = useState(false);

  // Detected Actions state
  const [detectedActions, setDetectedActions] = useState<Array<{
    title: string;
    category: 'Work' | 'Personal' | 'Communication' | 'Wellness' | 'Learning';
    urgency: 'high' | 'medium' | 'low';
    saved?: boolean;
  }>>([]);

  const [notification, setNotification] = useState<string | null>(null);

  // Speech Recognition reference
  const recognitionRef = useRef<any>(null);
  const isSpeakingRef = useRef<boolean>(false);
  const transcriptEndRef = useRef<HTMLDivElement>(null);

  // Timer for session duration
  useEffect(() => {
    const timer = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - sessionStartTime) / 1000));
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStartTime]);

  // Scroll transcript to bottom
  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript, currentSpeechInput]);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        if (avatarState !== 'speaking') {
          setAvatarState('listening');
        }
      };

      recognition.onresult = (event: any) => {
        // If user speaks while AI is speaking, interrupt immediately!
        if (isSpeakingRef.current) {
          interruptSpeech();
        }

        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const trans = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            final += trans;
          } else {
            interim += trans;
          }
        }

        if (interim) {
          setCurrentSpeechInput(interim);
          setAvatarState('listening');
        }

        if (final.trim()) {
          setCurrentSpeechInput('');
          handleUserSpeechSubmit(final.trim());
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('[SPEECH_REC_ERROR]', event.error);
        if (event.error !== 'no-speech') {
          setAvatarState('idle');
          setIsListening(false);
        }
      };

      recognition.onend = () => {
        if (isListening) {
          try {
            recognition.start();
          } catch {
            setIsListening(false);
          }
        }
      };

      recognitionRef.current = recognition;
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, [isListening]);

  // Interruption handler
  const interruptSpeech = () => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    isSpeakingRef.current = false;
    setAvatarState('listening');
  };

  // Toggle Microphone
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      setAvatarState('idle');
    } else {
      interruptSpeech();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
          setAvatarState('listening');
        } catch {
          setIsListening(true);
        }
      } else {
        setIsListening(true);
        setAvatarState('listening');
      }
    }
  };

  // Text-to-speech speak function
  const speakText = (text: string) => {
    if (isMuted || !('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    isSpeakingRef.current = true;
    setAvatarState('speaking');

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;

    // Pick a natural English voice if available
    const voices = window.speechSynthesis.getVoices();
    const naturalVoice = voices.find(
      (v) => (v.name.includes('Google') || v.name.includes('Natural') || v.name.includes('Samantha') || v.name.includes('Daniel')) && v.lang.startsWith('en')
    );
    if (naturalVoice) {
      utterance.voice = naturalVoice;
    }

    utterance.onend = () => {
      isSpeakingRef.current = false;
      setAvatarState(isListening ? 'listening' : 'idle');
    };

    utterance.onerror = () => {
      isSpeakingRef.current = false;
      setAvatarState(isListening ? 'listening' : 'idle');
    };

    window.speechSynthesis.speak(utterance);
  };

  // Process user speech or typed input
  const handleUserSpeechSubmit = async (speechText: string) => {
    if (!speechText.trim()) return;

    // Interrupt any active speech
    interruptSpeech();

    const userTurn: VoiceTranscriptTurn = {
      role: 'user',
      text: speechText,
      timestamp: Date.now(),
    };

    const newTranscript = [...transcript, userTurn];
    setTranscript(newTranscript);
    setAvatarState('thinking');

    try {
      // Build context from user's authenticated records
      const userContext = {
        recentJournals: recentJournals.slice(0, 5).map((j) => ({
          title: j.title,
          summary: j.summary || '',
          themes: j.themes || [],
          date: new Date(j.createdAt).toLocaleDateString(),
        })),
        activeGoals: activeGoals.slice(0, 5).map((g) => ({
          title: g.title,
          progress: g.progress,
        })),
        memories: approvedMemories,
      };

      const result = await sendVoiceTurn(token, {
        latestUserSpeech: speechText,
        transcriptHistory: newTranscript.map((t) => ({ role: t.role, text: t.text })),
        userContext,
      });

      const geminiTurn: VoiceTranscriptTurn = {
        role: 'gemini',
        text: result.spokenReply,
        timestamp: Date.now(),
      };

      setTranscript((prev) => [...prev, geminiTurn]);

      if (result.shouldOfferJournalConversion && result.suggestedJournalDraft) {
        setSuggestedDraft(result.suggestedJournalDraft);
      }

      if (result.detectedActions && result.detectedActions.length > 0) {
        setDetectedActions((prev) => [
          ...result.detectedActions.map((a) => ({ ...a, saved: false })),
          ...prev,
        ]);
      }

      speakText(result.spokenReply);
    } catch (err) {
      console.error('[VOICE_TURN_ERROR]', err);
      setAvatarState('error');
      const errorTurn: VoiceTranscriptTurn = {
        role: 'gemini',
        text: "I'm having trouble processing that right now. Please try again.",
        timestamp: Date.now(),
      };
      setTranscript((prev) => [...prev, errorTurn]);
      setTimeout(() => setAvatarState(isListening ? 'listening' : 'idle'), 3000);
    }
  };

  // Convert Voice Session into a Saved Journal Entry
  const handleSaveAsJournal = async () => {
    if (!suggestedDraft || isSavingJournal) return;
    setIsSavingJournal(true);

    try {
      const convId = await createConversation(userId, suggestedDraft.title);
      await updateConversationSummary(userId, convId, suggestedDraft);

      setSavedJournalId(convId);
      setNotification(`Saved as journal: "${suggestedDraft.title}"`);
      setTimeout(() => setNotification(null), 4000);
    } catch (err) {
      console.error('Failed to save journal:', err);
      setNotification('Failed to save journal entry. Please try again.');
      setTimeout(() => setNotification(null), 4000);
    } finally {
      setIsSavingJournal(false);
    }
  };

  // Save detected action
  const handleSaveAction = async (index: number) => {
    const action = detectedActions[index];
    if (!action || action.saved) return;

    try {
      await saveSmartAction(userId, {
        title: action.title,
        category: action.category,
        urgency: action.urgency,
        status: 'pending',
        sourceType: 'voice',
      });

      setDetectedActions((prev) =>
        prev.map((a, i) => (i === index ? { ...a, saved: true } : a))
      );
      setNotification(`Action saved: "${action.title}"`);
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error('Failed to save action:', err);
    }
  };

  // Convert action to goal
  const handleConvertActionToGoal = async (index: number) => {
    const action = detectedActions[index];
    if (!action) return;

    try {
      await saveGoal(userId, {
        title: action.title,
        description: `Created from Voice Agent reflection. Urgency: ${action.urgency}`,
        category: action.category,
        status: 'In Progress',
        progress: 10,
        tasks: [
          { id: `t-1`, title: 'Define first milestone', completed: false },
          { id: `t-2`, title: 'Execute primary task', completed: false },
        ],
      });

      setDetectedActions((prev) =>
        prev.map((a, i) => (i === index ? { ...a, saved: true } : a))
      );
      setNotification(`Goal created: "${action.title}"`);
      setTimeout(() => setNotification(null), 3000);
    } catch (err) {
      console.error('Failed to create goal:', err);
    }
  };

  // End Session and persist record
  const handleEndSession = async () => {
    interruptSpeech();
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
    setIsListening(false);
    setAvatarState('idle');

    if (transcript.length > 0) {
      try {
        await saveVoiceSession(userId, {
          transcript,
          durationSeconds: elapsedSeconds,
          summary: suggestedDraft?.summary || 'Voice reflection session',
          journalConverted: !!savedJournalId,
          convertedJournalId: savedJournalId || undefined,
        });
        setNotification('Voice session archived securely in your private history.');
        setTimeout(() => setNotification(null), 3000);
      } catch (err) {
        console.error('Failed to save voice session:', err);
      }
    }
  };

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins}:${s < 10 ? '0' : ''}${s}`;
  };

  const quickPrompts = [
    'What have I been thinking about lately?',
    'What are my biggest active goals?',
    'What did I write about this week?',
    'What should I focus on tomorrow?',
    'Show me patterns in my journal',
  ];

  return (
    <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 py-6" id="voice-agent-container">
      {/* Top Bar / Status Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 mb-6 border-b border-white/5 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Radio className="w-3.5 h-3.5 animate-pulse text-cyan-400" />
              Live AI Voice Agent
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              {formatTime(elapsedSeconds)}
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">
            Conversational Thinking Space
          </h1>
          <p className="text-sm text-slate-400">
            Talk naturally with Gemini. Ask about your past reflections, voice-log thoughts, or extract actions.
          </p>
        </div>

        {/* Quick controls */}
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <button
            onClick={() => setIsMuted(!isMuted)}
            className={`p-2.5 rounded-xl border transition-all text-sm flex items-center gap-1.5 ${
              isMuted
                ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                : 'bg-slate-800/80 border-white/10 text-slate-300 hover:text-white'
            }`}
            title={isMuted ? 'Unmute Gemini Voice' : 'Mute Gemini Voice'}
            id="voice-mute-toggle-btn"
          >
            {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <span className="text-xs">{isMuted ? 'Muted' : 'Audio On'}</span>
          </button>

          {avatarState === 'speaking' && (
            <button
              onClick={interruptSpeech}
              className="px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium flex items-center gap-1.5 hover:bg-amber-500/20 transition-all"
              id="voice-interrupt-btn"
            >
              <Square className="w-3.5 h-3.5" />
              Interrupt
            </button>
          )}

          <button
            onClick={handleEndSession}
            className="px-3.5 py-2 rounded-xl bg-slate-800 border border-white/10 hover:border-rose-500/30 text-slate-300 hover:text-rose-300 text-xs font-medium transition-all"
            id="voice-end-session-btn"
          >
            End Session
          </button>
        </div>
      </div>

      {/* Notification toast */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="mb-4 p-3 rounded-xl bg-cyan-950/80 border border-cyan-500/30 text-cyan-200 text-xs flex items-center justify-between"
          >
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-cyan-400" />
              {notification}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid: Center Stage & Side Panel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* CENTER STAGE: Avatar & Interaction Hub */}
        <div className="lg:col-span-7 flex flex-col items-center justify-between p-6 sm:p-8 rounded-2xl bg-slate-900/60 border border-white/5 backdrop-blur-md min-h-[520px]">
          {/* Status Indicator */}
          <div className="w-full flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  avatarState === 'speaking'
                    ? 'bg-emerald-400 animate-ping'
                    : avatarState === 'listening'
                    ? 'bg-cyan-400 animate-pulse'
                    : avatarState === 'thinking'
                    ? 'bg-indigo-400 animate-spin'
                    : 'bg-slate-500'
                }`}
              />
              State: <strong className="text-white capitalize">{avatarState}</strong>
            </span>
            <span className="text-slate-400 text-2xl font-mono">
              {formatTime(elapsedSeconds)}
            </span>
          </div>

          {/* Central Animated Robot Avatar */}
          <div className="my-8 flex flex-col items-center justify-center">
            <GeminiAvatar
              state={avatarState}
              size="hero"
              showStatusBadge
              className="transform hover:scale-105 transition-transform duration-300"
            />

            {/* Dynamic Waveform Visualizer Bars */}
            <div className="flex items-center justify-center gap-1 mt-6 h-8 w-48">
              {[...Array(16)].map((_, i) => (
                <motion.div
                  key={i}
                  className={`w-1 rounded-full ${
                    avatarState === 'speaking'
                      ? 'bg-gradient-to-t from-teal-500 to-cyan-400'
                      : avatarState === 'listening'
                      ? 'bg-gradient-to-t from-cyan-500 to-sky-300'
                      : avatarState === 'thinking'
                      ? 'bg-gradient-to-t from-indigo-500 to-purple-400'
                      : 'bg-slate-700'
                  }`}
                  animate={{
                    height:
                      avatarState === 'speaking' || avatarState === 'listening'
                        ? [4, Math.sin(i + Date.now() / 200) * 24 + 16, 6]
                        : avatarState === 'thinking'
                        ? [6, 14, 6]
                        : 4,
                  }}
                  transition={{
                    duration: 0.4 + (i % 4) * 0.15,
                    repeat: Infinity,
                    ease: 'easeInOut',
                  }}
                />
              ))}
            </div>

            {/* Interim live speech display */}
            {currentSpeechInput && (
              <p className="mt-4 text-center text-cyan-300 text-sm italic px-4 py-1.5 rounded-full bg-cyan-950/40 border border-cyan-500/20 max-w-md">
                "{currentSpeechInput}..."
              </p>
            )}
          </div>

          {/* Bottom Voice Controls */}
          <div className="w-full flex flex-col items-center gap-4">
            <div className="flex items-center gap-4">
              <button
                onClick={toggleListening}
                className={`p-5 rounded-full border shadow-lg transition-all duration-300 transform active:scale-95 flex items-center justify-center ${
                  isListening
                    ? 'bg-cyan-500 text-slate-950 border-cyan-300 shadow-cyan-500/30 animate-pulse'
                    : 'bg-slate-800 text-white border-white/20 hover:border-cyan-400 hover:bg-slate-700'
                }`}
                title={isListening ? 'Click to pause mic' : 'Click to start speaking'}
                id="voice-mic-main-btn"
              >
                {isListening ? <Mic className="w-7 h-7" /> : <MicOff className="w-7 h-7" />}
              </button>
            </div>

            <p className="text-xs text-slate-400 text-center">
              {isListening
                ? 'Listening... Speak naturally or interrupt anytime.'
                : 'Microphone is paused. Tap the icon to start speaking.'}
            </p>

            {/* Text input fallback for environments without microphone */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (textInputFallback.trim()) {
                  handleUserSpeechSubmit(textInputFallback.trim());
                  setTextInputFallback('');
                }
              }}
              className="w-full max-w-lg flex items-center gap-2 mt-2"
            >
              <input
                type="text"
                value={textInputFallback}
                onChange={(e) => setTextInputFallback(e.target.value)}
                placeholder="Type a message or question..."
                className="flex-1 bg-slate-950/70 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
                id="voice-text-fallback-input"
              />
              <button
                type="submit"
                disabled={!textInputFallback.trim()}
                className="p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-40 text-slate-950 font-medium transition-colors"
                id="voice-text-send-btn"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>

            {/* Suggested reflection prompts */}
            <div className="w-full mt-2 pt-4 border-t border-white/5">
              <p className="text-xs text-slate-400 mb-2 font-medium">Quick Prompts to Speak or Tap:</p>
              <div className="flex flex-wrap gap-1.5">
                {quickPrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleUserSpeechSubmit(prompt)}
                    className="text-xs px-2.5 py-1 rounded-lg bg-slate-800/80 hover:bg-cyan-950/60 border border-white/5 hover:border-cyan-500/30 text-slate-300 hover:text-cyan-200 transition-all text-left"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SIDE PANEL: Live Transcript & Smart Action Integrations */}
        <div className="lg:col-span-5 flex flex-col gap-5">
          {/* Offer to Convert into Journal Entry (Appears when reflection detected) */}
          <AnimatePresence>
            {suggestedDraft && !savedJournalId && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="p-4 rounded-2xl bg-gradient-to-br from-indigo-950/80 to-slate-900/90 border border-indigo-500/40 shadow-xl"
                id="voice-save-journal-card"
              >
                <div className="flex items-center gap-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider mb-2">
                  <Sparkles className="w-4 h-4 text-indigo-400" />
                  Convert to Private Journal Entry?
                </div>
                <h3 className="text-base font-bold text-white mb-1">{suggestedDraft.title}</h3>
                <p className="text-xs text-slate-300 line-clamp-3 mb-3">{suggestedDraft.summary}</p>
                <div className="flex items-center justify-between gap-2">
                  <button
                    onClick={() => setSuggestedDraft(null)}
                    className="text-xs text-slate-400 hover:text-white px-2 py-1"
                  >
                    Dismiss
                  </button>
                  <button
                    onClick={handleSaveAsJournal}
                    disabled={isSavingJournal}
                    className="px-3.5 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white font-medium text-xs flex items-center gap-1.5 shadow-lg shadow-indigo-500/25 transition-all"
                    id="voice-confirm-save-journal-btn"
                  >
                    {isSavingJournal ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <BookOpen className="w-3.5 h-3.5" />
                    )}
                    Save to My Journal
                  </button>
                </div>
              </motion.div>
            )}

            {savedJournalId && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 rounded-2xl bg-emerald-950/70 border border-emerald-500/30 flex items-center justify-between"
              >
                <div className="flex items-center gap-2 text-emerald-300 text-xs">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Saved to your private journal history!</span>
                </div>
                <button
                  onClick={() => onOpenJournalDetail(savedJournalId)}
                  className="text-xs text-emerald-300 hover:text-emerald-100 underline font-medium"
                >
                  View Entry
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Detected Smart Actions from Speech */}
          {detectedActions.length > 0 && (
            <div className="p-4 rounded-2xl bg-slate-900/60 border border-white/5" id="voice-detected-actions-panel">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <ListTodo className="w-4 h-4 text-cyan-400" />
                  <span className="text-xs font-semibold text-white uppercase tracking-wider">
                    Detected Action Items
                  </span>
                </div>
                <button
                  onClick={onNavigateToActions}
                  className="text-xs text-cyan-400 hover:underline flex items-center gap-1"
                >
                  Manage All
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>

              <div className="space-y-2">
                {detectedActions.map((action, idx) => (
                  <div
                    key={idx}
                    className="p-2.5 rounded-xl bg-slate-950/60 border border-white/5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
                  >
                    <div className="flex-1">
                      <p className="text-xs font-medium text-slate-200">{action.title}</p>
                      <span className="inline-block mt-0.5 text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-400">
                        {action.category} • {action.urgency} urgency
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                      {action.saved ? (
                        <span className="text-[11px] text-emerald-400 flex items-center gap-1 px-2 py-1">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Saved
                        </span>
                      ) : (
                        <>
                          <button
                            onClick={() => handleSaveAction(idx)}
                            className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-[11px] transition-colors"
                          >
                            Save Action
                          </button>
                          <button
                            onClick={() => handleConvertActionToGoal(idx)}
                            className="px-2 py-1 rounded bg-cyan-600/80 hover:bg-cyan-500 text-slate-950 font-medium text-[11px] transition-colors"
                          >
                            Add to Goals
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Live Transcript Stream */}
          <div className="flex-1 flex flex-col p-4 rounded-2xl bg-slate-900/60 border border-white/5 overflow-hidden min-h-[280px]">
            <div className="flex items-center justify-between pb-3 border-b border-white/5 mb-3">
              <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-cyan-400" />
                Session Transcript
              </span>
              <span className="text-[11px] text-slate-500">
                {transcript.length} turn{transcript.length === 1 ? '' : 's'}
              </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[360px]">
              {transcript.length === 0 ? (
                <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
                  <Mic className="w-8 h-8 mb-2 opacity-30 text-cyan-400" />
                  <p className="text-xs">
                    Start speaking to initiate your voice session. Your transcript will stream here in real time.
                  </p>
                </div>
              ) : (
                transcript.map((turn, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl text-xs leading-relaxed ${
                      turn.role === 'user'
                        ? 'bg-slate-800/80 border border-white/5 text-slate-200 ml-4'
                        : 'bg-cyan-950/40 border border-cyan-500/20 text-cyan-100 mr-4'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1 text-[10px] text-slate-400">
                      <span className="font-semibold text-slate-300">
                        {turn.role === 'user' ? 'You' : 'Gemini'}
                      </span>
                      <span>
                        {new Date(turn.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p>{turn.text}</p>
                  </div>
                ))
              )}
              <div ref={transcriptEndRef} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
