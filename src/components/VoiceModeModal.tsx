import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { GeminiAvatar } from './GeminiAvatar';
import { GeminiAvatarState } from '../types';
import { Mic, MicOff, X, Volume2, ArrowRight, AlertCircle } from 'lucide-react';

interface VoiceModeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTranscriptComplete: (transcript: string) => void;
}

export const VoiceModeModal: React.FC<VoiceModeModalProps> = ({
  isOpen,
  onClose,
  onTranscriptComplete,
}) => {
  const [avatarState, setAvatarState] = useState<GeminiAvatarState>('idle');
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [supportStatus, setSupportStatus] = useState<string>('');
  const [hasSpeechSupport, setHasSpeechSupport] = useState(true);

  const recognitionRef = useRef<any>(null);

  useEffect(() => {
    if (!isOpen) {
      stopListening();
      setTranscript('');
      setInterimTranscript('');
      setAvatarState('idle');
      return;
    }

    // Check Web Speech API support
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setHasSpeechSupport(false);
      setSupportStatus('Speech recognition is not supported in this browser. You can type or use sample audio prompts.');
      setAvatarState('idle');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setAvatarState('listening');
        setSupportStatus('Listening to your thoughts...');
      };

      recognition.onresult = (event: any) => {
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          if (event.results[i].isFinal) {
            final += event.results[i][0].transcript + ' ';
          } else {
            interim += event.results[i][0].transcript;
          }
        }

        if (final) {
          setTranscript((prev) => prev + final);
        }
        setInterimTranscript(interim);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed') {
          setSupportStatus('Microphone access denied. Please check browser permissions or type below.');
        } else {
          setSupportStatus(`Voice status: ${event.error}. You can also type or use preset thoughts.`);
        }
        setAvatarState('idle');
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        if (avatarState === 'listening') {
          setAvatarState('idle');
        }
      };

      recognitionRef.current = recognition;
      startListening();
    } catch (err) {
      console.warn('Speech init error:', err);
      setHasSpeechSupport(false);
    }

    return () => {
      stopListening();
    };
  }, [isOpen]);

  const startListening = () => {
    if (recognitionRef.current && !isListening) {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        setAvatarState('listening');
      } catch (err) {
        console.warn('Cannot start speech recognition:', err);
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Ignore
      }
      setIsListening(false);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
      setAvatarState('idle');
      setSupportStatus('Paused listening.');
    } else {
      startListening();
    }
  };

  const handleSendToJournal = () => {
    const fullText = (transcript + ' ' + interimTranscript).trim();
    if (fullText) {
      onTranscriptComplete(fullText);
      onClose();
    }
  };

  const samplePrompts = [
    "I'm feeling overwhelmed with work priorities and need to step back and organize.",
    "I have an idea for building an open-source tool, but I'm unsure where to start.",
    "Today went really well, and I want to reflect on what worked and why.",
  ];

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md" id="voice-journal-modal">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-xl p-6 sm:p-8 rounded-3xl bg-stone-950/90 border border-cyan-500/30 shadow-2xl shadow-cyan-950/50 text-white overflow-hidden"
        >
          {/* Ambient Cyber Background Glow */}
          <div className="absolute -top-24 -left-24 w-72 h-72 bg-cyan-600/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-indigo-600/15 rounded-full blur-3xl pointer-events-none" />

          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800/80 transition-colors"
            aria-label="Close voice mode"
            id="close-voice-modal-btn"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Header */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-xs font-mono uppercase tracking-wider mb-2">
              <Volume2 className="w-3.5 h-3.5 animate-pulse" />
              <span>Voice Journal Mode</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-stone-100">
              Talk to Gemini
            </h2>
            <p className="text-xs sm:text-sm text-stone-400 mt-1 max-w-sm mx-auto">
              Speak freely. Your voice is processed privately to help you reflect without typing.
            </p>
          </div>

          {/* Large Avatar Stage */}
          <div className="flex flex-col items-center justify-center my-6">
            <GeminiAvatar
              state={avatarState}
              size="xl"
              showStatusBadge={true}
              pulseGlow={true}
            />
          </div>

          {/* Transcript Display Box */}
          <div className="relative min-h-[110px] max-h-[160px] overflow-y-auto p-4 rounded-2xl bg-stone-900/90 border border-stone-800 text-sm text-stone-200 mb-5">
            {transcript || interimTranscript ? (
              <p className="leading-relaxed">
                <span>{transcript}</span>
                <span className="text-cyan-400 italic font-mono">{interimTranscript}</span>
              </p>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-stone-500 text-center py-4">
                <p className="text-xs">
                  {isListening
                    ? "Start speaking... Gemini is listening."
                    : "Tap the microphone to start speaking your thoughts."}
                </p>
              </div>
            )}
          </div>

          {/* Status feedback */}
          {supportStatus && (
            <div className="flex items-center justify-center gap-1.5 text-xs text-stone-400 mb-4 font-mono">
              <span className="w-2 h-2 rounded-full bg-cyan-500/80 animate-ping" />
              <span>{supportStatus}</span>
            </div>
          )}

          {/* Sample Prompts if Empty */}
          {!transcript && (
            <div className="mb-5">
              <div className="text-[11px] font-mono text-stone-500 uppercase tracking-wider mb-2">
                Quick thought starters:
              </div>
              <div className="space-y-1.5">
                {samplePrompts.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setTranscript(prompt);
                      setAvatarState('success');
                    }}
                    className="w-full text-left px-3 py-1.5 rounded-lg bg-stone-900/60 hover:bg-cyan-950/40 border border-stone-800/80 hover:border-cyan-500/30 text-xs text-stone-300 transition-colors truncate"
                  >
                    "{prompt}"
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Controls Footer */}
          <div className="flex items-center justify-between gap-3 pt-2 border-t border-stone-800/80">
            <button
              onClick={toggleListening}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm transition-all shadow-md ${
                isListening
                  ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                  : 'bg-cyan-500 text-stone-950 hover:bg-cyan-400 font-semibold shadow-cyan-500/20'
              }`}
              id="toggle-mic-btn"
            >
              {isListening ? (
                <>
                  <MicOff className="w-4 h-4" />
                  <span>Pause Mic</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  <span>{transcript ? 'Resume Mic' : 'Start Mic'}</span>
                </>
              )}
            </button>

            <button
              onClick={handleSendToJournal}
              disabled={!transcript && !interimTranscript}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-white font-medium text-sm transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-40 disabled:cursor-not-allowed"
              id="send-voice-transcript-btn"
            >
              <span>Continue in Chat</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
