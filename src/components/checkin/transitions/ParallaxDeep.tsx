import { useEffect, useState } from 'react';
import type { PerformanceMode } from '@/utils/performanceDetector';

interface ParallaxDeepProps {
  children: React.ReactNode;
  isActive: boolean;
  performanceMode: PerformanceMode;
  onTransitionEnd?: () => void;
}

export default function ParallaxDeep({
  children,
  isActive,
  performanceMode,
  onTransitionEnd,
}: ParallaxDeepProps) {
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

  const getTransform = () => {
    if (phase === 'entering') {
      return performanceMode === 'enhanced'
        ? 'perspective-[2000px] translate-z-[-500px] rotate-y-[15deg] scale-[0.8]'
        : 'scale-[0.8] translate-x-[100px]';
    }
    if (phase === 'active') {
      return performanceMode === 'enhanced'
        ? 'perspective-[2000px] translate-z-0 rotate-y-0 scale-100'
        : 'scale-100 translate-x-0';
    }
    return performanceMode === 'enhanced'
      ? 'perspective-[2000px] translate-z-[-500px] rotate-y-[-15deg] scale-[0.8]'
      : 'scale-[0.8] translate-x-[-100px]';
  };

  return (
    <div 
      className={`absolute inset-0 transition-all ${duration} ${getTransform()} ${
        phase === 'entering' ? 'opacity-0' : phase === 'active' ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ 
        transformStyle: 'preserve-3d',
        backfaceVisibility: 'hidden'
      }}
    >
      {children}
    </div>
  );
}
