"use client";

import { useEffect, useState } from 'react';
import { useDesktopStore } from '../packages/desktop/store';

interface ResponsiveConfig {
  sizeMultiplier: number;
  posOffset: number;
}

export function useResponsiveWindows() {
  const { windows, updateWindow } = useDesktopStore();
  const [currentConfig, setCurrentConfig] = useState<ResponsiveConfig>({ sizeMultiplier: 1, posOffset: 30 });

  const getResponsiveConfig = (): ResponsiveConfig => {
    if (typeof window === 'undefined') return { sizeMultiplier: 1, posOffset: 30 };
    
    const isTablet = window.matchMedia('(max-width: 1200px) and (min-width: 769px)').matches;
    const isSmallTablet = window.matchMedia('(max-width: 1024px) and (min-width: 769px)').matches;
    const isMobile = window.matchMedia('(max-width: 768px)').matches;
    
    if (isMobile) return { sizeMultiplier: 1, posOffset: 30 }; // Mobile usa comportamiento diferente
    if (isSmallTablet) return { sizeMultiplier: 0.85, posOffset: 20 };
    if (isTablet) return { sizeMultiplier: 0.92, posOffset: 20 };
    
    return { sizeMultiplier: 1, posOffset: 30 };
  };

  // Función para actualizar todas las ventanas según el nuevo tamaño
  const updateAllWindows = (newConfig: ResponsiveConfig) => {
    windows.forEach(windowInstance => {
      const app = windowInstance.app;
      
      if (!app.defaultSize) return;
      
      // Calcular nuevo tamaño basado en el multiplier
      const newSize = {
        width: Math.round(app.defaultSize.width * newConfig.sizeMultiplier),
        height: Math.round(app.defaultSize.height * newConfig.sizeMultiplier)
      };
      
      // Calcular nueva posición si es necesario (para evitar que salgan de pantalla)
      let newPosition = windowInstance.position;
      
      if (app.defaultPosition) {
        const posMultiplier = newConfig.sizeMultiplier > 0.9 ? 1 : 0.9;
        newPosition = {
          x: Math.round(app.defaultPosition.x * posMultiplier),
          y: Math.round(app.defaultPosition.y * posMultiplier)
        };
      }
      
      // Actualizar ventana solo si hay cambio significativo
      const sizeChanged = Math.abs(windowInstance.size.width - newSize.width) > 10;
      const posChanged = Math.abs(windowInstance.position.x - newPosition.x) > 5;
      
      if (sizeChanged || posChanged) {
        updateWindow(windowInstance.id, {
          size: newSize,
          position: newPosition
        });
      }
    });
  };

  useEffect(() => {
    const handleResize = () => {
      const newConfig = getResponsiveConfig();
      
      // Solo actualizar si la configuración cambió significativamente
      const configChanged = Math.abs(currentConfig.sizeMultiplier - newConfig.sizeMultiplier) > 0.05;
      
      if (configChanged) {
        console.log('📐 Responsive update:', {
          from: currentConfig.sizeMultiplier.toFixed(2),
          to: newConfig.sizeMultiplier.toFixed(2)
        });
        
        setCurrentConfig(newConfig);
        updateAllWindows(newConfig);
      }
    };

    // Configurar el listener con debounce para performance
    let resizeTimeout: NodeJS.Timeout;
    const debouncedResize = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(handleResize, 150); // 150ms debounce
    };

    window.addEventListener('resize', debouncedResize);
    
    // Ejecutar una vez al inicio
    handleResize();

    return () => {
      window.removeEventListener('resize', debouncedResize);
      clearTimeout(resizeTimeout);
    };
  }, [windows.length, currentConfig.sizeMultiplier]); // Re-ejecutar cuando cambien las ventanas

  return currentConfig;
}