import React from 'react';
import { motion } from 'motion/react';
import { GeminiAvatarState } from '../types';

interface GeminiAvatarProps {
  state?: GeminiAvatarState;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'hero';
  showStatusBadge?: boolean;
  className?: string;
  pulseGlow?: boolean;
}

export const GeminiAvatar: React.FC<GeminiAvatarProps> = ({
  state = 'idle',
  size = 'md',
  showStatusBadge = false,
  className = '',
  pulseGlow = true,
}) => {
  // Dimensions map
  const dimensions = {
    sm: { box: 'w-8 h-8', svg: 32, eyeW: 4, eyeH: 4, ringSize: 'w-12 h-12' },
    md: { box: 'w-12 h-12', svg: 48, eyeW: 6, eyeH: 6, ringSize: 'w-18 h-18' },
    lg: { box: 'w-20 h-20', svg: 80, eyeW: 9, eyeH: 9, ringSize: 'w-28 h-28' },
    xl: { box: 'w-32 h-32', svg: 128, eyeW: 14, eyeH: 14, ringSize: 'w-44 h-44' },
    hero: { box: 'w-48 h-48 sm:w-56 sm:h-56', svg: 220, eyeW: 24, eyeH: 24, ringSize: 'w-72 h-72 sm:w-80 sm:h-80' },
  }[size];

  // Colors based on state
  const stateColor = {
    idle: {
      primary: '#06b6d4', // cyan-500
      secondary: '#6366f1', // indigo-500
      glow: 'rgba(6, 182, 212, 0.4)',
      label: 'Ready',
      textColor: 'text-cyan-400',
    },
    thinking: {
      primary: '#818cf8', // indigo-400
      secondary: '#c084fc', // purple-400
      glow: 'rgba(129, 140, 248, 0.55)',
      label: 'Thinking...',
      textColor: 'text-indigo-400',
    },
    listening: {
      primary: '#38bdf8', // sky-400
      secondary: '#06b6d4', // cyan-500
      glow: 'rgba(56, 189, 248, 0.65)',
      label: 'Listening...',
      textColor: 'text-sky-400',
    },
    speaking: {
      primary: '#2dd4bf', // teal-400
      secondary: '#38bdf8', // sky-400
      glow: 'rgba(45, 212, 191, 0.6)',
      label: 'Speaking',
      textColor: 'text-teal-300',
    },
    processing: {
      primary: '#a855f7', // purple-500
      secondary: '#ec4899', // pink-500
      glow: 'rgba(168, 85, 247, 0.55)',
      label: 'Processing...',
      textColor: 'text-purple-400',
    },
    success: {
      primary: '#10b981', // emerald-500
      secondary: '#34d399', // emerald-400
      glow: 'rgba(16, 185, 129, 0.5)',
      label: 'Completed',
      textColor: 'text-emerald-400',
    },
    error: {
      primary: '#f43f5e', // rose-500
      secondary: '#fb7185', // rose-400
      glow: 'rgba(244, 63, 94, 0.5)',
      label: 'Notice',
      textColor: 'text-rose-400',
    },
  }[state];

  const isAnimated = state === 'thinking' || state === 'listening' || state === 'speaking' || state === 'processing';

  return (
    <div className={`relative inline-flex flex-col items-center justify-center select-none ${className}`} id="gemini-robot-avatar">
      {/* Audio / Energy Rings in Listening or Speaking or Hero mode */}
      {(state === 'listening' || state === 'speaking' || size === 'hero') && (
        <>
          <motion.div
            className={`absolute rounded-full border border-cyan-500/30 pointer-events-none ${dimensions.ringSize}`}
            animate={{
              scale: [1, 1.25, 1.45],
              opacity: [0.6, 0.25, 0],
            }}
            transition={{
              duration: 2.2,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
          <motion.div
            className={`absolute rounded-full border border-indigo-500/25 pointer-events-none ${dimensions.ringSize}`}
            animate={{
              scale: [1, 1.35, 1.65],
              opacity: [0.5, 0.15, 0],
            }}
            transition={{
              duration: 2.2,
              delay: 0.7,
              repeat: Infinity,
              ease: 'easeOut',
            }}
          />
        </>
      )}

      {/* Main Avatar Container */}
      <motion.div
        className={`relative ${dimensions.box} rounded-2xl flex items-center justify-center p-0.5`}
        animate={
          isAnimated
            ? {
                y: [0, -3, 0],
              }
            : {
                y: [0, -1.5, 0],
              }
        }
        transition={{
          duration: isAnimated ? 2.5 : 4,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        style={{
          boxShadow: pulseGlow ? `0 0 25px ${stateColor.glow}` : undefined,
        }}
      >
        {/* Outer Cyber-Metallic Chassis SVG */}
        <svg
          viewBox="0 0 100 100"
          className="w-full h-full drop-shadow-md"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Dark Metallic Helmet Gradient */}
            <linearGradient id="chassisGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#1e293b" />
              <stop offset="50%" stopColor="#0f172a" />
              <stop offset="100%" stopColor="#090d16" />
            </linearGradient>

            {/* Cyan/Indigo Cyber Bevel */}
            <linearGradient id="bevelGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={stateColor.primary} />
              <stop offset="100%" stopColor={stateColor.secondary} />
            </linearGradient>

            {/* Visor Dark Glass Gradient */}
            <linearGradient id="visorGlass" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#07090e" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#030712" stopOpacity="0.98" />
            </linearGradient>

            {/* Neural Glow Filter */}
            <filter id="eyeGlow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Exterior Ear Antennas / Core Nodes */}
          <rect x="12" y="42" width="6" height="16" rx="3" fill="url(#bevelGrad)" opacity="0.8" />
          <rect x="82" y="42" width="6" height="16" rx="3" fill="url(#bevelGrad)" opacity="0.8" />

          {/* Top Neural Crest Antenna */}
          <path d="M47 8 L53 8 L51 20 L49 20 Z" fill="url(#bevelGrad)" />
          <circle cx="50" cy="8" r="3" fill={stateColor.primary} filter="url(#eyeGlow)" />

          {/* Robot Head Outer Shell (Sculpted Rounded Octagonal Helmet) */}
          <path
            d="M 28 18 
               L 72 18 
               Q 84 18 84 30 
               L 84 68 
               Q 84 82 70 82 
               L 30 82 
               Q 16 82 16 68 
               L 16 30 
               Q 16 18 28 18 Z"
            fill="url(#chassisGrad)"
            stroke="url(#bevelGrad)"
            strokeWidth="2"
          />

          {/* Forehead Circuit Trace */}
          <path
            d="M 38 24 L 50 24 L 50 29 M 50 24 L 62 24"
            stroke={stateColor.primary}
            strokeWidth="1.2"
            strokeLinecap="round"
            opacity="0.6"
          />

          {/* Dark Glass Visor Screen */}
          <rect
            x="24"
            y="34"
            width="52"
            height="32"
            rx="10"
            fill="url(#visorGlass)"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="1"
          />

          {/* Visor Glare Reflection Highlight */}
          <path
            d="M 28 38 Q 50 35 72 38"
            stroke="rgba(255,255,255,0.18)"
            strokeWidth="1"
            strokeLinecap="round"
          />

          {/* Glowing Eyes / Neural Optics */}
          {state === 'thinking' ? (
            // Scanning or pulsing bar for thinking state
            <g filter="url(#eyeGlow)">
              <rect x="34" y="48" width="32" height="4" rx="2" fill={stateColor.primary}>
                <animate
                  attributeName="x"
                  values="32;42;32"
                  dur="1.8s"
                  repeatCount="indefinite"
                />
                <animate
                  attributeName="width"
                  values="20;32;20"
                  dur="1.8s"
                  repeatCount="indefinite"
                />
              </rect>
            </g>
          ) : (
            // Expressive Digital Eyes
            <g filter="url(#eyeGlow)">
              {/* Left Eye */}
              <rect
                x="34"
                y={state === 'listening' ? 44 : 46}
                width={state === 'listening' ? 10 : 9}
                height={state === 'listening' ? 12 : 8}
                rx={state === 'listening' ? 4 : 3}
                fill={stateColor.primary}
              >
                {state === 'speaking' && (
                  <animate
                    attributeName="height"
                    values="6;10;6"
                    dur="0.8s"
                    repeatCount="indefinite"
                  />
                )}
              </rect>

              {/* Right Eye */}
              <rect
                x="57"
                y={state === 'listening' ? 44 : 46}
                width={state === 'listening' ? 10 : 9}
                height={state === 'listening' ? 12 : 8}
                rx={state === 'listening' ? 4 : 3}
                fill={stateColor.primary}
              >
                {state === 'speaking' && (
                  <animate
                    attributeName="height"
                    values="6;10;6"
                    dur="0.8s"
                    repeatCount="indefinite"
                  />
                )}
              </rect>
            </g>
          )}

          {/* Lower Mouth / Acoustic Speaker Bar */}
          {state === 'speaking' ? (
            <g filter="url(#eyeGlow)">
              <line x1="42" y1="59" x2="58" y2="59" stroke={stateColor.primary} strokeWidth="2.5" strokeLinecap="round">
                <animate attributeName="stroke-width" values="1.5;3.5;1.5" dur="0.4s" repeatCount="indefinite" />
              </line>
            </g>
          ) : (
            <line
              x1="44"
              y1="59"
              x2="56"
              y2="59"
              stroke="rgba(255,255,255,0.2)"
              strokeWidth="1.5"
              strokeLinecap="round"
            />
          )}

          {/* Chin Accent Detail */}
          <path d="M 46 74 L 54 74" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </motion.div>

      {/* Optional Status Indicator Badge */}
      {showStatusBadge && (
        <motion.div
          initial={{ opacity: 0, y: 3 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-2 flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-stone-900/80 border border-stone-800 text-[11px] font-mono shadow-sm"
        >
          <span
            className="w-1.5 h-1.5 rounded-full animate-pulse"
            style={{ backgroundColor: stateColor.primary }}
          />
          <span className={`${stateColor.textColor} font-medium`}>{stateColor.label}</span>
        </motion.div>
      )}
    </div>
  );
};
