"use client";

import { useEffect } from 'react';
import { useAvatarVisibilityChecker } from '../hooks/useAvatarVisibilityChecker';

interface AvatarVisibilityVerifierProps {
  onAvatarReallyVisible?: () => void;
  debug?: boolean;
  checkInterval?: number;
  maxChecks?: number;
}

export function AvatarVisibilityVerifier({ 
  onAvatarReallyVisible,
  debug = process.env.NODE_ENV === 'development',
  checkInterval = 100,
  maxChecks = 100 // 10 segundos máximo
}: AvatarVisibilityVerifierProps) {
  
  const { isAvatarVisible, checkCount, isChecking } = useAvatarVisibilityChecker({
    checkInterval,
    maxChecks,
    debug,
    onAvatarVisible: () => {
      if (debug) {
        console.log('🎯 AvatarVisibilityVerifier: Avatar is REALLY visible!');
      }
      
      // Emitir evento personalizado más confiable
      const avatarReallyVisibleEvent = new CustomEvent('avatarReallyVisible', {
        detail: { 
          timestamp: Date.now(),
          message: 'Avatar 3D is REALLY visible and rendered on screen',
          checkCount,
          verified: true
        }
      });
      window.dispatchEvent(avatarReallyVisibleEvent);
      
      // Callback si se proporciona
      if (onAvatarReallyVisible) {
        onAvatarReallyVisible();
      }
    }
  });

  // Debug info en desarrollo
  useEffect(() => {
    if (!debug) return;

    const debugInfo = {
      isAvatarVisible,
      checkCount,
      isChecking,
      maxChecks
    };

    console.log('🔍 AvatarVisibilityVerifier status:', debugInfo);
  }, [isAvatarVisible, checkCount, isChecking, debug, maxChecks]);

  // Este componente no renderiza nada, solo verifica
  return null;
}