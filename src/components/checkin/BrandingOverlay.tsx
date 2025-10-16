import { useState, useEffect } from 'react';
import type { PerformanceMode } from '@/utils/performanceDetector';
import { PremiumParticles } from './PremiumParticles';

interface BrandingOverlayProps {
  performanceMode: PerformanceMode;
}

const TAGLINES = [
  "Onde estrelas nascem",
  "Sua imagem, nossa paixão",
  "Brilhe com MaxFama",
  "Carreira de modelo começa aqui",
  "Do casting à passarela",
];

export function BrandingOverlay({ performanceMode }: BrandingOverlayProps) {
  const [currentTaglineIndex, setCurrentTaglineIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTaglineIndex((prev) => (prev + 1) % TAGLINES.length);
    }, 8000); // Change tagline every 8 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="absolute inset-0 pointer-events-none z-10">
      {/* Premium Particles */}
      {performanceMode === 'enhanced' && (
        <PremiumParticles performanceMode={performanceMode} />
      )}

      {/* Logo 3D */}
      <div className="absolute top-12 left-1/2 transform -translate-x-1/2">
        <div className="logo-3d-container relative">
          <h1 
            className="text-7xl md:text-8xl font-black bg-gradient-gold bg-clip-text text-transparent animate-logo-float"
            style={{
              textShadow: performanceMode === 'enhanced'
                ? '2px 2px 0 rgba(255, 215, 0, 0.3), 4px 4px 0 rgba(255, 215, 0, 0.2), 6px 6px 0 rgba(255, 215, 0, 0.1)'
                : '2px 2px 0 rgba(255, 215, 0, 0.3)',
            }}
          >
            MaxFama
          </h1>
        </div>
      </div>

      {/* Tagline Rotativa */}
      <div className="absolute top-32 left-1/2 transform -translate-x-1/2 w-full max-w-2xl px-4">
        <div className="h-12 flex items-center justify-center overflow-hidden">
          <p 
            key={currentTaglineIndex}
            className="text-xl md:text-2xl font-medium text-foreground/80 animate-tagline-rotate text-center"
          >
            {TAGLINES[currentTaglineIndex]}
          </p>
        </div>
      </div>

      {/* QR Code Corner (discreto) */}
      <div className="absolute bottom-8 right-8 pointer-events-auto">
        <div className="flex flex-col items-center gap-2 p-3 rounded-xl bg-black/20 backdrop-blur-sm border border-white/10">
          <div className="w-20 h-20 bg-white/90 rounded-lg flex items-center justify-center">
            {/* Placeholder for QR code - você pode adicionar um componente QR real */}
            <div className="text-xs text-center text-black font-mono p-2">
              QR<br/>Code
            </div>
          </div>
          <span className="text-xs text-foreground/60">Siga-nos</span>
        </div>
      </div>
    </div>
  );
}
