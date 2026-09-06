import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { GeminiAvatar } from './GeminiAvatar';
import {
  ShieldCheck,
  Sparkles,
  Compass,
  Lock,
  ArrowRight,
  AlertCircle,
  Mail,
  Target,
  ChevronDown,
  Layers,
  KeyRound,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { signInWithGoogle, loading, authError, clearAuthError } = useAuth();

  const handleScrollToFeatures = () => {
    const el = document.getElementById('ai-space-features');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="min-h-screen bg-[#080b11] text-stone-100 flex flex-col justify-between selection:bg-cyan-500/20 selection:text-cyan-300 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/3 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 left-1/4 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Header Bar */}
      <header className="relative z-10 border-b border-stone-800/80 bg-stone-950/70 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <GeminiAvatar state="idle" size="sm" pulseGlow={true} />
            <div>
              <span className="font-bold text-base tracking-tight text-stone-100">
                GEMINI JOURNAL
              </span>
              <span className="text-[10px] text-stone-400 font-mono block leading-none">
                Your Private AI Thinking Space
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs font-mono text-emerald-400 bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-500/30">
              <Lock className="w-3.5 h-3.5" />
              <span>Zero Model Training · Isolated UID Vault</span>
            </div>

            <button
              onClick={() => signInWithGoogle()}
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-semibold text-xs transition-all shadow-md shadow-cyan-500/20 disabled:opacity-50"
              id="header-sign-in-btn"
            >
              Sign In
            </button>
          </div>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="relative z-10 flex-1 max-w-5xl mx-auto px-4 py-12 sm:py-20 flex flex-col items-center text-center">
        {/* Central Privacy Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-xs font-mono text-cyan-300 mb-8 shadow-inner">
          <ShieldCheck className="w-4 h-4 text-cyan-400" />
          <span>Private by Design · Google Cloud Secret Manager & Strict Firestore Rules</span>
        </div>

        {/* Hero Headline */}
        <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-stone-100 max-w-3xl leading-[1.1] mb-5">
          Think Better With Gemini.
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-stone-400 max-w-2xl leading-relaxed mb-8">
          Your private AI space to journal, brainstorm, reflect, and turn thoughts into meaningful action.
        </p>

        {/* Prominent Gemini Robot Avatar */}
        <div className="my-6 relative flex items-center justify-center">
          <GeminiAvatar
            state="idle"
            size="hero"
            showStatusBadge={true}
            pulseGlow={true}
          />
        </div>

        {/* Auth Error Banner if popup blocked */}
        {authError && (
          <div className="mb-6 p-4 max-w-md w-full rounded-2xl bg-rose-950/60 border border-rose-800 text-left text-xs text-rose-300 flex items-start gap-3 shadow-lg">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold mb-1">Authentication Notice</p>
              <p>{authError}</p>
              <button
                onClick={clearAuthError}
                className="mt-2 underline font-medium hover:text-rose-100"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Primary and Secondary CTA Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4 mb-16">
          <button
            onClick={() => signInWithGoogle()}
            disabled={loading}
            className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-bold text-sm sm:text-base transition-all shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-3 group cursor-pointer disabled:opacity-50"
            id="start-journaling-btn"
          >
            {/* Google Icon */}
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Start Journaling with Google</span>
            <ArrowRight className="w-4 h-4 text-stone-950 transition-transform group-hover:translate-x-0.5" />
          </button>

          <button
            onClick={handleScrollToFeatures}
            className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-stone-900/80 hover:bg-stone-800 border border-stone-800 text-stone-300 hover:text-stone-100 font-medium text-sm sm:text-base transition-colors flex items-center justify-center gap-2"
          >
            <span>Explore Your AI Space</span>
            <ChevronDown className="w-4 h-4" />
          </button>
        </div>

        {/* 5 Feature Cards (Prompt Section 5) */}
        <section id="ai-space-features" className="w-full pt-8 text-left space-y-4">
          <div className="text-xs font-mono uppercase tracking-wider text-cyan-400 text-center mb-6">
            Architected for High-Trust Personal Cognition
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* 1. Private by Design */}
            <div className="p-6 rounded-3xl bg-stone-900/70 border border-stone-800 hover:border-cyan-500/30 transition-all space-y-3 shadow-xl">
              <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-stone-100">1. Private by Design</h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Zero model training on your thoughts. Every byte is isolated using Firestore least-privilege security rules keyed strictly to your authenticated UID.
              </p>
            </div>

            {/* 2. Gemini Intelligence */}
            <div className="p-6 rounded-3xl bg-stone-900/70 border border-stone-800 hover:border-cyan-500/30 transition-all space-y-3 shadow-xl">
              <div className="w-10 h-10 rounded-xl bg-indigo-950/60 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-stone-100">2. Gemini Intelligence</h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Thoughtful conversational reflection, automatic journal summarization, and idea structuring powered by Google AI Studio server-side credentials.
              </p>
            </div>

            {/* 3. Personal Insights */}
            <div className="p-6 rounded-3xl bg-stone-900/70 border border-stone-800 hover:border-cyan-500/30 transition-all space-y-3 shadow-xl">
              <div className="w-10 h-10 rounded-xl bg-purple-950/60 border border-purple-500/30 flex items-center justify-center text-purple-400">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-stone-100">3. Personal Insights</h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Longitudinal pattern detection, recurring themes analysis, and semantic querying ("Ask My Journal") across your personal history.
              </p>
            </div>

            {/* 4. Email Intelligence */}
            <div className="p-6 rounded-3xl bg-stone-900/70 border border-stone-800 hover:border-cyan-500/30 transition-all space-y-3 shadow-xl">
              <div className="w-10 h-10 rounded-xl bg-sky-950/60 border border-sky-500/30 flex items-center justify-center text-sky-400">
                <Mail className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-stone-100">4. Email Intelligence</h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Reflect mindfully on important messages with "Reflect on this Email". Zero raw email storage; transient synthesis only.
              </p>
            </div>

            {/* 5. Goal Tracking */}
            <div className="p-6 rounded-3xl bg-stone-900/70 border border-stone-800 hover:border-cyan-500/30 transition-all space-y-3 shadow-xl">
              <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Target className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-stone-100">5. Goal Tracking</h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Turn thoughts into measurable outcomes with Gemini milestone breakdowns and full user editorial control.
              </p>
            </div>

            {/* 6. Voice Journal Mode */}
            <div className="p-6 rounded-3xl bg-stone-900/70 border border-stone-800 hover:border-cyan-500/30 transition-all space-y-3 shadow-xl">
              <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <Layers className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-stone-100">6. Voice Journal Mode</h3>
              <p className="text-xs text-stone-400 leading-relaxed">
                Talk to Gemini using live on-device speech recognition with responsive audio visualizers and seamless transcript conversion.
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-stone-800/80 bg-stone-950/80 py-8">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-stone-500">
          <div>
            <span>GEMINI JOURNAL — AI that thinks with you, while keeping your thoughts private.</span>
          </div>
          <div className="flex items-center gap-4">
            <span>Powered by Gemini & Google Cloud</span>
            <span>•</span>
            <span className="text-emerald-400">UID-Isolated Cloud Firestore</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
