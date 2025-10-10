import { useEffect, useState, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { supabase } from "@/integrations/supabase/client";
import { Sparkles, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface ModelData {
  lead_id: string;
  name: string;
  photo: string;
  responsible: string;
}

export default function CheckInNew() {
  const [scanning, setScanning] = useState(true);
  const [modelData, setModelData] = useState<ModelData | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    initScanner();
    return () => {
      stopScanner();
    };
  }, []);

  const initScanner = async () => {
    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
        },
        onScanSuccess,
        onScanError
      );
    } catch (err) {
      console.error("Failed to start scanner:", err);
      toast({
        title: "Erro no scanner",
        description: "Não foi possível iniciar o scanner QR",
        variant: "destructive",
      });
    }
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop().catch(console.error);
    }
  };

  const onScanSuccess = async (decodedText: string) => {
    console.log("QR Code detected:", decodedText);
    setScanning(false);
    
    // Stop scanner temporarily
    if (scannerRef.current) {
      await scannerRef.current.stop();
    }

    // Fetch data from Bitrix (simulated for now)
    const mockData: ModelData = {
      lead_id: decodedText,
      name: "Ana Silva",
      photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400",
      responsible: "João Producer",
    };

    setModelData(mockData);

    // Save to database
    await supabase.from("check_ins").insert({
      lead_id: decodedText,
      model_name: mockData.name,
      model_photo: mockData.photo,
      responsible: mockData.responsible,
    });

    // Auto-reset after 5 seconds
    setTimeout(async () => {
      setModelData(null);
      setScanning(true);
      await initScanner();
    }, 5000);
  };

  const onScanError = (err: any) => {
    // Ignore scan errors (they happen constantly while scanning)
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-studio-dark via-background to-studio-dark flex flex-col items-center justify-center p-8 portrait:orientation-portrait">
      {/* Logo */}
      <div className="absolute top-8 left-1/2 -translate-x-1/2 z-10">
        <h1 className="text-4xl font-bold bg-gradient-gold bg-clip-text text-transparent">
          MaxFama
        </h1>
      </div>

      {scanning && !modelData && (
        <div className="flex flex-col items-center space-y-8 animate-fade-in">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-gold blur-3xl opacity-20 animate-pulse-glow"></div>
            <QrCode className="w-32 h-32 text-gold animate-pulse relative z-10" />
          </div>
          
          <div id="qr-reader" className="w-full max-w-md"></div>
          
          <div className="text-center space-y-2">
            <p className="text-2xl font-light text-foreground">
              Bem-vindo à MaxFama
            </p>
            <p className="text-lg text-muted-foreground">
              Aproxime sua credencial para fazer check-in
            </p>
          </div>
        </div>
      )}

      {modelData && (
        <div className="flex flex-col items-center space-y-8 animate-scale-in">
          {/* Confetti Effect */}
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {[...Array(20)].map((_, i) => (
              <Sparkles
                key={i}
                className="absolute text-gold animate-fade-in"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 0.5}s`,
                }}
              />
            ))}
          </div>

          {/* Model Photo */}
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-gold blur-2xl opacity-40"></div>
            <img
              src={modelData.photo}
              alt={modelData.name}
              className="w-64 h-64 rounded-full object-cover border-4 border-gold shadow-glow relative z-10 animate-scale-in"
            />
          </div>

          {/* Welcome Message */}
          <div className="text-center space-y-4 z-10">
            <h2 className="text-5xl font-bold bg-gradient-gold bg-clip-text text-transparent">
              Seja bem-vinda,
            </h2>
            <p className="text-6xl font-bold text-foreground animate-shimmer">
              {modelData.name}!
            </p>
            <p className="text-xl text-muted-foreground mt-4">
              Check-in confirmado ✓
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
