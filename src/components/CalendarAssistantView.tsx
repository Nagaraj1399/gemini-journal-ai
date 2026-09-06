import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { CalendarEvent } from '../types';
import { GeminiAvatar } from './GeminiAvatar';
import {
  Calendar,
  Clock,
  Sparkles,
  ShieldCheck,
  ArrowRight,
  Target,
  CheckCircle2,
  Users,
  Video,
} from 'lucide-react';

interface CalendarAssistantViewProps {
  onStartJournalWithPrompt: (initialMessage: string) => void;
  onConvertToGoal: (goal: { title: string; description: string; category: string }) => void;
}

export const CalendarAssistantView: React.FC<CalendarAssistantViewProps> = ({
  onStartJournalWithPrompt,
  onConvertToGoal,
}) => {
  const [events, setEvents] = useState<CalendarEvent[]>([
    {
      id: 'cal-1',
      title: 'AI Studio Ideathon Demo & Jury Presentation',
      startTime: '11:00 AM',
      endTime: '11:45 AM',
      attendees: ['Hackathon Judges', 'Google AI Studio Team'],
      preparationPrompts: [
        'What core architectural achievement do you want the judges to remember?',
        'How does your Gemini Journal demonstrate genuine data privacy?',
      ],
      isFocusBlock: false,
    },
    {
      id: 'cal-2',
      title: 'Deep Work: Architectural Refactoring & Hardening',
      startTime: '1:30 PM',
      endTime: '3:30 PM',
      attendees: [],
      preparationPrompts: [
        'What single high-impact technical deliverable will you complete in this focus block?',
        'Are notifications muted to maintain flow state?',
      ],
      isFocusBlock: true,
    },
    {
      id: 'cal-3',
      title: 'Quarterly Strategic Alignment & Roadmap Review',
      startTime: '4:00 PM',
      endTime: '4:45 PM',
      attendees: ['Core Product Team'],
      preparationPrompts: [
        'What difficult decisions need alignment before this meeting ends?',
        'What are your non-negotiables for the upcoming sprint?',
      ],
      isFocusBlock: false,
    },
  ]);

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [reflectionType, setReflectionType] = useState<'pre' | 'post'>('pre');

  const handleOpenReflection = (event: CalendarEvent, type: 'pre' | 'post') => {
    setSelectedEvent(event);
    setReflectionType(type);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8" id="calendar-assistant-view">
      {/* Header Banner */}
      <div className="relative p-6 sm:p-8 rounded-3xl bg-stone-900/60 border border-stone-800 backdrop-blur-xl overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-950/60 border border-indigo-500/30 text-indigo-300 text-xs font-mono uppercase tracking-wider">
              <Calendar className="w-3.5 h-3.5" />
              <span>Mindful Schedule Intelligence</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-stone-100">
              Calendar Reflection Assistant
            </h1>
            <p className="text-stone-400 text-sm max-w-xl leading-relaxed">
              Transform busy schedules into intentional preparation and capture key commitments before they are forgotten.
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono text-emerald-400 bg-stone-950/80 px-3 py-1.5 rounded-full border border-stone-800">
            <ShieldCheck className="w-4 h-4" />
            <span>Scope: calendar.readonly (Strictly Read-Only)</span>
          </div>
        </div>

        {/* Security & Privacy Micro-Badge */}
        <div className="mt-6 pt-4 border-t border-stone-800/80 flex flex-wrap items-center gap-4 text-xs font-mono text-stone-400">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
            <span>Read-Only Calendar Access</span>
          </div>
          <span className="text-stone-600">•</span>
          <span>Zero Background Modification</span>
          <span className="text-stone-600">•</span>
          <span>Requires User Confirmation for Action</span>
        </div>
      </div>

      {/* Schedule Items List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between px-1">
          <div className="text-xs font-mono text-stone-500 uppercase tracking-wider">
            Today's Agenda & Focus Blocks
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onStartJournalWithPrompt('Reflect on Day: Reflect on today\'s agenda')}
              className="px-3 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Reflect on Day</span>
            </button>
            <button
              onClick={() => alert('Focus block proposal requires your explicit confirmation before adding to schedule.')}
              className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium transition-colors"
            >
              Schedule Focus Block
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {events.map((event) => (
            <div
              key={event.id}
              className={`p-6 rounded-2xl border transition-all space-y-4 shadow-lg ${
                event.isFocusBlock
                  ? 'bg-gradient-to-r from-indigo-950/40 via-stone-900/80 to-stone-900/80 border-indigo-500/30'
                  : 'bg-stone-900/80 border-stone-800 hover:border-cyan-500/30'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center font-mono text-xs ${
                      event.isFocusBlock
                        ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30'
                        : 'bg-stone-800 text-cyan-400 border border-stone-700'
                    }`}
                  >
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-stone-100">{event.title}</h3>
                    <div className="flex items-center gap-3 text-xs font-mono text-stone-400 mt-0.5">
                      <span>
                        {event.startTime} - {event.endTime}
                      </span>
                      {event.isFocusBlock && (
                        <span className="text-indigo-400 font-semibold">• Focus Block</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pre / Post Reflection Action Buttons */}
                <div className="flex items-center gap-2 pt-2 sm:pt-0">
                  <button
                    onClick={() => handleOpenReflection(event, 'pre')}
                    className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 text-xs font-semibold transition-colors flex items-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Pre-Meeting Reflection</span>
                  </button>

                  <button
                    onClick={() => handleOpenReflection(event, 'post')}
                    className="px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-medium transition-colors"
                  >
                    Post-Meeting Review
                  </button>
                </div>
              </div>

              {/* Attendees info if any */}
              {event.attendees && event.attendees.length > 0 && (
                <div className="flex items-center gap-1.5 text-xs text-stone-400 font-mono pt-1">
                  <Users className="w-3.5 h-3.5 text-stone-500" />
                  <span>With: {event.attendees.join(', ')}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Reflection Modal */}
      <AnimatePresence>
        {selectedEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="w-full max-w-xl p-6 sm:p-8 rounded-3xl bg-stone-950 border border-cyan-500/30 shadow-2xl text-stone-100 space-y-6"
            >
              <div className="flex items-center justify-between border-b border-stone-800 pb-4">
                <div className="flex items-center gap-2.5">
                  <GeminiAvatar state="thinking" size="sm" />
                  <div>
                    <h3 className="text-base font-bold text-stone-100">
                      {reflectionType === 'pre' ? 'Pre-Meeting Preparation' : 'Post-Meeting Reflection'}
                    </h3>
                    <span className="text-xs font-mono text-cyan-400">{selectedEvent.title}</span>
                  </div>
                </div>

                <button
                  onClick={() => setSelectedEvent(null)}
                  className="px-3 py-1.5 rounded-lg bg-stone-900 hover:bg-stone-800 text-xs text-stone-400"
                >
                  Close
                </button>
              </div>

              <div className="space-y-4">
                <p className="text-xs text-stone-400 leading-relaxed">
                  {reflectionType === 'pre'
                    ? 'Take 60 seconds to clarify your intentions and desired outcomes before stepping in:'
                    : 'Capture breakthroughs, decisions, and immediate follow-ups before you lose momentum:'}
                </p>

                <div className="space-y-2">
                  {(reflectionType === 'pre'
                    ? selectedEvent.preparationPrompts || [
                        'What outcome do you want from this session?',
                        'What mindset or boundaries will serve you best?',
                      ]
                    : [
                        'What were the key breakthroughs or decisions made?',
                        'What commitments did you make, and by when?',
                        'Did anything surprise you about the discussion?',
                      ]
                  ).map((prompt, idx) => (
                    <button
                      key={idx}
                      onClick={() => {
                        const evt = selectedEvent;
                        setSelectedEvent(null);
                        onStartJournalWithPrompt(
                          `Calendar Reflection for "${evt.title}" (${evt.startTime} - ${evt.endTime}):\n\nPrompt: "${prompt}"`
                        );
                      }}
                      className="w-full text-left p-3.5 rounded-xl bg-stone-900/80 hover:bg-cyan-950/40 border border-stone-800 hover:border-cyan-500/40 text-xs text-stone-200 transition-colors flex items-center justify-between group"
                    >
                      <span>"{prompt}"</span>
                      <ArrowRight className="w-3.5 h-3.5 text-stone-600 group-hover:text-cyan-400 flex-shrink-0" />
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2 border-t border-stone-800">
                <button
                  onClick={() => {
                    const evt = selectedEvent;
                    setSelectedEvent(null);
                    onConvertToGoal({
                      title: `Deliverable from: ${evt.title}`,
                      description: `Follow-up action item from ${evt.title} on ${new Date().toLocaleDateString()}`,
                      category: 'Career',
                    });
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-indigo-300 text-xs font-medium transition-colors flex items-center gap-1.5"
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>Create Action Goal</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
