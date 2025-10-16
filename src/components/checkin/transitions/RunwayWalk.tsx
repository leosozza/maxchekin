import { useEffect, useState } from 'react';
import type { PerformanceMode } from '@/utils/performanceDetector';

interface RunwayWalkProps {
  children: React.ReactNode;
  isActive: boolean;
  performanceMode: PerformanceMode;
  onTransitionEnd?: () => void;
}

interface Layer {
  depth: number;
  opacity: number;
  blur: number;
  scale: number;
  zIndex: number;
}

export default function RunwayWalk({
  children,
  isActive,
  performanceMode,
  onTransitionEnd,
}: RunwayWalkProps) {
  const [phase, setPhase] = useState<'enter' | 'active' | 'exit'>('enter');

  // Define number of layers based on performance mode
  const layerCount = performanceMode === 'enhanced' ? 5 : 3;

  // Define layers with depth, opacity, blur, scale
  const layers: Layer[] = Array.from({ length: layerCount }, (_, i) => {
    const centerIndex = Math.floor(layerCount / 2);
    const distanceFromCenter = i - centerIndex;
    
    return {
      depth: distanceFromCenter * 400, // -800, -400, 0, 400, 800 for enhanced
      opacity: i === centerIndex ? 1 : Math.max(0.3, 1 - Math.abs(distanceFromCenter) * 0.3),
      blur: Math.abs(distanceFromCenter) * 8, // 0px at center, up to 16px at edges
      scale: 1 + (distanceFromCenter * 0.2), // 0.6 to 1.4 for enhanced
      zIndex: layerCount - Math.abs(distanceFromCenter),
    };
  });

  useEffect(() => {
    if (isActive) {
      setPhase('enter');
      const enterTimer = setTimeout(() => setPhase('active'), 100);
      return () => clearTimeout(enterTimer);
    } else {
      setPhase('exit');
      const exitTimer = setTimeout(() => {
        onTransitionEnd?.();
      }, performanceMode === 'enhanced' ? 1200 : 800);
      return () => clearTimeout(exitTimer);
    }
  }, [isActive, performanceMode, onTransitionEnd]);

  const duration = performanceMode === 'enhanced' ? 1200 : 800;

  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* 3D Perspective Container */}
      <div 
        className="runway-perspective-container absolute inset-0"
        style={{
          perspective: '2000px',
          perspectiveOrigin: '50% 50%',
        }}
      >
        {/* Render multiple layers */}
        {layers.map((layer, index) => {
          const isCenterLayer = index === Math.floor(layerCount / 2);
          
          return (
            <div
              key={index}
              className="runway-layer absolute inset-0 flex items-center justify-center"
              style={{
                transform: phase === 'enter' 
                  ? `translateZ(${layer.depth - 1000}px) scale(${layer.scale * 0.5})`
                  : phase === 'exit'
                  ? `translateZ(${layer.depth + 800}px) scale(${layer.scale * 1.5})`
                  : `translateZ(${layer.depth}px) scale(${layer.scale})`,
                opacity: phase === 'enter' 
                  ? 0 
                  : phase === 'exit' 
                  ? (isCenterLayer ? 0 : layer.opacity * 0.3)
                  : layer.opacity,
                filter: `blur(${phase === 'exit' ? layer.blur * 2 : layer.blur}px)`,
                zIndex: layer.zIndex,
                transition: `transform ${duration}ms cubic-bezier(0.4, 0, 0.2, 1), 
                            opacity ${duration}ms ease-out, 
                            filter ${duration}ms ease-out`,
                willChange: phase !== 'active' ? 'transform, opacity, filter' : 'auto',
                backfaceVisibility: 'hidden',
                transformStyle: 'preserve-3d',
              }}
            >
              {/* Only render content on center layer */}
              {isCenterLayer && (
                <div className="w-full h-full">
                  {children}
                </div>
              )}
              
              {/* Ghost images for depth layers (non-center) */}
              {!isCenterLayer && (
                <div 
                  className="w-full h-full bg-gradient-to-br from-primary/20 via-primary/10 to-transparent backdrop-blur-sm"
                  style={{
                    opacity: 0.5,
                  }}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Runway Floor Grid Effect */}
      <div 
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            linear-gradient(0deg, transparent 0%, transparent 45%, hsl(var(--primary) / 0.1) 50%, transparent 55%, transparent 100%),
            linear-gradient(90deg, transparent 0%, transparent 48%, hsl(var(--primary) / 0.05) 50%, transparent 52%, transparent 100%)
          `,
          backgroundSize: '100% 50px, 50px 100%',
          opacity: phase === 'active' ? 0.3 : 0,
          transition: `opacity ${duration}ms ease-out`,
        }}
      />

      {/* Spotlight Effect */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(circle at 50% 50%, transparent 20%, hsl(var(--background) / 0.8) 70%)',
          opacity: phase === 'active' ? 1 : 0,
          transition: `opacity ${duration}ms ease-out`,
        }}
      />
    </div>
  );
}
