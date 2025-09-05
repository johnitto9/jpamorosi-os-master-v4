"use client"

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

interface ScrollWatermarkSimpleProps {
  delay?: number;
  hideAfter?: number;
}

const ScrollWatermarkSimple: React.FC<ScrollWatermarkSimpleProps> = ({ 
  delay = 1500,
  hideAfter = 4000
}) => {
  const [show, setShow] = useState(false);
  const [mounted, setMounted] = useState(false);
  
  useEffect(() => {
    console.log("🎯 ScrollWatermarkSimple mounted! Starting timer...");
    setMounted(true);
    
    // Mostrar después del delay
    const showTimer = setTimeout(() => {
      console.log("🚀 ScrollWatermarkSimple showing after", delay, "ms");
      setShow(true);
    }, delay);
    
    // Auto-ocultar
    const hideTimer = setTimeout(() => {
      console.log("⏰ ScrollWatermarkSimple auto-hiding...");
      setShow(false);
    }, delay + hideAfter);
    
    // Ocultar en scroll
    const handleScroll = () => {
      console.log("📜 ScrollWatermarkSimple hiding due to scroll");
      setShow(false);
    };
    
    window.addEventListener('scroll', handleScroll, { once: true });
    
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [delay, hideAfter]);
  
  if (!mounted) return null;
  
  return (
    <div className="pointer-events-none">
      
      {show && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ 
            opacity: 1, 
            scale: 1, 
            y: [0, -10, 0, 10, 0] // Floating effect
          }}
          exit={{ opacity: 0, scale: 0.8 }}
          transition={{
            duration: 0.6,
            y: {
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }}
          className="fixed top-1/2 right-8 z-[10001] transform -translate-y-1/2"
        >
          {/* Card principal más profesional */}
          <div className="relative">
            {/* Glow effect animado más dramático */}
            <motion.div 
              className="absolute inset-0 rounded-3xl blur-2xl"
              animate={{
                opacity: [0.4, 0.8, 0.4],
                scale: [1, 1.1, 1],
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              style={{
                background: 'radial-gradient(circle, rgba(6,182,212,0.6) 0%, rgba(168,85,247,0.4) 50%, rgba(236,72,153,0.2) 100%)',
              }}
            />
            
            {/* Card con glassmorphism avanzado */}
            <div className="relative bg-gradient-to-br from-black/60 via-black/40 to-black/60 backdrop-blur-2xl border border-white/20 rounded-3xl p-6 shadow-2xl">
              {/* Borde interno brillante */}
              <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-cyan-400/10 via-transparent to-purple-400/10 pointer-events-none" />
              
              {/* Contenido */}
              <div className="relative z-10 text-center space-y-3">
                {/* Icono animado más sofisticado */}
                <motion.div 
                  className="flex justify-center"
                  animate={{
                    y: [0, -8, 0, 8, 0],
                  }}
                  transition={{
                    duration: 2.5,
                    repeat: Infinity,
                    ease: "easeInOut"
                  }}
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-cyan-400 via-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
                      <motion.div
                        animate={{ rotate: [0, 180, 360] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
                        className="text-white text-xl font-bold"
                      >
                        ↕
                      </motion.div>
                    </div>
                    {/* Anillo orbital */}
                    <motion.div
                      className="absolute inset-0 rounded-full border-2 border-cyan-400/30"
                      animate={{ rotate: [0, 360] }}
                      transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                      style={{ width: '120%', height: '120%', left: '-10%', top: '-10%' }}
                    />
                  </div>
                </motion.div>
                
                {/* Texto principal con gradiente */}
                <div>
                  <h3 className="text-lg font-bold bg-gradient-to-r from-cyan-400 via-blue-400 to-purple-400 bg-clip-text text-transparent mb-1">
                    Scroll to Explore
                  </h3>
                  <p className="text-white/80 text-sm font-medium">
                    Navigate the experience
                  </p>
                </div>
                
                {/* Indicadores de métodos con iconos */}
                <div className="flex justify-center gap-4 pt-2">
                  <div className="flex items-center gap-1 text-cyan-400/60 text-xs">
                    <span>🖱️</span>
                    <span>Wheel</span>
                  </div>
                  <div className="flex items-center gap-1 text-purple-400/60 text-xs">
                    <span>⌨️</span>
                    <span>Keys</span>
                  </div>
                  <div className="flex items-center gap-1 text-pink-400/60 text-xs">
                    <span>👆</span>
                    <span>Touch</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default ScrollWatermarkSimple;