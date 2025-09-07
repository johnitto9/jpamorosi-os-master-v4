"use client"

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface ScrollWatermarkProps {
  delay?: number; // Ahora es fallback si el avatar no se carga
  autoHide?: boolean;
  hideAfter?: number;
  avatarSync?: boolean; // Nueva prop para activar sincronización con avatar
}

const ScrollWatermark: React.FC<ScrollWatermarkProps> = ({ 
  delay = 1500,  // Fallback si avatar no carga
  autoHide = true,
  hideAfter = 4000,  // Se oculta a los 4 segundos
  avatarSync = true  // Por defecto sincronizado con avatar
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [avatarLoaded, setAvatarLoaded] = useState(false);
  const [showTrigger, setShowTrigger] = useState<string>(''); // Para debug
  
  // DEBUG: Estado de debug para diagnosticar
  const [debugInfo, setDebugInfo] = useState("");
  
  console.log("🔍 ScrollWatermark Debug:", {
    isVisible,
    hasInteracted,
    isMobile,
    avatarLoaded,
    avatarSync,
    showTrigger,
    delay,
    hideAfter
  });

  useEffect(() => {
    // Detectar si es mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);

    // Función para mostrar la watermark
    const showWatermark = (trigger: string) => {
      console.log(`🎯 ScrollWatermark showWatermark called by: ${trigger}`, { hasInteracted });
      if (!hasInteracted) {
        setIsVisible(true);
        setShowTrigger(trigger);
        setDebugInfo(`Visible via ${trigger}`);
        console.log(`✅ ScrollWatermark visible via ${trigger}`);
      }
    };

    // Listener para el evento del avatar (método confiable)
    const handleAvatarReallyVisible = (event: CustomEvent) => {
      console.log('🎯 Avatar REALLY visible event received:', event.detail);
      setAvatarLoaded(true);
      if (avatarSync) {
        // Delay reducido porque ya verificamos que está visible
        setTimeout(() => {
          showWatermark('avatar-3d-verified-visible');
        }, 300); // Solo 300ms porque ya está verificado
      }
    };

    // Listener para el evento del avatar (método legacy como fallback)
    const handleAvatarLoaded = (event: CustomEvent) => {
      console.log('🎨 Avatar fully loaded event received (legacy):', event.detail);
      // Solo actuar si no hemos recibido el evento "really visible" aún
      if (!avatarLoaded) {
        setAvatarLoaded(true);
        if (avatarSync) {
          setTimeout(() => {
            showWatermark('avatar-3d-legacy-loaded');
          }, 1200); // Delay más largo para método legacy
        }
      }
    };

    // Fallback timer si no hay sincronización con avatar
    let showTimer: NodeJS.Timeout;
    if (!avatarSync) {
      showTimer = setTimeout(() => {
        showWatermark('fallback-timer');
      }, delay);
    } else {
      // También timer de fallback si el avatar no carga en tiempo razonable
      showTimer = setTimeout(() => {
        if (!avatarLoaded && !hasInteracted) {
          console.log("⏰ Avatar fallback timer triggered");
          showWatermark('avatar-fallback-timer');
        }
      }, delay + 3000); // 3 segundos extra para esperar al avatar
    }

    // Añadir listeners para los eventos del avatar
    if (avatarSync) {
      // Prioridad 1: Evento verificado de visibilidad real
      window.addEventListener('avatarReallyVisible', handleAvatarReallyVisible as EventListener);
      // Prioridad 2: Evento legacy como fallback
      window.addEventListener('avatarFullyLoaded', handleAvatarLoaded as EventListener);
    }

    // Auto-ocultar después de un tiempo
    let hideTimer: NodeJS.Timeout;
    if (autoHide && isVisible) {
      hideTimer = setTimeout(() => {
        setIsVisible(false);
      }, hideAfter);
    }

    // Detectar primera interacción
    const handleInteraction = () => {
      console.log("🎯 ScrollWatermark Interaction detected!");
      if (!hasInteracted) {
        setHasInteracted(true);
        setIsVisible(false);
        setDebugInfo("Hidden due to interaction");
      }
    };

    // Listeners para diferentes tipos de interacción
    window.addEventListener('scroll', handleInteraction, { once: true });
    window.addEventListener('touchmove', handleInteraction, { once: true });
    window.addEventListener('wheel', handleInteraction, { once: true });
    window.addEventListener('keydown', handleInteraction, { once: true });

    return () => {
      window.removeEventListener('resize', checkMobile);
      window.removeEventListener('scroll', handleInteraction);
      window.removeEventListener('touchmove', handleInteraction);
      window.removeEventListener('wheel', handleInteraction);
      window.removeEventListener('keydown', handleInteraction);
      if (avatarSync) {
        window.removeEventListener('avatarReallyVisible', handleAvatarReallyVisible as EventListener);
        window.removeEventListener('avatarFullyLoaded', handleAvatarLoaded as EventListener);
      }
      clearTimeout(showTimer);
      if (hideTimer) clearTimeout(hideTimer);
    };
  }, [delay, autoHide, hideAfter, hasInteracted, isVisible, avatarSync, avatarLoaded]);

  return (
    <AnimatePresence>
      {/* DEBUG OVERLAY - siempre visible para testear */}
      {process.env.NODE_ENV === 'development' && (
        <div className="fixed top-4 left-4 bg-red-500/80 text-white p-2 rounded text-xs z-[11000] font-mono max-w-xs">
          ScrollWatermark Debug:<br/>
          isVisible: {isVisible ? 'TRUE' : 'FALSE'}<br/>
          hasInteracted: {hasInteracted ? 'TRUE' : 'FALSE'}<br/>
          isMobile: {isMobile ? 'TRUE' : 'FALSE'}<br/>
          avatarLoaded: {avatarLoaded ? 'TRUE' : 'FALSE'}<br/>
          avatarSync: {avatarSync ? 'TRUE' : 'FALSE'}<br/>
          showTrigger: {showTrigger}<br/>
          Info: {debugInfo}<br/>
          <span className="text-yellow-300">
            🔍 Listening for:<br/>
            - avatarReallyVisible (primary)<br/>
            - avatarFullyLoaded (fallback)
          </span>
        </div>
      )}
      
      {/* FORCE VISIBLE FOR TESTING - remover después */}
      {(isVisible || process.env.NODE_ENV === 'development') && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ 
            opacity: 1, 
            scale: 1,
          }}
          exit={{ 
            opacity: 0, 
            scale: 0.9,
            transition: { duration: 0.3 }
          }}
          transition={{
            duration: 0.5,
            ease: "easeOut"
          }}
          className={`fixed inset-0 pointer-events-none z-[10000] flex items-center justify-center md:justify-end md:pr-12 ${
            isMobile ? 'pt-16' : ''  /* Bajar watermark en mobile proporcionalmente */
          }`}
        >
          {/* Container principal con efecto flotante */}
          <motion.div 
            className="relative"
            animate={{
              y: [0, -15, 0, 15, 0],  // Efecto de flotación/bouncing
            }}
            transition={{
              duration: 4,
              repeat: Infinity,
              ease: "easeInOut"
            }}
          >
            {/* Glow effect pulsante */}
            <motion.div
              animate={{
                scale: [1, 1.3, 1],
                opacity: [0.3, 0.6, 0.3],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute inset-0 bg-gradient-radial blur-3xl"
              style={{
                background: 'radial-gradient(circle, rgba(6,182,212,0.3) 0%, rgba(168,85,247,0.1) 40%, transparent 70%)',
                transform: 'translate(-50%, -50%) scale(2)',
                left: '50%',
                top: '50%',
              }}
            />
            
            {/* Card con el contenido - versión más compacta para estar junto al avatar */}
            <motion.div
              className="relative bg-black/40 backdrop-blur-xl border border-white/20 rounded-2xl p-4 md:p-6 shadow-2xl max-w-xs"
              style={{
                background: 'linear-gradient(135deg, rgba(0,0,0,0.5) 0%, rgba(6,182,212,0.15) 100%)',
              }}
              animate={{
                scale: [1, 1.02, 1],  // Respiración sutil
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
            >
              <div className="flex flex-col items-center gap-4">
                {/* Animación visual del gesto - más pequeña */}
                <div className="relative w-24 md:w-32 h-20 md:h-24">
                  {isMobile ? (
                    // MOBILE: Dedo deslizando en pantalla
                    <div className="relative w-full h-full">
                      {/* Marco de dispositivo */}
                      <div className="absolute inset-0 border-2 border-white/20 rounded-2xl bg-gradient-to-b from-white/5 to-transparent" />
                      
                      {/* Indicadores de contenido scrolleable */}
                      <div className="absolute inset-x-4 top-3 space-y-1">
                        <div className="h-1 bg-white/10 rounded-full" />
                        <div className="h-1 bg-white/10 rounded-full w-3/4" />
                        <div className="h-1 bg-white/10 rounded-full w-1/2" />
                      </div>
                      <div className="absolute inset-x-4 bottom-3 space-y-1">
                        <div className="h-1 bg-white/10 rounded-full w-2/3" />
                        <div className="h-1 bg-white/10 rounded-full" />
                      </div>
                      
                      {/* Dedo animado */}
                      <motion.div
                        animate={{
                          y: [25, -25, 25],
                        }}
                        transition={{
                          duration: 2.5,
                          repeat: Infinity,
                          ease: "easeInOut",
                        }}
                        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10"
                      >
                        <svg width="28" height="40" viewBox="0 0 28 40" fill="none">
                          <ellipse cx="14" cy="22" rx="11" ry="15" fill="rgba(0,0,0,0.2)" transform="translate(2, 2)" />
                          <ellipse cx="14" cy="22" rx="10" ry="14" fill="rgba(255,255,255,0.9)" />
                          <ellipse cx="14" cy="18" rx="8" ry="12" fill="rgba(255,255,255,0.95)" />
                          <ellipse cx="12" cy="16" rx="3" ry="5" fill="rgba(255,255,255,0.5)" />
                          <ellipse cx="14" cy="12" rx="6" ry="8" fill="rgba(6,182,212,0.3)" />
                        </svg>
                      </motion.div>
                      
                      {/* Trail effect del dedo */}
                      {[0, 0.3, 0.6].map((delay, i) => (
                        <motion.div
                          key={i}
                          animate={{
                            y: [25, -25, 25],
                            opacity: [0, 0.6, 0],
                          }}
                          transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            ease: "easeInOut",
                            delay: delay,
                          }}
                          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
                        >
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{
                              background: 'radial-gradient(circle, rgba(6,182,212,0.8) 0%, transparent 70%)',
                            }}
                          />
                        </motion.div>
                      ))}
                    </div>
                  ) : (
                    // DESKTOP: Scroll visual definido - más pequeño
                    <div className="relative w-full h-full flex items-center justify-center">
                      <div className="relative">
                        <div className="w-20 h-20 md:w-24 md:h-24 border-2 border-white/30 rounded-lg bg-gradient-to-b from-white/5 to-transparent relative overflow-hidden">
                          <div className="absolute inset-x-2 top-2 space-y-1">
                            <div className="h-1 bg-white/20 rounded-full" />
                            <div className="h-1 bg-white/20 rounded-full w-5/6" />
                            <div className="h-1 bg-white/20 rounded-full w-4/6" />
                            <div className="h-1 bg-white/15 rounded-full" />
                            <div className="h-1 bg-white/15 rounded-full w-5/6" />
                            <div className="h-1 bg-white/10 rounded-full w-4/6" />
                          </div>
                          
                          <div className="absolute inset-x-2 bottom-2 space-y-1 opacity-30">
                            <div className="h-1 bg-white/10 rounded-full w-3/4" />
                            <div className="h-1 bg-white/10 rounded-full" />
                            <div className="h-1 bg-white/10 rounded-full w-2/3" />
                          </div>
                          
                          <div className="absolute right-1 top-1 bottom-1 w-2 bg-white/10 rounded-full">
                            <motion.div
                              className="absolute w-full rounded-full"
                              style={{
                                height: '35%',
                                background: 'linear-gradient(180deg, rgba(6,182,212,0.9) 0%, rgba(168,85,247,0.7) 100%)',
                                boxShadow: '0 0 10px rgba(6,182,212,0.5)',
                              }}
                              animate={{
                                top: ['5%', '60%', '5%'],
                              }}
                              transition={{
                                duration: 2.5,
                                repeat: Infinity,
                                ease: "easeInOut",
                              }}
                            />
                          </div>
                        </div>
                        
                        <motion.div
                          className="absolute -right-8 md:-right-12 top-1/2 -translate-y-1/2"
                          animate={{
                            opacity: [0.5, 1, 0.5],
                          }}
                          transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut",
                          }}
                        >
                          <div className="flex flex-col items-center gap-1 text-cyan-400/70 text-xs font-bold tracking-widest">
                            {'SCROLL'.split('').map((letter, i) => (
                              <motion.span
                                key={i}
                                animate={{
                                  opacity: [0.3, 1, 0.3],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: "easeInOut",
                                  delay: i * 0.1,
                                }}
                              >
                                {letter}
                              </motion.span>
                            ))}
                          </div>
                        </motion.div>
                      </div>
                    </div>
                  )}
                </div>
                
                <motion.div
                  animate={{
                    opacity: [0.7, 1, 0.7],
                  }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                    delay: 0.5,
                  }}
                  className="flex flex-col items-center gap-1.5"
                >
                  <span className="text-white/90 font-semibold text-sm md:text-base tracking-wide text-center">
                    {isMobile ? 'Desliza para explorar' : 'Scroll para navegar'}
                  </span>
                  <span className="text-cyan-400/60 text-xs uppercase tracking-wider font-medium text-center">
                    {isMobile ? 'Swipe ↑ ↓' : 'Mouse wheel • ↑ ↓'}
                  </span>
                </motion.div>
              </div>
            </motion.div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ScrollWatermark;