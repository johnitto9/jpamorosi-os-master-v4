"use client"

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface ScrollWatermarkMinimalProps {
  delay?: number;
  hideAfter?: number;
}

const ScrollWatermarkMinimal: React.FC<ScrollWatermarkMinimalProps> = ({ 
  delay = 500,
  hideAfter = 4000
}) => {
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [avatarEventReceived, setAvatarEventReceived] = useState(false);
  
  useEffect(() => {
    console.log("🎯 ScrollWatermarkMinimal mounted");
    setMounted(true);
    
    // Detectar mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Listener para el evento del avatar (método confiable)
    const handleAvatarReallyVisible = (event: CustomEvent) => {
      console.log('🎯 ScrollWatermarkMinimal: Avatar REALLY visible event received:', event.detail);
      setAvatarEventReceived(true);
      setTimeout(() => {
        setShow(true);
        console.log('✅ ScrollWatermarkMinimal: Showing via avatar sync AFTER loader fadeout');
      }, 1500); // 1.5 segundos para asegurar que el loader haya desaparecido completamente
    };
    
    // Añadir listener para el evento del avatar
    window.addEventListener('avatarReallyVisible', handleAvatarReallyVisible as EventListener);
    
    // Timer de fallback si el avatar no carga
    const showTimer = setTimeout(() => {
      if (!avatarEventReceived) {
        console.log("🚀 ScrollWatermarkMinimal showing (fallback timer)");
        setShow(true);
      }
    }, delay);
    
    const hideTimer = setTimeout(() => {
      setShow(false);
    }, delay + hideAfter);
    
    const handleScroll = () => {
      setShow(false);
    };
    
    const handleTouch = () => {
      setShow(false);
    };
    
    window.addEventListener('scroll', handleScroll, { once: true });
    window.addEventListener('touchmove', handleTouch, { once: true });
    
    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('avatarReallyVisible', handleAvatarReallyVisible as EventListener);
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('touchmove', handleTouch);
    };
  }, [delay, hideAfter]);
  
  if (!mounted) return null;
  
  return (
    <div className="pointer-events-none">      
      {show && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ 
            opacity: 1, 
            y: [0, -8, 0, 8, 0] // Flotación simple
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
              ? 'top-[37%] left-[66%] transform -translate-y-1/2' // Mobile: más arriba, más a la derecha
              : 'top-[36%] left-[57%] transform -translate-y-1/2' // Desktop: más arriba, derecha igual
          }`}
        >
          {isMobile ? (
            // MOBILE: Swipe minimalista - OPCIÓN 2 (puntos conectados)
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
                      delay: i * 0.3,
                    }}
                  />
                ))}
              </motion.div>
              
              {/* Texto "swipe" */}
              <div className="text-white/60 text-xs font-mono tracking-wider">
                swipe
              </div>
            </div>
          ) : (
            // DESKTOP: Óvalo de scroll - MÁS GRANDE
            <div className="relative">
              {/* Óvalo principal más grande */}
              <div className="w-6 h-16 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full relative overflow-hidden">
                {/* Indicador de scroll animado más grande */}
                <motion.div
                  className="absolute w-3 h-4 bg-cyan-400/80 rounded-full left-1/2 transform -translate-x-1/2"
                  animate={{
                    top: ['8%', '70%', '8%'],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                />
              </div>
              
              {/* Texto más grande y más cerca */}
              <div className="absolute -right-10 top-1/2 transform -translate-y-1/2 text-white/50 text-sm font-mono">
                scroll
              </div>
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
};

export default ScrollWatermarkMinimal;