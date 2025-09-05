"use client";
import { useEffect, useRef } from 'react';
import { useDesktopStore } from '../packages/desktop/store';
import { useScrollStore } from '../store/scrollStore';
import { RealAvatarScene } from './RealAvatarScene';
import ScrollWatermarkMinimal from '../packages/desktop/components/ScrollWatermarkMinimal';

export default function Desktop({ children }: { children?: React.ReactNode }) {
  const { windows } = useDesktopStore();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const { setScrollProgress } = useScrollStore();

  useEffect(() => {
    const handleScroll = () => {
      const scrollable = scrollContainerRef.current;
      if (scrollable) {
        const maxScroll = scrollable.scrollHeight - scrollable.clientHeight;
        const progress = maxScroll > 0 ? scrollable.scrollTop / maxScroll : 0;
        setScrollProgress(progress);
        console.log('📊 Scroll:', progress.toFixed(3));
      }
    };
    
    const container = scrollContainerRef.current;
    if (container) {
      container.addEventListener('scroll', handleScroll);
      handleScroll(); // Initial trigger
      return () => container.removeEventListener('scroll', handleScroll);
    }
  }, [setScrollProgress]);

  return (
    <div className="h-full w-full relative">
      {/* Avatar GLTF con estrellas - CAPA 3D DE FONDO */}
      <div className="absolute inset-0 z-0">
        <RealAvatarScene />
      </div>
      
      {/* SCROLL CONTAINER PRINCIPAL - todo el contenido es scrolleable */}
      <div 
        ref={scrollContainerRef} 
        className="relative h-full overflow-y-auto no-scrollbar"
        style={{ zIndex: 10 }}
      >
        {/* Wrapper para crear scroll space */}
        <div style={{ minHeight: '300vh' }} className="flex flex-col">
          {children}
        </div>
      </div>
      
      {/* ScrollWatermark minimalista */}
      <ScrollWatermarkMinimal 
        delay={1700}    // Aparece a los 1.7 segundos (+0.5seg retraso)  
        hideAfter={4500} // Dura 4.5 segundos (+0.5seg duración)
      />
    </div>
  );
}