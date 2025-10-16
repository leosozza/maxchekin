import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { detectPerformanceMode } from '@/utils/performanceDetector';
import type { PerformanceMode } from '@/utils/performanceDetector';
import { SeededRandom } from '@/utils/prng';
import type { TransitionType } from '@/utils/prng';
import { MediaPreloader } from '@/utils/mediaPreloader';
import { ScreensaverMetrics } from '@/utils/screensaverMetrics';
import { TransitionOrchestrator } from './transitions/TransitionOrchestrator';
import { FullscreenVideo } from './FullscreenVideo';

interface Media {
  id: string;
  type: 'image' | 'video';
  url: string;
  title: string | null;
  display_mode?: 'slideshow' | 'fullscreen-video';
}

export function MediaSlideshow() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>('enhanced');
  const [transitionType, setTransitionType] = useState<TransitionType>('bloom-fade');
  const [isActive, setIsActive] = useState(true);

  const preloaderRef = useRef(new MediaPreloader());
  const prngRef = useRef(new SeededRandom());
  const metricsRef = useRef<ScreensaverMetrics | null>(null);
  const fpsMonitorRef = useRef({
    frames: 0,
    lastTime: performance.now(),
    fps: 60,
  });
  const mediaStartTimeRef = useRef(Date.now());

  const { data: allMedia = [] } = useQuery({
    queryKey: ['screensaver-media'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media')
        .select('id, type, url, title, display_mode')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return (data || []) as Media[];
    },
    refetchInterval: 60000,
  });

  // Check if there's a fullscreen video
  const fullscreenVideo = allMedia.find(item => item.display_mode === 'fullscreen-video');
  
  // Filter slideshow items (everything that's not fullscreen-video)
  const mediaItems = allMedia.filter(item => item.display_mode !== 'fullscreen-video');

  // Initialize performance detection and metrics
  useEffect(() => {
    const mode = detectPerformanceMode();
    setPerformanceMode(mode);
    metricsRef.current = new ScreensaverMetrics(mode);
    
    console.log(`🎨 Screensaver running in ${mode} mode`);
  }, []);

  // FPS Monitor
  useEffect(() => {
    const updateFPS = () => {
      fpsMonitorRef.current.frames++;
      const now = performance.now();
      const delta = now - fpsMonitorRef.current.lastTime;

      if (delta >= 1000) {
        fpsMonitorRef.current.fps = Math.round(
          (fpsMonitorRef.current.frames * 1000) / delta
        );
        fpsMonitorRef.current.frames = 0;
        fpsMonitorRef.current.lastTime = now;

        // Track FPS
        if (metricsRef.current) {
          metricsRef.current.trackFPS(fpsMonitorRef.current.fps);

          // Auto-adjust performance mode
          if (metricsRef.current.shouldDowngrade() && performanceMode === 'enhanced') {
            console.log('⚠️ Downgrading to lite mode due to low FPS');
            setPerformanceMode('lite');
          } else if (metricsRef.current.shouldUpgrade() && performanceMode === 'lite') {
            console.log('✨ Upgrading to enhanced mode due to high FPS');
            setPerformanceMode('enhanced');
          }
        }
      }

      requestAnimationFrame(updateFPS);
    };

    const rafId = requestAnimationFrame(updateFPS);
    return () => cancelAnimationFrame(rafId);
  }, [performanceMode]);

  // Preload next media
  useEffect(() => {
    if (mediaItems.length === 0) return;

    const timer = setTimeout(() => {
      const nextIndex = (currentIndex + 1) % mediaItems.length;
      const nextMedia = mediaItems[nextIndex];
      preloaderRef.current.preloadNext(nextMedia.url, nextMedia.type);
    }, 2000);

    return () => clearTimeout(timer);
  }, [currentIndex, mediaItems]);

  // Slideshow interval with transitions
  useEffect(() => {
    if (mediaItems.length === 0) return;

    const interval = setInterval(() => {
      // Track media view time
      if (metricsRef.current && mediaItems[currentIndex]) {
        const viewDuration = Date.now() - mediaStartTimeRef.current;
        metricsRef.current.trackMediaView(
          mediaItems[currentIndex].id,
          viewDuration
        );
      }

      // Pick next transition via PRNG
      const nextTransition = prngRef.current.pickTransition();
      setTransitionType(nextTransition);

      // Track cycle
      if (metricsRef.current) {
        metricsRef.current.trackCycle(nextTransition);
      }

      // Trigger transition
      setIsActive(false);
      setTimeout(() => {
        setCurrentIndex((prev) => (prev + 1) % mediaItems.length);
        setIsActive(true);
        mediaStartTimeRef.current = Date.now();
      }, 300);
    }, 7000);

    return () => clearInterval(interval);
  }, [mediaItems, currentIndex]);

  // If fullscreen video exists, render it exclusively
  if (fullscreenVideo) {
    return <FullscreenVideo url={fullscreenVideo.url} title={fullscreenVideo.title || undefined} />;
  }

  if (mediaItems.length === 0) {
    return (
      <div className="absolute inset-0 bg-gradient-studio">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center space-y-6 animate-fade-in">
            <div className="w-32 h-32 mx-auto relative">
              <div className="absolute inset-0 bg-gradient-gold rounded-full animate-pulse-glow opacity-30" />
              <div className="absolute inset-4 bg-gradient-neon rounded-full animate-pulse-glow opacity-50" />
            </div>
            <h2 className="text-5xl font-bold bg-gradient-gold bg-clip-text text-transparent">
              MaxFama
            </h2>
            <p className="text-muted-foreground text-xl">
              Agência de Modelos
            </p>
          </div>
        </div>
        <div className="tech-grid absolute inset-0 opacity-20" />
      </div>
    );
  }

  const currentMedia = mediaItems[currentIndex];

  return (
    <div className="absolute inset-0 bg-studio-dark overflow-hidden">
      <TransitionOrchestrator
        transitionType={transitionType}
        isActive={isActive}
        performanceMode={performanceMode}
      >
        <div className="absolute inset-0">
          {currentMedia?.type === 'image' ? (
            <div className="relative w-full h-full">
              <img
                src={currentMedia.url}
                alt={currentMedia.title || 'MaxFama'}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-br from-studio-dark/40 via-transparent to-gold-shimmer/20" />
            </div>
          ) : (
            <video
              src={currentMedia?.url}
              autoPlay
              muted
              loop
              playsInline
              className="w-full h-full object-cover"
            />
          )}

          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent pointer-events-none" />

          {/* Title overlay */}
          {currentMedia?.title && (
            <div className="absolute bottom-32 left-1/2 transform -translate-x-1/2 z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white text-center px-6 py-3 bg-black/30 backdrop-blur-sm rounded-full">
                {currentMedia.title}
              </h2>
            </div>
          )}
        </div>
      </TransitionOrchestrator>

      {/* Slide Indicators */}
      {mediaItems.length > 1 && (
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 z-20">
          {mediaItems.map((_, index) => (
            <div
              key={index}
              className={`h-1 rounded-full transition-all duration-500 ${
                index === currentIndex 
                  ? 'w-12 bg-gradient-gold' 
                  : 'w-8 bg-white/30'
              }`}
            />
          ))}
        </div>
      )}

      {/* FPS Counter (debug - only in dev) */}
      {import.meta.env.DEV && (
        <div className="absolute top-4 right-4 text-xs text-white/50 bg-black/50 px-2 py-1 rounded z-50">
          {fpsMonitorRef.current.fps} FPS | {performanceMode} | {transitionType}
        </div>
      )}
    </div>
  );
}
