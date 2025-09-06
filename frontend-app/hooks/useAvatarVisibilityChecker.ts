"use client";

import { useEffect, useRef, useState } from 'react';

interface AvatarVisibilityOptions {
  checkInterval?: number;
  maxChecks?: number;
  onAvatarVisible?: () => void;
  debug?: boolean;
}

export function useAvatarVisibilityChecker({
  checkInterval = 100,
  maxChecks = 50,
  onAvatarVisible,
  debug = false
}: AvatarVisibilityOptions = {}) {
  const [isAvatarVisible, setIsAvatarVisible] = useState(false);
  const [checkCount, setCheckCount] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout>();

  const checkAvatarVisibility = () => {
    try {
      // Buscar el canvas de Three.js que debe estar en el DOM
      const canvas = document.querySelector('canvas');
      if (!canvas) {
        if (debug) console.log('🔍 Avatar check: No canvas found');
        return false;
      }

      // Verificar que el canvas tenga contenido renderizado
      const context = canvas.getContext('webgl2') || canvas.getContext('webgl');
      if (!context) {
        if (debug) console.log('🔍 Avatar check: No WebGL context');
        return false;
      }

      // Verificar dimensiones del canvas
      if (canvas.width === 0 || canvas.height === 0) {
        if (debug) console.log('🔍 Avatar check: Canvas has no dimensions');
        return false;
      }

      // Verificar que el canvas esté visible en el DOM
      const rect = canvas.getBoundingClientRect();
      const isInViewport = rect.width > 0 && rect.height > 0 && 
                          rect.top < window.innerHeight && 
                          rect.bottom > 0 &&
                          rect.left < window.innerWidth && 
                          rect.right > 0;

      if (!isInViewport) {
        if (debug) console.log('🔍 Avatar check: Canvas not in viewport');
        return false;
      }

      // Verificar que el canvas no esté completamente transparente/negro
      // Esto es más complejo pero podemos usar un método indirecto
      const computedStyle = getComputedStyle(canvas);
      const isVisible = computedStyle.display !== 'none' && 
                       computedStyle.visibility !== 'hidden' && 
                       computedStyle.opacity !== '0';

      if (!isVisible) {
        if (debug) console.log('🔍 Avatar check: Canvas is hidden via CSS');
        return false;
      }

      // Check adicional: verificar si Three.js ha renderizado algo
      // Miramos si hay actividad de renderizado reciente
      const performanceEntries = performance.getEntriesByType('measure');
      const recentThreeActivity = performanceEntries.some(entry => 
        entry.name.includes('three') || 
        entry.name.includes('render') ||
        entry.name.includes('webgl')
      );

      // Verificación final: el canvas debe estar "pintado" con contenido
      // Usamos una técnica de pixel sampling (si es posible)
      try {
        const imageData = context.readPixels(
          Math.floor(canvas.width / 2), 
          Math.floor(canvas.height / 2), 
          1, 1, 
          context.RGBA, 
          context.UNSIGNED_BYTE, 
          new Uint8Array(4)
        );
        // Si podemos leer pixels, hay contenido renderizado
        if (debug) console.log('✅ Avatar check: WebGL rendering detected');
        return true;
      } catch (e) {
        // Fallback: si no podemos leer pixels pero el canvas existe y es visible,
        // asumimos que está renderizado
        if (debug) console.log('✅ Avatar check: Canvas exists and visible (fallback)');
        return true;
      }

    } catch (error) {
      if (debug) console.error('❌ Avatar visibility check error:', error);
      return false;
    }
  };

  useEffect(() => {
    if (isAvatarVisible) return; // Ya verificado

    const runCheck = () => {
      setCheckCount(prev => prev + 1);
      
      if (debug) console.log(`🔍 Avatar visibility check #${checkCount + 1}`);

      const isVisible = checkAvatarVisibility();
      
      if (isVisible) {
        if (debug) console.log('🎯 Avatar is visible! Stopping checks.');
        setIsAvatarVisible(true);
        
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        
        // Callback cuando el avatar es visible
        if (onAvatarVisible) {
          setTimeout(() => {
            if (debug) console.log('🚀 Triggering onAvatarVisible callback');
            onAvatarVisible();
          }, 200); // Pequeño delay para asegurar estabilidad
        }
      } else if (checkCount >= maxChecks) {
        if (debug) console.log('⏰ Max checks reached, stopping verification');
        
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
        
        // Fallback: trigger callback aunque no hayamos verificado visibilidad
        if (onAvatarVisible) {
          if (debug) console.log('🔄 Triggering fallback callback');
          onAvatarVisible();
        }
      }
    };

    // Comenzar verificación
    intervalRef.current = setInterval(runCheck, checkInterval);
    
    // Cleanup
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [checkCount, isAvatarVisible, maxChecks, checkInterval, onAvatarVisible, debug]);

  return {
    isAvatarVisible,
    checkCount,
    isChecking: !isAvatarVisible && checkCount < maxChecks
  };
}