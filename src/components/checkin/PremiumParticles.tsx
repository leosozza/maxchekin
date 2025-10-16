import { useMemo } from 'react';
import type { PerformanceMode } from '@/utils/performanceDetector';

interface PremiumParticlesProps {
  performanceMode: PerformanceMode;
}

interface Particle {
  id: number;
  size: number;
  left: number;
  delay: number;
  duration: number;
  drift: number;
  opacity: number;
}

export function PremiumParticles({ performanceMode }: PremiumParticlesProps) {
  const particles = useMemo(() => {
    const count = performanceMode === 'enhanced' ? 50 : 20;
    const result: Particle[] = [];

    for (let i = 0; i < count; i++) {
      result.push({
        id: i,
        size: Math.random() * 3 + 1, // 1-4px
        left: Math.random() * 100, // 0-100%
        delay: Math.random() * 5, // 0-5s
        duration: Math.random() * 10 + 15, // 15-25s
        drift: (Math.random() - 0.5) * 100, // -50 to +50px
        opacity: Math.random() * 0.4 + 0.3, // 0.3-0.7
      });
    }

    return result;
  }, [performanceMode]);

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      {particles.map((particle) => (
        <div
          key={particle.id}
          className="absolute bottom-0 rounded-full bg-gradient-gold animate-particle-float"
          style={{
            left: `${particle.left}%`,
            width: `${particle.size}px`,
            height: `${particle.size}px`,
            animationDelay: `${particle.delay}s`,
            animationDuration: `${particle.duration}s`,
            opacity: particle.opacity,
            filter: 'blur(0.5px)',
            '--drift': `${particle.drift}px`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
}
