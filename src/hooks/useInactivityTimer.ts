import { useEffect, useRef, useState } from 'react';

interface UseInactivityTimerProps {
  onInactive: () => void;
  timeout?: number; // em milissegundos
  enabled?: boolean;
}

export function useInactivityTimer({ 
  onInactive, 
  timeout = 30000, // 30 segundos padrão
  enabled = true 
}: UseInactivityTimerProps) {
  const [isActive, setIsActive] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const resetTimer = () => {
    if (!enabled) return;

    setIsActive(true);
    
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      setIsActive(false);
      onInactive();
    }, timeout);
  };

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      setIsActive(true);
      return;
    }

    // Eventos que resetam o timer
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
    ];

    // Inicializa o timer
    resetTimer();

    // Adiciona listeners
    events.forEach(event => {
      document.addEventListener(event, resetTimer);
    });

    // Cleanup
    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
      events.forEach(event => {
        document.removeEventListener(event, resetTimer);
      });
    };
  }, [enabled, timeout]);

  return { isActive, resetTimer };
}
