import { useEffect, useState } from 'react';
import type { PerformanceMode } from '@/utils/performanceDetector';

interface BloomFadeProps {
  children: React.ReactNode;
  isActive: boolean;
  performanceMode: PerformanceMode;
  onTransitionEnd?: () => void;
}

export default function BloomFade({
  children,
  isActive,
  performanceMode,
  onTransitionEnd,
}: BloomFadeProps) {
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

  const getClassName = () => {
    const base = 'absolute inset-0 transition-all';
    const duration = performanceMode === 'enhanced' ? 'duration-[1200ms]' : 'duration-[800ms]';
    
    if (phase === 'entering') {
      return `${base} ${duration} opacity-0 scale-95 blur-[${performanceMode === 'enhanced' ? '20px' : '10px'}]`;
    }
    if (phase === 'active') {
      return `${base} ${duration} opacity-100 scale-100 blur-0`;
    }
    return `${base} ${duration} opacity-0 scale-105 blur-[${performanceMode === 'enhanced' ? '30px' : '15px'}] brightness-150`;
  };

  return (
    <div className={getClassName()}>
      {children}
    </div>
  );
}
