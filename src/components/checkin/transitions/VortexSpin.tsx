import { useEffect, useState } from 'react';
import type { PerformanceMode } from '@/utils/performanceDetector';

interface VortexSpinProps {
  children: React.ReactNode;
  isActive: boolean;
  performanceMode: PerformanceMode;
  onTransitionEnd?: () => void;
}

export default function VortexSpin({
  children,
  isActive,
  performanceMode,
  onTransitionEnd,
}: VortexSpinProps) {
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
        ? 'rotate-[360deg] scale-[2]'
        : 'rotate-[180deg] scale-[1.5]';
    }
    if (phase === 'active') {
      return 'rotate-0 scale-100';
    }
    return performanceMode === 'enhanced'
      ? 'rotate-[-720deg] scale-[0.2]'
      : 'rotate-[-360deg] scale-[0.5]';
  };

  const getBlur = () => {
    if (phase === 'entering') return 'blur-[30px]';
    if (phase === 'active') return 'blur-0';
    return 'blur-[40px]';
  };

  return (
    <div 
      className={`absolute inset-0 transition-all ${duration} ease-out ${getTransform()} ${getBlur()} ${
        phase === 'entering' ? 'opacity-0' : phase === 'active' ? 'opacity-100' : 'opacity-0'
      }`}
      style={{ transformOrigin: 'center center' }}
    >
      {children}
    </div>
  );
}
