import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { MediaSlideshow } from './MediaSlideshow';
import { BrandingOverlay } from './BrandingOverlay';
import { detectPerformanceMode } from '@/utils/performanceDetector';
import type { PerformanceMode } from '@/utils/performanceDetector';

interface ScreensaverViewProps {
  onActivate: () => void;
}

export function ScreensaverView({ onActivate }: ScreensaverViewProps) {
  const [performanceMode, setPerformanceMode] = useState<PerformanceMode>('enhanced');

  useEffect(() => {
    const mode = detectPerformanceMode();
    setPerformanceMode(mode);
  }, []);

  // Check if there's an active fullscreen video
  const { data: media } = useQuery({
    queryKey: ['media-screensaver'],
    queryFn: async () => {
      const { data } = await supabase
        .from('media')
        .select('display_mode')
        .eq('is_active', true);
      return data;
    },
  });

  const hasFullscreenVideo = media?.some(item => item.display_mode === 'fullscreen-video');

  return (
    <div 
      className="fixed inset-0 z-50 cursor-pointer animate-screensaver-enter"
      onClick={onActivate}
    >
      {/* Media Slideshow Background */}
      <MediaSlideshow />

      {/* Premium Branding Overlay - Hidden for fullscreen videos */}
      {!hasFullscreenVideo && <BrandingOverlay performanceMode={performanceMode} />}

      {/* Tap to Activate Hint */}
      <div className="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-20">
        <div className="text-center animate-fade-in-delayed">
          <div className="inline-flex items-center gap-3 px-8 py-4 rounded-full bg-white/10 backdrop-blur-xl border border-white/20">
            <div className="w-3 h-3 bg-gradient-gold rounded-full animate-pulse-glow" />
            <p className="text-foreground text-lg font-medium">
              Toque na tela para realizar check-in
            </p>
          </div>
        </div>
      </div>

      {/* Decorative Tech Grid */}
      <div className="tech-grid absolute inset-0 opacity-10 pointer-events-none" />
    </div>
  );
}
