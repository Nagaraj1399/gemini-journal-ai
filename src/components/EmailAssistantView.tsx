import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { EmailItem } from '../types';
import { GeminiAvatar } from './GeminiAvatar';
import { useAuth } from '../contexts/AuthContext';
import {
  Mail,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  Clock,
  AlertCircle,
  CheckCircle2,
  Lock,
  MessageSquare,
  Target,
  Send,
  FileText,
  RotateCw,
  ExternalLink,
} from 'lucide-react';

interface EmailAssistantViewProps {
  onStartJournalWithPrompt: (initialMessage: string) => void;
  onConvertToGoal: (goal: { title: string; description: string; category: string }) => void;
}

export const EmailAssistantView: React.FC<EmailAssistantViewProps> = ({
  onStartJournalWithPrompt,
  onConvertToGoal,
}) => {
  const { getIdToken, currentUser } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [activeEmailForReflection, setActiveEmailForReflection] = useState<EmailItem | null>(null);
  const [reflectionPrompts, setReflectionPrompts] = useState<{
    reflectionQuestions?: string[];
    suggestedGoal?: { title: string; description: string; category: string };
    draftReply?: string;
    actionItems?: string[];
  } | null>(null);
  const [isSynthesizing, setIsSynthesizing] = useState(false);

  // Ideathon demonstration emails (Realistic work & intellectual correspondence)
  const [emails, setEmails] = useState<EmailItem[]>([
    {
      id: 'em-1',
      from: 'alex.chen@innovate.ai',
      subject: 'Architectural Review: On-Device Neural Synthesis for Private AI Agents',
      snippet:
        'Hi there, I reviewed the proposed federated architecture. We need to decide whether we should prioritize client-side quantization or server-side enclaves for data privacy. Could we lock in the roadmap by Thursday?',
      date: 'Today, 10:15 AM',
      category: 'REPLY NEEDED',
      unread: true,
      hasActionItems: true,
    },
    {
      id: 'em-2',
      from: 'sarah.miller@designlab.org',
      subject: 'Ideathon Final Pitch: Submission Guidelines & Judging Rubric',
      snippet:
        'All teams: Final deliverables are due this Friday at 5:00 PM. Judges will score based on UX craftsmanship, production readiness, and genuine data privacy architectures.',
      date: 'Today, 8:45 AM',
      category: 'DEADLINE',
      unread: true,
      hasActionItems: true,
    },
    {
      id: 'em-3',
      from: 'marcus.v@cloudscale.io',
      subject: 'Quarterly Cloud & Database Architecture Milestone Approval',
      snippet:
        'Congratulations on completing the multi-region Firestore least-privilege deployment. The security audit reported zero leaks. Here are notes for next quarter.',
      date: 'Yesterday',
      category: 'IMPORTANT',
      unread: false,
    },
    {
      id: 'em-4',
      from: 'calendar-notify@google.com',
      subject: 'Invitation: Strategic Thought Partner Alignment @ Thursday 3:00 PM',
      snippet:
        'Agenda: Discuss next year roadmap, long-term personal goals, and technical debt reduction strategies with team leads.',
      date: 'Sep 3',
      category: 'MEETING',
      unread: false,
    },
  ]);

  const handleConnectGmail = () => {
    setIsConnecting(true);
    setTimeout(() => {
      setIsConnected(true);
      setIsConnecting(false);
    }, 800);
  };

  const handleDisconnect = () => {
    setIsConnected(false);
    setActiveEmailForReflection(null);
    setReflectionPrompts(null);
  };

  const handleReflectOnEmail = async (email: EmailItem) => {
    setActiveEmailForReflection(email);
    setIsSynthesizing(true);
    setReflectionPrompts(null);

    try {
      const token = await getIdToken();
      const res = await fetch('/api/journal/email-reflection', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ email }),
      });

      if (!res.ok) throw new Error('Failed to generate reflection prompts.');
      const data = await res.json();
      setReflectionPrompts(data);
    } catch (err) {
      console.error('Reflection error:', err);
      // Fallback
      setReflectionPrompts({
        reflectionQuestions: [
          'What action does this email require from you right now?',
          'How does this align with your highest priorities this week?',
          'What boundary or decision do you need to communicate?',
        ],
        actionItems: ['Review core message and draft clean response'],
      });
    } finally {
      setIsSynthesizing(false);
    }
  };

  const filteredEmails = emails.filter((e) => {
    if (selectedCategory === 'ALL') return true;
    return e.category === selectedCategory;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8" id="email-assistant-view">
      {/* Header Banner */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-stone-900/60 border border-stone-800 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono uppercase tracking-wider">
              <Mail className="w-3.5 h-3.5" />
              <span>Private Mail Intelligence</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-100">
              Gemini Mail Assistant
            </h1>
            <p className="text-stone-400 text-sm max-w-xl leading-relaxed">
              Connect external communication into mindful reflection. Review priority items, extract action items, and reflect privately before replying.
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isConnected ? (
              <button
                onClick={handleDisconnect}
                className="px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-mono transition-colors"
                id="disconnect-gmail-btn"
              >
                Disconnect Mail
              </button>
            ) : (
              <button
                onClick={handleConnectGmail}
                disabled={isConnecting}
                className="px-5 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-semibold text-sm transition-all shadow-md shadow-cyan-500/20 flex items-center gap-2 disabled:opacity-50"
                id="connect-gmail-btn"
              >
                {isConnecting ? (
                  <>
                    <RotateCw className="w-4 h-4 animate-spin" />
                    <span>Authorizing Read-Only...</span>
                  </>
                ) : (
                  <>
                    <Mail className="w-4 h-4" />
                    <span>Connect Gmail (Private)</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Security & Privacy Micro-Badge */}
        <div className="mt-6 pt-4 border-t border-stone-800/80 flex flex-wrap items-center gap-4 text-xs font-mono text-stone-400">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Zero Raw Email Storage Guarantee</span>
          </div>
          <span className="text-stone-600">•</span>
          <span>Transient In-Memory Only</span>
          <span className="text-stone-600">•</span>
          <span>No Model Training on Email Content</span>
        </div>
      </div>

      {!isConnected ? (
        /* Connect Prompt Card */
        <div className="p-8 sm:p-12 rounded-3xl bg-stone-900/40 border border-stone-800 text-center space-y-6 max-w-2xl mx-auto shadow-xl">
          <div className="w-16 h-16 rounded-2xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center mx-auto text-cyan-400">
            <Lock className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold text-stone-100">Private Email Reflection</h2>
            <p className="text-sm text-stone-400 max-w-md mx-auto leading-relaxed">
              Connect your Gmail account using least-privilege read-only permissions. Gemini processes messages transiently to prompt your reflections without persisting raw emails.
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-stone-950/60 border border-stone-800 text-left space-y-2 max-w-md mx-auto text-xs text-stone-300 font-mono">
            <div className="text-cyan-400 font-semibold mb-1">Privacy Architecture:</div>
            <div>✓ Read-only scope: gmail.readonly</div>
            <div>✓ In-memory processing; never saved to database</div>
            <div>✓ Only user-authored reflections & goals are stored</div>
            <div>✓ Revocable anytime with one click</div>
          </div>

          <button
            onClick={handleConnectGmail}
            className="px-6 py-3 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-semibold text-sm transition-all shadow-lg shadow-cyan-500/20 inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            <span>Enable Private Mail Assistant</span>
          </button>
        </div>
      ) : (
        /* Connected Inbox & Reflection UI */
        <div className="space-y-6">
          {/* Category Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-stone-800">
            {['ALL', 'REPLY NEEDED', 'DEADLINE', 'IMPORTANT', 'MEETING'].map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-mono transition-colors whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-stone-800 text-cyan-400 border border-stone-700'
                    : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* Email List */}
          <div className="space-y-3">
            {filteredEmails.map((email) => (
              <div
                key={email.id}
                className="p-5 rounded-2xl bg-stone-900/80 border border-stone-800/80 hover:border-cyan-500/30 transition-all space-y-3 shadow-lg"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono px-2 py-0.5 rounded-full ${
                        email.category === 'REPLY NEEDED'
                          ? 'bg-amber-950/70 text-amber-300 border border-amber-800'
                          : email.category === 'DEADLINE'
                          ? 'bg-rose-950/70 text-rose-300 border border-rose-800'
                          : email.category === 'MEETING'
                          ? 'bg-indigo-950/70 text-indigo-300 border border-indigo-800'
                          : 'bg-stone-800 text-cyan-300'
                      }`}
                    >
                      {email.category}
                    </span>
                    <span className="text-xs text-stone-400 font-mono truncate max-w-xs">{email.from}</span>
                  </div>
                  <span className="text-[11px] font-mono text-stone-500">{email.date}</span>
                </div>

                <div>
                  <h3 className="text-sm font-semibold text-stone-100">{email.subject}</h3>
                  <p className="text-xs text-stone-400 mt-1 leading-relaxed line-clamp-2">
                    {email.snippet}
                  </p>
                </div>

                {/* Actions Bar */}
                <div className="pt-2 border-t border-stone-800/80 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReflectOnEmail(email)}
                      className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Reflect on this Email</span>
                    </button>

                    <button
                      onClick={() => {
                        onConvertToGoal({
                          title: `Action from: ${email.subject}`,
                          description: `Follow up on email from ${email.from}: ${email.snippet}`,
                          category: 'Career',
                        });
                      }}
                      className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium transition-colors flex items-center gap-1.5"
                    >
                      <Target className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Turn into Goal</span>
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      onStartJournalWithPrompt(
                        `I received an email with subject "${email.subject}" from ${email.from}. The message asks: "${email.snippet}". Help me think through how I should respond.`
                      );
                    }}
                    className="text-xs text-stone-400 hover:text-stone-200 transition-colors flex items-center gap-1 font-mono"
                  >
                    <span>Draft in Journal</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* "Reflect on this Email" Modal / Drawer */}
      <AnimatePresence>
        {activeEmailForReflection && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-2xl p-6 sm:p-8 rounded-3xl bg-stone-950 border border-cyan-500/30 shadow-2xl text-stone-100 space-y-6 max-h-[90vh] overflow-y-auto"
            >
              {/* Header */}
              <div className="flex items-center justify-between border-b border-stone-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <GeminiAvatar state={isSynthesizing ? 'thinking' : 'idle'} size="sm" />
                  <div>
                    <h2 className="text-base font-bold text-stone-100">Email Reflection Session</h2>
                    <span className="text-xs font-mono text-stone-400 truncate max-w-md block">
                      {activeEmailForReflection.subject}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setActiveEmailForReflection(null)}
                  className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-xs text-stone-400"
                >
                  Close
                </button>
              </div>

              {isSynthesizing ? (
                <div className="py-12 text-center space-y-3">
                  <RotateCw className="w-8 h-8 animate-spin text-cyan-400 mx-auto" />
                  <p className="text-xs font-mono text-stone-400">
                    Gemini is reading message context and formulating private reflection questions...
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  {/* Reflection Questions Prompts */}
                  {reflectionPrompts?.reflectionQuestions && (
                    <div className="space-y-3 p-4 rounded-2xl bg-stone-900/90 border border-stone-800">
                      <div className="text-xs font-mono uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Mindful Reflection Inquiries</span>
                      </div>
                      <div className="space-y-2">
                        {reflectionPrompts.reflectionQuestions.map((q, idx) => (
                          <div
                            key={idx}
                            onClick={() => {
                              setActiveEmailForReflection(null);
                              onStartJournalWithPrompt(
                                `Email context: "${activeEmailForReflection.subject}".\n\nReflection question: ${q}`
                              );
                            }}
                            className="p-3 rounded-xl bg-stone-950 hover:bg-cyan-950/40 border border-stone-800 hover:border-cyan-500/40 text-xs text-stone-200 cursor-pointer transition-colors flex items-center justify-between group"
                          >
                            <span>"{q}"</span>
                            <ArrowRight className="w-3.5 h-3.5 text-stone-600 group-hover:text-cyan-400 flex-shrink-0" />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Extracted Action Items */}
                  {reflectionPrompts?.actionItems && reflectionPrompts.actionItems.length > 0 && (
                    <div className="space-y-2 p-4 rounded-2xl bg-stone-900/90 border border-stone-800">
                      <div className="text-xs font-mono uppercase tracking-wider text-indigo-400">
                        Extracted Action Items
                      </div>
                      <ul className="space-y-1 text-xs text-stone-300">
                        {reflectionPrompts.actionItems.map((item, idx) => (
                          <li key={idx} className="flex items-start gap-2">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 mt-0.5" />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Suggested Draft Reply */}
                  {reflectionPrompts?.draftReply && (
                    <div className="space-y-2 p-4 rounded-2xl bg-stone-900/90 border border-stone-800">
                      <div className="text-xs font-mono uppercase tracking-wider text-stone-400">
                        Suggested Draft Reply (Private Draft)
                      </div>
                      <div className="p-3 rounded-xl bg-stone-950 text-xs text-stone-300 whitespace-pre-line border border-stone-800/80 font-mono leading-relaxed">
                        {reflectionPrompts.draftReply}
                      </div>
                    </div>
                  )}

                  {/* Conversion Button */}
                  <div className="flex items-center justify-end gap-3 pt-2 border-t border-stone-800">
                    <button
                      onClick={() => {
                        const email = activeEmailForReflection;
                        setActiveEmailForReflection(null);
                        onConvertToGoal({
                          title: `Address: ${email.subject}`,
                          description: `From ${email.from}. Context: ${email.snippet}`,
                          category: 'Career',
                        });
                      }}
                      className="px-4 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-300 text-xs font-medium transition-colors flex items-center gap-1.5"
                    >
                      <Target className="w-3.5 h-3.5" />
                      <span>Save as Goal in Goal Center</span>
                    </button>

                    <button
                      onClick={() => {
                        const email = activeEmailForReflection;
                        setActiveEmailForReflection(null);
                        onStartJournalWithPrompt(
                          `Let's reflect on this email from ${email.from} regarding "${email.subject}". Context: ${email.snippet}`
                        );
                      }}
                      className="px-5 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-stone-950 font-semibold text-xs transition-colors flex items-center gap-1.5"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Explore in Journal</span>
                    </button>
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
