import { useEffect, useState } from 'react';
import type { PerformanceMode } from '@/utils/performanceDetector';

interface GlassMorphProps {
  children: React.ReactNode;
  isActive: boolean;
  performanceMode: PerformanceMode;
  onTransitionEnd?: () => void;
}

export default function GlassMorph({
  children,
  isActive,
  performanceMode,
  onTransitionEnd,
}: GlassMorphProps) {
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

  return (
    <div className="relative">
      {performanceMode === 'enhanced' && phase !== 'active' && (
        <>
          <div 
            className={`absolute inset-0 backdrop-blur-[10px] bg-white/10 border border-white/20 transition-all ${duration} ${
              phase === 'exiting' ? 'opacity-100' : 'opacity-0'
            }`}
          />
          <div 
            className={`absolute inset-0 backdrop-blur-[20px] bg-white/5 transition-all ${duration} delay-100 ${
              phase === 'exiting' ? 'opacity-100 scale-95' : 'opacity-0 scale-100'
            }`}
          />
        </>
      )}
      <div 
        className={`absolute inset-0 transition-all ${duration} ${
          phase === 'entering' ? 'opacity-0 scale-110' : phase === 'active' ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
        }`}
      >
        {children}
      </div>
    </div>
  );
}
