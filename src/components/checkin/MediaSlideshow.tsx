import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Media {
  id: string;
  type: 'image' | 'video';
  url: string;
  title: string | null;
}

export function MediaSlideshow() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const { data: mediaItems = [] } = useQuery({
    queryKey: ['screensaver-media'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media')
        .select('id, type, url, title')
        .eq('is_active', true)
        .order('sort_order');

      if (error) throw error;
      return (data || []) as Media[];
    },
    refetchInterval: 60000, // Atualiza a cada 1 minuto
  });

  // Auto-advance slides
  useEffect(() => {
    if (mediaItems.length === 0) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % mediaItems.length);
    }, 8000); // Troca a cada 8 segundos

    return () => clearInterval(interval);
  }, [mediaItems.length]);

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

  return (
    <div className="absolute inset-0 bg-studio-dark overflow-hidden">
      {/* Media Slides */}
      {mediaItems.map((media, index) => {
        const isActive = index === currentIndex;
        const isPrev = index === (currentIndex - 1 + mediaItems.length) % mediaItems.length;

        return (
          <div
            key={media.id}
            className={`absolute inset-0 transition-all duration-[1500ms] ease-in-out ${
              isActive 
                ? 'opacity-100 scale-100 z-10' 
                : isPrev
                ? 'opacity-0 scale-95 z-0'
                : 'opacity-0 scale-110 z-0'
            }`}
          >
            {media.type === 'image' ? (
              <div className="relative w-full h-full">
                <img
                  src={media.url}
                  alt={media.title || 'MaxFama'}
                  className={`w-full h-full object-cover ${
                    isActive ? 'animate-parallax-slide' : ''
                  }`}
                />
                <div className="absolute inset-0 bg-gradient-to-br from-studio-dark/40 via-transparent to-gold-shimmer/20 animate-gradient-shift" />
              </div>
            ) : (
              <video
                src={media.url}
                autoPlay
                muted
                loop
                playsInline
                className="w-full h-full object-cover"
              />
            )}

            {/* Overlay com título */}
            {media.title && (
              <div className="absolute bottom-0 left-0 right-0 p-12 bg-gradient-to-t from-studio-dark/90 to-transparent">
                <h3 className="text-4xl font-bold text-foreground mb-2 animate-slide-in">
                  {media.title}
                </h3>
              </div>
            )}
          </div>
        );
      })}

      {/* Floating Particles */}
      <div className="absolute inset-0 pointer-events-none">
        {[...Array(20)].map((_, i) => (
          <div
            key={i}
            className="absolute w-1 h-1 bg-gold-shimmer rounded-full animate-float"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 5}s`,
              animationDuration: `${15 + Math.random() * 10}s`,
            }}
          />
        ))}
      </div>

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
    </div>
  );
}
