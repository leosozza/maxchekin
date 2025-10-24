import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [videoEnded, setVideoEnded] = useState(false);

  useEffect(() => {
    // Forçar conclusão após 5s caso vídeo não carregue
    const safetyTimeout = setTimeout(() => {
      onComplete();
    }, 5000);

    return () => clearTimeout(safetyTimeout);
  }, [onComplete]);

  const handleVideoEnd = () => {
    setVideoEnded(true);
    setTimeout(() => {
      onComplete();
    }, 300);
  };

  return (
    <div className={`fixed inset-0 z-[999] bg-black flex items-center justify-center transition-opacity duration-300 ${
      videoEnded ? 'opacity-0' : 'opacity-100'
    }`}>
      <video
        autoPlay
        muted
        playsInline
        onEnded={handleVideoEnd}
        className="w-full h-full object-contain"
        src="/splash-video.mp4"
      />
    </div>
  );
}
