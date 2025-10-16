import { useEffect, useState } from 'react';
import type { PerformanceMode } from '@/utils/performanceDetector';

interface ChromaticSplitProps {
  children: React.ReactNode;
  isActive: boolean;
  performanceMode: PerformanceMode;
  onTransitionEnd?: () => void;
}

export default function ChromaticSplit({
  children,
  isActive,
  performanceMode,
  onTransitionEnd,
}: ChromaticSplitProps) {
  const [phase, setPhase] = useState<'entering' | 'active' | 'exiting'>('entering');

  useEffect(() => {
    if (isActive) {
      setPhase('entering');
      const timer = setTimeout(() => setPhase('active'), 100);
      return () => clearTimeout(timer);
    } else {
      setPhase('exiting');
      const timer = setTimeout(() => {
        onTransitionEnd?.();
      }, performanceMode === 'enhanced' ? 1200 : 800);
      return () => clearTimeout(timer);
    }
  }, [isActive, performanceMode, onTransitionEnd]);

  const duration = performanceMode === 'enhanced' ? 'duration-[1200ms]' : 'duration-[800ms]';
  const baseClass = `absolute inset-0 transition-all ${duration}`;

  return (
    <div className="chromatic-container relative">
      {performanceMode === 'enhanced' && (
        <>
          <div 
            className={`${baseClass} mix-blend-screen ${
              phase === 'exiting' ? 'translate-x-[-10px] translate-y-[5px] opacity-0' : 'translate-x-0 translate-y-0 opacity-70'
            }`}
            style={{ filter: 'hue-rotate(120deg)' }}
          >
            {children}
          </div>
          <div 
            className={`${baseClass} mix-blend-screen ${
              phase === 'exiting' ? 'translate-x-[10px] translate-y-[-5px] opacity-0' : 'translate-x-0 translate-y-0 opacity-70'
            }`}
            style={{ filter: 'hue-rotate(240deg)' }}
          >
            {children}
          </div>
        </>
      )}
      <div 
        className={`${baseClass} ${
          phase === 'entering' ? 'opacity-0' : phase === 'active' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
