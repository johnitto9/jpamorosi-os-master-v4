"use client";

// components/assistant/AssistantAvatar.tsx
// Orbe's mascot: a friendly floating holo-bot, hand-built SVG driven
// by framer-motion (no Lottie asset needed, <2KB). It bobs, blinks, and its
// antenna light pulses — enough personality to invite a tap without being a
// cartoon circus. `waving` adds a little hand wave for the greeting popup.

import { motion, useReducedMotion } from "framer-motion";

export function AssistantAvatar({
  size = 56,
  waving = false,
}: {
  size?: number;
  waving?: boolean;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      aria-hidden
      animate={reduce ? undefined : { y: [0, -3.5, 0] }}
      transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
    >
      <defs>
        <linearGradient id="al-bot-body" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#173042" />
          <stop offset="100%" stopColor="#0c1524" />
        </linearGradient>
        <linearGradient id="al-bot-visor" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#08202e" />
          <stop offset="100%" stopColor="#0b1220" />
        </linearGradient>
      </defs>

      {/* antenna */}
      <line x1="32" y1="10" x2="32" y2="17" stroke="#4bd8e5" strokeWidth="2" strokeLinecap="round" />
      <motion.circle
        cx="32"
        cy="8"
        r="3"
        fill="#00f2ff"
        animate={reduce ? undefined : { opacity: [0.5, 1, 0.5], scale: [1, 1.25, 1] }}
        transition={{ duration: 2.1, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* head */}
      <rect x="14" y="16" width="36" height="30" rx="12" fill="url(#al-bot-body)" stroke="rgba(120,235,255,0.45)" strokeWidth="1.4" />
      {/* visor */}
      <rect x="19" y="22" width="26" height="17" rx="8" fill="url(#al-bot-visor)" stroke="rgba(0,242,255,0.25)" strokeWidth="1" />

      {/* eyes: blink by squashing */}
      <motion.g
        style={{ originY: "30px" }}
        animate={reduce ? undefined : { scaleY: [1, 1, 0.08, 1, 1] }}
        transition={{ duration: 4.6, times: [0, 0.44, 0.5, 0.56, 1], repeat: Infinity }}
      >
        <circle cx="26.5" cy="30.5" r="3.1" fill="#7df9ff" />
        <circle cx="37.5" cy="30.5" r="3.1" fill="#7df9ff" />
      </motion.g>
      {/* smile */}
      <path d="M27 35.5 q5 3.5 10 0" stroke="#7df9ff" strokeWidth="1.6" fill="none" strokeLinecap="round" />

      {/* body chip */}
      <rect x="24" y="47" width="16" height="9" rx="4.5" fill="url(#al-bot-body)" stroke="rgba(120,235,255,0.35)" strokeWidth="1.2" />
      <motion.circle
        cx="32"
        cy="51.5"
        r="1.8"
        fill="#8b5cf6"
        animate={reduce ? undefined : { opacity: [0.5, 1, 0.5] }}
        transition={{ duration: 1.8, repeat: Infinity }}
      />

      {/* waving hand (greeting only) */}
      {waving && (
        <motion.g
          style={{ originX: "50px", originY: "42px" }}
          animate={reduce ? undefined : { rotate: [0, 22, -8, 22, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, repeatDelay: 1.2 }}
        >
          <line x1="48" y1="42" x2="55" y2="34" stroke="#4bd8e5" strokeWidth="2.6" strokeLinecap="round" />
          <circle cx="56" cy="32.5" r="3" fill="#7df9ff" />
        </motion.g>
      )}
    </motion.svg>
  );
}

export default AssistantAvatar;
