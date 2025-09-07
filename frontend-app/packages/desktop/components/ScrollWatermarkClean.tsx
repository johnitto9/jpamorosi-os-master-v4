"use client"

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useAvatarStore } from '../../../store/avatarStore';

interface ScrollWatermarkCleanProps {
  hideAfter?: number;
}

const ScrollWatermarkClean: React.FC<ScrollWatermarkCleanProps> = ({ 
  hideAfter = 4000
}) => {
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  
  // Escuchar directamente el store del avatar
  const { isLoading, isLoaded } = useAvatarStore();

  useEffect(() => {
    console.log("🎯 ScrollWatermarkClean mounted");
    setMounted(true);
    
    // Detectar mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => {
      window.removeEventListener('resize', checkMobile);
    };
  }, []);

  // Mostrar watermark solo cuando el avatar esté completamente cargado (no loading)
  useEffect(() => {
    if (mounted && !isLoading && isLoaded) {
      console.log("🚀 ScrollWatermarkClean: Avatar loaded, showing watermark after delay");
      
      const showTimer = setTimeout(() => {
        setShow(true);
        console.log("✅ ScrollWatermarkClean: Watermark visible");
      }, 1000); // 1 segundo después de que termine de cargar

      const hideTimer = setTimeout(() => {
        setShow(false);
        console.log("👻 ScrollWatermarkClean: Watermark hidden");
      }, 1000 + hideAfter);

      // Ocultar en primera interacción
      const handleInteraction = () => {
        console.log("👆 ScrollWatermarkClean: User interacted, hiding");
        setShow(false);
      };

      window.addEventListener('scroll', handleInteraction, { once: true });
      window.addEventListener('touchmove', handleInteraction, { once: true });
      window.addEventListener('wheel', handleInteraction, { once: true });

      return () => {
        clearTimeout(showTimer);
        clearTimeout(hideTimer);
        window.removeEventListener('scroll', handleInteraction);
        window.removeEventListener('touchmove', handleInteraction);
        window.removeEventListener('wheel', handleInteraction);
      };
    }
  }, [mounted, isLoading, isLoaded, hideAfter]);
  
  if (!mounted || !show) return null;

  return (
    <div className="pointer-events-none">      
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ 
          opacity: 1, 
          y: [0, -8, 0, 8, 0] // Flotación simple EXACTA como antes
        }}
        exit={{ opacity: 0 }}
        transition={{
          opacity: { duration: 0.4 },
          y: {
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }
        }}
        className={`fixed z-[10001] ${
          isMobile 
            ? 'top-[37%] left-[66%] transform -translate-y-1/2' // EXACTA posición mobile
            : 'top-[36%] left-[57%] transform -translate-y-1/2' // EXACTA posición desktop
        }`}
      >
        {isMobile ? (
          // MOBILE: Swipe minimalista - EXACTO como ScrollWatermarkMinimal
          <div className="flex flex-col items-center space-y-2">
            {/* Tres puntos que pulsan secuencialmente */}
            <motion.div
              animate={{ y: [0, -6, 0, 6, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
              className="flex flex-col items-center space-y-2"
            >
              {/* Tres puntos conectados */}
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-3 h-3 bg-cyan-400 rounded-full shadow-lg"
                  animate={{
                    scale: [0.8, 1.4, 0.8],
                    opacity: [0.5, 1, 0.5],
                  }}
                  transition={{
                    duration: 2.2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: i * 0.3, // EXACTO delay 0.3 como original
                  }}
                />
              ))}
            </motion.div>
            
            {/* Texto "swipe" EXACTO */}
            <div className="text-white/60 text-xs font-mono tracking-wider">
              swipe
            </div>
          </div>
        ) : (
          // DESKTOP: Óvalo de scroll - EXACTO como ScrollWatermarkMinimal
          <div className="relative">
            {/* Óvalo principal más grande EXACTO */}
            <div className="w-6 h-16 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full relative overflow-hidden">
              {/* Indicador de scroll animado más grande EXACTO */}
              <motion.div
                className="absolute w-3 h-4 bg-cyan-400/80 rounded-full left-1/2 transform -translate-x-1/2"
                animate={{
                  top: ['8%', '70%', '8%'], // EXACTOS porcentajes
                }}
                transition={{
                  duration: 2, // EXACTA duración
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
              />
            </div>
            
            {/* Texto más grande y más cerca EXACTO */}
            <div className="absolute -right-10 top-1/2 transform -translate-y-1/2 text-white/50 text-sm font-mono">
              scroll
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default ScrollWatermarkClean;