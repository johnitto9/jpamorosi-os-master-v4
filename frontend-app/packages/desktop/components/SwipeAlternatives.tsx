"use client"

import React from 'react';
import { motion } from 'framer-motion';

// OPCIÓN 1: Flechas verticales con línea (implementada en ScrollWatermarkMinimal)

// OPCIÓN 2: Puntos conectados minimalistas
export const SwipeOption2 = () => (
  <div className="flex flex-col items-center space-y-2">
    <motion.div
      animate={{ y: [0, -6, 0, 6, 0] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      className="flex flex-col items-center space-y-2"
    >
      {/* Tres puntos conectados */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="w-2 h-2 bg-cyan-400 rounded-full"
          animate={{
            scale: [0.8, 1.2, 0.8],
            opacity: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.3,
          }}
        />
      ))}
    </motion.div>
    <div className="text-white/60 text-xs font-mono">swipe</div>
  </div>
);

// OPCIÓN 3: Óvalo vertical con gradiente animado
export const SwipeOption3 = () => (
  <div className="flex flex-col items-center space-y-2">
    <motion.div
      animate={{ y: [0, -8, 0, 8, 0] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      className="relative w-3 h-12 bg-white/10 rounded-full overflow-hidden"
    >
      {/* Gradiente que se mueve */}
      <motion.div
        className="absolute w-full h-4 bg-gradient-to-b from-transparent via-cyan-400/80 to-transparent rounded-full"
        animate={{
          top: ['-16px', '32px', '-16px'],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      />
    </motion.div>
    <div className="text-white/60 text-xs font-mono">swipe</div>
  </div>
);

// OPCIÓN 4: Mano minimalista estilizada
export const SwipeOption4 = () => (
  <div className="flex flex-col items-center space-y-2">
    <motion.div
      animate={{ y: [0, -10, 0, 10, 0] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
    >
      {/* Mano ultra minimalista */}
      <div className="relative w-6 h-8">
        <div className="absolute bottom-0 left-1/2 w-3 h-5 bg-white/80 rounded-t-full transform -translate-x-1/2" />
        <div className="absolute bottom-3 left-1/2 w-1 h-3 bg-white/80 rounded-full transform -translate-x-1/2" />
        <motion.div
          className="absolute top-0 left-1/2 w-0.5 h-4 bg-cyan-400/60 transform -translate-x-1/2"
          animate={{
            opacity: [0.3, 0.8, 0.3],
          }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
      </div>
    </motion.div>
    <div className="text-white/60 text-xs font-mono">swipe</div>
  </div>
);

// OPCIÓN 5: Líneas de movimiento (como cómic)
export const SwipeOption5 = () => (
  <div className="flex flex-col items-center space-y-2">
    <motion.div
      animate={{ y: [0, -6, 0, 6, 0] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      className="relative w-8 h-10"
    >
      {/* Líneas de movimiento */}
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className={`absolute w-6 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent rounded-full`}
          style={{
            top: `${20 + i * 8}px`,
            left: '4px',
          }}
          animate={{
            opacity: [0.2, 0.8, 0.2],
            scaleX: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.2,
          }}
        />
      ))}
    </motion.div>
    <div className="text-white/60 text-xs font-mono">swipe</div>
  </div>
);

export default {
  SwipeOption2,
  SwipeOption3, 
  SwipeOption4,
  SwipeOption5
};