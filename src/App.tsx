import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { Dashboard } from './components/Dashboard';
import { ConversationView } from './components/ConversationView';
import { JournalHistoryView } from './components/JournalHistoryView';
import { JournalDetailView } from './components/JournalDetailView';
import { PersonalInsightsView } from './components/PersonalInsightsView';
import { SettingsPrivacyView } from './components/SettingsPrivacyView';
import { AskMyJournalView } from './components/AskMyJournalView';
import { GoalCenterView } from './components/GoalCenterView';
import { WeeklyReflectionView } from './components/WeeklyReflectionView';
import { EmailAssistantView } from './components/EmailAssistantView';
import { CalendarAssistantView } from './components/CalendarAssistantView';
import { VoiceModeModal } from './components/VoiceModeModal';
import { VoiceAgentView } from './components/VoiceAgentView';
import { SmartActionsView } from './components/SmartActionsView';
import { FutureMeView } from './components/FutureMeView';
import { ThoughtGraphView } from './components/ThoughtGraphView';
import { ImageJournalView } from './components/ImageJournalView';
import { AIMemoryView } from './components/AIMemoryView';
import { AppView, Conversation, Goal, AIMemory } from './types';
import { getConversations, getGoals, getAIMemories } from './services/firestoreService';
import { Loader2 } from 'lucide-react';
import { GeminiAvatar } from './components/GeminiAvatar';

const AppContent: React.FC = () => {
  const { currentUser, loading } = useAuth();
  const [currentView, setCurrentView] = useState<AppView>('dashboard');
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [voiceModeOpen, setVoiceModeOpen] = useState(false);
  const [pendingPrompt, setPendingPrompt] = useState<string | null>(null);
  const [userToken, setUserToken] = useState<string>('');

  // Cached collections for fast cross-view synthesis
  const [journals, setJournals] = useState<Conversation[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [memories, setMemories] = useState<AIMemory[]>([]);

  // Fetch token and core user data on login or view change
  useEffect(() => {
    if (!currentUser) return;

    currentUser.getIdToken().then((t) => setUserToken(t));

    const loadData = async () => {
      try {
        const [jList, gList, mList] = await Promise.all([
          getConversations(currentUser.uid),
          getGoals(currentUser.uid),
          getAIMemories(currentUser.uid),
        ]);
        setJournals(jList);
        setGoals(gList);
        setMemories(mList);
      } catch (err) {
        console.error('Error prefetching data in App:', err);
      }
    };

    loadData();
  }, [currentUser, currentView]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#080b11] flex items-center justify-center text-stone-400">
        <div className="flex flex-col items-center gap-4">
          <GeminiAvatar state="thinking" size="md" pulseGlow={true} />
          <div className="flex items-center gap-2 text-xs font-mono text-cyan-400">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Opening your private Gemini vault...</span>
          </div>
        </div>
      </div>
    );
  }

  // If unauthenticated, show the public landing page with Google Sign-In
  if (!currentUser) {
    return <LandingPage />;
  }

  // Cross-view navigation handlers
  const handleStartNewConversation = () => {
    setSelectedConversationId(null);
    setPendingPrompt(null);
    setCurrentView('conversation');
  };

  const handleStartJournalWithPrompt = (prompt: string) => {
    setSelectedConversationId(null);
    setPendingPrompt(prompt);
    setCurrentView('conversation');
  };

  const handleOpenConversation = (id: string) => {
    setSelectedConversationId(id);
    setPendingPrompt(null);
    setCurrentView('conversation');
  };

  const handleOpenJournalDetail = (id: string) => {
    setSelectedConversationId(id);
    setCurrentView('detail');
  };

  const handleJournalSaved = (savedConvId: string) => {
    setSelectedConversationId(savedConvId);
    setCurrentView('detail');
  };

  const handleVoiceTranscriptReady = (transcript: string) => {
    setVoiceModeOpen(false);
    handleStartJournalWithPrompt(transcript);
  };

  const activeMemoriesText = memories.filter((m) => m.isActive).map((m) => m.content);

  return (
    <div className="min-h-screen bg-[#080b11] text-stone-100 flex flex-col selection:bg-cyan-500/20 selection:text-cyan-300 font-sans">
      <Navbar
        currentView={currentView === 'detail' ? 'history' : currentView}
        onNavigate={(view) => {
          if (view === 'conversation') {
            setSelectedConversationId(null);
            setPendingPrompt(null);
          }
          setCurrentView(view);
        }}
        onOpenVoiceMode={() => setVoiceModeOpen(true)}
      />

      <main className="flex-1">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentView}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="w-full"
          >
        {currentView === 'dashboard' && (
          <Dashboard
            onStartNewConversation={handleStartNewConversation}
            onOpenConversation={handleOpenConversation}
            onOpenJournalDetail={handleOpenJournalDetail}
            onNavigate={(v) => setCurrentView(v)}
            onOpenVoiceMode={() => setVoiceModeOpen(true)}
            onStartJournalWithPrompt={handleStartJournalWithPrompt}
            token={userToken}
          />
        )}

        {currentView === 'voice-agent' && (
          <VoiceAgentView
            token={userToken}
            userId={currentUser.uid}
            recentJournals={journals}
            activeGoals={goals}
            approvedMemories={activeMemoriesText}
            onOpenJournalDetail={handleOpenJournalDetail}
            onNavigateToGoals={() => setCurrentView('goals')}
            onNavigateToActions={() => setCurrentView('actions')}
          />
        )}

        {(currentView === 'actions' || currentView === 'smart-actions') && (
          <SmartActionsView
            userId={currentUser.uid}
            token={userToken}
            journals={journals}
            onNavigateToGoals={() => setCurrentView('goals')}
          />
        )}

        {currentView === 'future-me' && (
          <FutureMeView
            userId={currentUser.uid}
            token={userToken}
            journals={journals}
            goals={goals}
            memories={activeMemoriesText}
            onNavigateToGoals={() => setCurrentView('goals')}
          />
        )}

        {currentView === 'thought-graph' && (
          <ThoughtGraphView
            journals={journals}
            goals={goals}
            onSelectJournal={handleOpenJournalDetail}
            onStartConversationWithTopic={(topic) =>
              handleStartJournalWithPrompt(`Let's reflect on "${topic}" and explore its significance in my life.`)
            }
          />
        )}

        {currentView === 'image-journal' && (
          <ImageJournalView
            userId={currentUser.uid}
            token={userToken}
            onOpenJournalDetail={handleOpenJournalDetail}
          />
        )}

        {(currentView === 'ai-memory' || currentView === 'memory') && (
          <AIMemoryView userId={currentUser.uid} />
        )}

        {currentView === 'conversation' && (
          <ConversationView
            conversationId={selectedConversationId}
            onBack={() => setCurrentView('dashboard')}
            onJournalSaved={handleJournalSaved}
            onOpenVoiceMode={() => setVoiceModeOpen(true)}
            initialMessageToSend={pendingPrompt}
            onClearInitialMessage={() => setPendingPrompt(null)}
          />
        )}

        {(currentView === 'ask' || currentView === 'ask-journal') && (
          <AskMyJournalView
            onOpenJournalDetail={handleOpenJournalDetail}
            onStartReflectionWithPrompt={handleStartJournalWithPrompt}
          />
        )}

        {currentView === 'goals' && (
          <GoalCenterView
            onStartThinkingSession={handleStartJournalWithPrompt}
          />
        )}

        {(currentView === 'weekly' || currentView === 'weekly-reflection') && (
          <WeeklyReflectionView
            onStartReflectionPrompt={handleStartJournalWithPrompt}
          />
        )}

        {(currentView === 'email' || currentView === 'email-assistant') && (
          <EmailAssistantView
            onStartReflectionWithEmail={handleStartJournalWithPrompt}
          />
        )}

        {(currentView === 'calendar' || currentView === 'calendar-assistant') && (
          <CalendarAssistantView
            onStartReflectionWithEvent={handleStartJournalWithPrompt}
          />
        )}

        {currentView === 'history' && (
          <JournalHistoryView
            onOpenJournalDetail={handleOpenJournalDetail}
            onStartNewJournal={handleStartNewConversation}
          />
        )}

        {currentView === 'detail' && selectedConversationId && (
          <JournalDetailView
            journalId={selectedConversationId}
            onBack={() => setCurrentView('history')}
            onContinueConversation={handleOpenConversation}
            onNavigateToInsights={() => setCurrentView('insights')}
          />
        )}

        {currentView === 'insights' && (
          <PersonalInsightsView
            onStartReflectionConversation={handleStartJournalWithPrompt}
            onOpenJournalDetail={handleOpenJournalDetail}
          />
        )}

        {(currentView === 'settings' || currentView === 'security' || currentView === 'privacy') && (
          <SettingsPrivacyView />
        )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* Voice Mode Modal (Speech-to-Text Journaling) */}
      <VoiceModeModal
        isOpen={voiceModeOpen}
        onClose={() => setVoiceModeOpen(false)}
        onApplyTranscript={handleVoiceTranscriptReady}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
