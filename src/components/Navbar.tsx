import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { AppView } from '../types';
import { GeminiAvatar } from './GeminiAvatar';
import {
  BookOpen,
  Sparkles,
  ShieldCheck,
  Compass,
  LogOut,
  Target,
  CalendarDays,
  Mail,
  Mic,
  Search,
  Menu,
  X,
  LayoutDashboard,
  Calendar,
  ListTodo,
  Share2,
  Camera,
  Brain,
  Shield,
  Lock,
} from 'lucide-react';

interface NavbarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
  onOpenVoiceMode: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  onNavigate,
  onOpenVoiceMode,
}) => {
  const { currentUser, signOut } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Primary navigation items
  const primaryNavItems: { id: AppView; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: 'Command Center', icon: <LayoutDashboard className="w-3.5 h-3.5" /> },
    { id: 'voice-agent', label: 'Voice Agent', icon: <Mic className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> },
    { id: 'conversation', label: 'Journal', icon: <Sparkles className="w-3.5 h-3.5 text-cyan-400" /> },
    { id: 'actions', label: 'Actions', icon: <ListTodo className="w-3.5 h-3.5 text-cyan-400" /> },
    { id: 'future-me', label: 'Future Me', icon: <Compass className="w-3.5 h-3.5 text-purple-400" /> },
    { id: 'thought-graph', label: 'Thought Graph', icon: <Share2 className="w-3.5 h-3.5 text-sky-400" /> },
    { id: 'image-journal', label: 'Image Journal', icon: <Camera className="w-3.5 h-3.5 text-amber-400" /> },
    { id: 'ask', label: 'Ask Journal', icon: <Search className="w-3.5 h-3.5 text-indigo-400" /> },
    { id: 'goals', label: 'Goals', icon: <Target className="w-3.5 h-3.5 text-emerald-400" /> },
    { id: 'weekly', label: 'Weekly', icon: <CalendarDays className="w-3.5 h-3.5 text-purple-400" /> },
    { id: 'ai-memory', label: 'Memory', icon: <Brain className="w-3.5 h-3.5 text-cyan-400" /> },
    { id: 'settings', label: 'Privacy & Audit', icon: <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-xl border-b border-white/10 shadow-lg">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Robot Avatar */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate('dashboard')}
              className="flex items-center gap-2.5 text-left group focus:outline-none"
              id="brand-logo-btn"
            >
              <div className="relative">
                <GeminiAvatar state="idle" size="sm" pulseGlow={true} />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-sm sm:text-base tracking-tight text-white group-hover:text-cyan-400 transition-colors">
                    GEMINI JOURNAL
                  </span>
                  <span className="hidden sm:inline-block text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-950 border border-cyan-500/30 text-cyan-300">
                    PRO
                  </span>
                </div>
                <span className="text-[10px] text-slate-400 font-mono block leading-none">
                  Private AI Thinking Space
                </span>
              </div>
            </button>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden xl:flex items-center gap-1">
            {primaryNavItems.slice(0, 8).map((item) => {
              const isActive =
                currentView === item.id ||
                (item.id === 'actions' && currentView === 'smart-actions') ||
                (item.id === 'ai-memory' && currentView === 'memory');

              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`px-2.5 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-slate-800 text-cyan-300 border border-white/10 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/80'
                  }`}
                  id={`nav-${item.id}`}
                >
                  {item.icon}
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* More views dropdown or remaining items */}
            <div className="relative group">
              <button className="px-2.5 py-1.5 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-900 flex items-center gap-1">
                <span>More</span>
                <span className="text-[10px]">▾</span>
              </button>
              <div className="absolute right-0 top-full mt-1 w-48 py-1.5 bg-slate-900 border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                {primaryNavItems.slice(8).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => onNavigate(item.id)}
                    className="w-full text-left px-3 py-2 text-xs text-slate-300 hover:text-white hover:bg-slate-800/80 flex items-center gap-2 transition-colors"
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </nav>

          {/* Secondary Actions: Quick Voice Mode & Profile */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('voice-agent')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 text-xs font-semibold transition-all shadow-sm"
              title="Launch AI Voice Agent"
              id="talk-to-gemini-btn"
            >
              <Mic className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
              <span className="hidden sm:inline">Voice Agent</span>
            </button>

            {/* User Profile Pill */}
            {currentUser && (
              <div className="flex items-center gap-2 pl-2 border-l border-white/10">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User Profile'}
                    className="w-7 h-7 rounded-full border border-white/10 object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-slate-800 text-slate-300 border border-white/10 flex items-center justify-center text-xs font-bold">
                    {currentUser.email?.[0].toUpperCase() || 'U'}
                  </div>
                )}

                <button
                  onClick={signOut}
                  className="p-1.5 rounded-lg text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
                  title="Sign out securely"
                  id="sign-out-btn"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* Mobile Hamburger Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-white/10"
              aria-label="Toggle navigation menu"
              id="mobile-nav-toggle-btn"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Dropdown */}
        {mobileMenuOpen && (
          <div className="xl:hidden py-3 border-t border-white/10 space-y-1">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-1">
              {primaryNavItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    onNavigate(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`p-2.5 rounded-xl text-xs font-medium transition-all flex items-center gap-2 ${
                    currentView === item.id
                      ? 'bg-slate-800 text-cyan-300 border border-white/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  {item.icon}
                  <span className="truncate">{item.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </header>
  );
};
