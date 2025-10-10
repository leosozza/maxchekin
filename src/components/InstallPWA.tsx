import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { X, Download } from 'lucide-react';

export function InstallPWA() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted install');
    }
    
    setDeferredPrompt(null);
    setShowInstall(false);
  };

  const handleDismiss = () => {
    setShowInstall(false);
    localStorage.setItem('pwa-dismissed', 'true');
  };

  // Don't show if user dismissed before
  useEffect(() => {
    if (localStorage.getItem('pwa-dismissed') === 'true') {
      setShowInstall(false);
    }
  }, []);

  if (!showInstall) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 bg-gold text-black p-4 rounded-lg shadow-2xl z-50 animate-in slide-in-from-bottom">
      <button
        onClick={handleDismiss}
        className="absolute top-2 right-2 p-1 hover:bg-black/10 rounded-full transition-colors"
        aria-label="Fechar"
      >
        <X className="h-4 w-4" />
      </button>
      
      <div className="flex items-start gap-3">
        <Download className="h-6 w-6 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <p className="font-bold text-lg mb-1">Instalar MaxCheckin</p>
          <p className="text-sm mb-3 text-black/80">
            Adicione à tela inicial para acesso rápido e use offline!
          </p>
          <div className="flex gap-2">
            <Button 
              onClick={handleInstall} 
              className="bg-black text-gold hover:bg-black/90"
              size="sm"
            >
              Instalar
            </Button>
            <Button 
              variant="outline" 
              onClick={handleDismiss}
              className="border-black text-black hover:bg-black/5"
              size="sm"
            >
              Agora não
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
