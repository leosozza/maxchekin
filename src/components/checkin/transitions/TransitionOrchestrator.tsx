import { lazy, Suspense } from 'react';
import type { TransitionType } from '@/utils/prng';
import type { PerformanceMode } from '@/utils/performanceDetector';

interface TransitionOrchestratorProps {
  children: React.ReactNode;
  transitionType: TransitionType;
  isActive: boolean;
  performanceMode: PerformanceMode;
  onTransitionEnd?: () => void;
}

// Lazy load transition components
const BloomFade = lazy(() => import('./BloomFade'));
const ChromaticSplit = lazy(() => import('./ChromaticSplit'));
const ParallaxDeep = lazy(() => import('./ParallaxDeep'));
const VortexSpin = lazy(() => import('./VortexSpin'));
const GlassMorph = lazy(() => import('./GlassMorph'));

const transitionComponents = {
  'bloom-fade': BloomFade,
  'chromatic-split': ChromaticSplit,
  'parallax-deep': ParallaxDeep,
  'vortex-spin': VortexSpin,
  'glass-morph': GlassMorph,
};

export function TransitionOrchestrator({
  children,
  transitionType,
  isActive,
  performanceMode,
  onTransitionEnd,
}: TransitionOrchestratorProps) {
  const TransitionComponent = transitionComponents[transitionType];

  return (
    <Suspense fallback={<div className="absolute inset-0">{children}</div>}>
      <TransitionComponent
        isActive={isActive}
        performanceMode={performanceMode}
        onTransitionEnd={onTransitionEnd}
      >
        {children}
      </TransitionComponent>
    </Suspense>
  );
}
