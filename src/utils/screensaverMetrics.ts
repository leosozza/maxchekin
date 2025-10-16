import type { TransitionType } from './prng';
import type { PerformanceMode } from './performanceDetector';

interface Metrics {
  totalCycles: number;
  averageFPS: number;
  transitionCounts: Record<TransitionType, number>;
  performanceMode: PerformanceMode;
  sessionStartTime: number;
  mediaViewTimes: Record<string, number>;
}

const STORAGE_KEY = 'maxfama_screensaver_metrics';

export class ScreensaverMetrics {
  private metrics: Metrics;
  private fpsHistory: number[] = [];
  private readonly MAX_FPS_HISTORY = 30;

  constructor(performanceMode: PerformanceMode) {
    this.metrics = this.loadMetrics(performanceMode);
  }

  private loadMetrics(performanceMode: PerformanceMode): Metrics {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return {
          ...parsed,
          performanceMode,
          sessionStartTime: Date.now(),
        };
      }
    } catch (error) {
      console.warn('Failed to load metrics:', error);
    }

    return {
      totalCycles: 0,
      averageFPS: 60,
      transitionCounts: {
        'bloom-fade': 0,
        'chromatic-split': 0,
        'parallax-deep': 0,
        'vortex-spin': 0,
        'glass-morph': 0,
      },
      performanceMode,
      sessionStartTime: Date.now(),
      mediaViewTimes: {},
    };
  }

  private saveMetrics(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.metrics));
    } catch (error) {
      console.warn('Failed to save metrics:', error);
    }
  }

  trackCycle(transitionType: TransitionType): void {
    this.metrics.totalCycles++;
    this.metrics.transitionCounts[transitionType]++;
    this.saveMetrics();
  }

  trackFPS(fps: number): void {
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > this.MAX_FPS_HISTORY) {
      this.fpsHistory.shift();
    }

    // Calculate moving average
    const sum = this.fpsHistory.reduce((a, b) => a + b, 0);
    this.metrics.averageFPS = Math.round(sum / this.fpsHistory.length);
  }

  trackMediaView(mediaId: string, duration: number): void {
    this.metrics.mediaViewTimes[mediaId] =
      (this.metrics.mediaViewTimes[mediaId] || 0) + duration;
    this.saveMetrics();
  }

  getReport(): Metrics {
    return { ...this.metrics };
  }

  getSessionDuration(): number {
    return Date.now() - this.metrics.sessionStartTime;
  }

  reset(): void {
    localStorage.removeItem(STORAGE_KEY);
    this.metrics = this.loadMetrics(this.metrics.performanceMode);
    this.fpsHistory = [];
  }

  shouldDowngrade(): boolean {
    // Downgrade if FPS < 30 consistently
    return this.fpsHistory.length >= 10 &&
           this.metrics.averageFPS < 30 &&
           this.metrics.performanceMode === 'enhanced';
  }

  shouldUpgrade(): boolean {
    // Upgrade if FPS > 55 consistently in lite mode
    return this.fpsHistory.length >= 20 &&
           this.metrics.averageFPS > 55 &&
           this.metrics.performanceMode === 'lite';
  }
}
