"use client";

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface AvatarLoaderProps {
  progress?: number;
  isVisible?: boolean;
}

export function AvatarLoader({ progress = 0, isVisible = true }: AvatarLoaderProps) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
      className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
    >
      {/* Fondo sutil */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-dark-bg/20 to-dark-bg/40" />
      
      {/* Container del loader - centrado exactamente donde aparece el avatar 3D */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2" 
           style={{ 
             marginTop: '-15vh' /* Ajustado basado en prod testing */
           }}>
        
        {/* Avatar placeholder - solo círculo */}
        <motion.div
          animate={{
            scale: [1, 1.02, 1],
            opacity: [0.4, 0.8, 0.4],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative w-32 h-32 sm:w-28 sm:h-28"
        >
          {/* Círculo del avatar */}
          <div className="w-full h-full rounded-full border-2 border-accent-cyan/50 bg-gradient-to-b from-accent-cyan/20 to-transparent" />
          
          {/* Efecto de scan - línea horizontal que cruza el círculo */}
          <motion.div
            animate={{
              y: [-16, 16, -16],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }}
            className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-accent-cyan to-transparent opacity-90"
            style={{
              boxShadow: '0 0 20px rgba(6, 182, 212, 0.8)',
            }}
          />
        </motion.div>

      </div>
    </motion.div>
  );
}