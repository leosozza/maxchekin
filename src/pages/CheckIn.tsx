import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Scan, User, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";

const CheckIn = () => {
  const [scanning, setScanning] = useState(false);
  const [modelData, setModelData] = useState<any>(null);
  const navigate = useNavigate();

  // Simula leitura de QR Code
  const handleScan = () => {
    setScanning(true);
    
    // Simula delay de scanner
    setTimeout(() => {
      // Mock de dados do Bitrix24
      setModelData({
        id: "12345",
        name: "Ana Carolina Silva",
        responsible: "Produtor: Roberto Santos",
        photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=400&fit=crop",
        room: "Estúdio A"
      });
      setScanning(false);
    }, 1500);
  };

  const handleConfirm = () => {
    // Aqui faria chamada ao Bitrix24 para atualizar status
    console.log("Check-in confirmado para:", modelData.id);
    
    // Reseta após 3 segundos
    setTimeout(() => {
      setModelData(null);
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-gradient-studio flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(120,119,198,0.1),transparent_50%)]" />
      
      <div className="relative z-10 w-full max-w-2xl">
        {/* Logo */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-6xl font-bold bg-gradient-gold bg-clip-text text-transparent mb-2">
            MaxFama
          </h1>
          <p className="text-muted-foreground text-lg">Check-in System</p>
        </div>

        {!modelData ? (
          /* Scanner State */
          <Card className="bg-card/50 backdrop-blur-xl border-border/50 p-12 text-center animate-scale-in">
            <div className={`inline-flex items-center justify-center w-32 h-32 rounded-full mb-8 transition-all duration-500 ${
              scanning 
                ? 'bg-secondary/20 animate-pulse-glow' 
                : 'bg-muted/30'
            }`}>
              <Scan className={`w-16 h-16 ${scanning ? 'text-secondary' : 'text-muted-foreground'}`} />
            </div>
            
            <h2 className="text-3xl font-bold mb-4 text-foreground">
              {scanning ? 'Lendo credencial...' : 'Bem-vindo à MaxFama!'}
            </h2>
            
            <p className="text-muted-foreground mb-8 text-lg">
              {scanning ? 'Aguarde enquanto processamos sua credencial' : 'Aproxime sua credencial para realizar o check-in'}
            </p>
            
            <Button 
              size="lg"
              onClick={handleScan}
              disabled={scanning}
              className="bg-gradient-gold hover:shadow-gold text-primary-foreground px-12 py-6 text-lg font-semibold transition-all duration-300 hover:scale-105"
            >
              {scanning ? 'Escaneando...' : 'Escanear QR Code'}
            </Button>
          </Card>
        ) : (
          /* Welcome State */
          <Card className="bg-card/50 backdrop-blur-xl border-border/50 p-12 text-center animate-scale-in overflow-hidden relative">
            {/* Shimmer effect */}
            <div className="absolute inset-0 animate-shimmer" />
            
            <div className="relative z-10">
              <div className="mb-8">
                <div className="inline-flex items-center justify-center w-40 h-40 rounded-full bg-gradient-neon p-1 mb-6 animate-pulse-glow">
                  <img 
                    src={modelData.photo} 
                    alt={modelData.name}
                    className="w-full h-full rounded-full object-cover"
                  />
                </div>
                
                <CheckCircle className="w-16 h-16 text-secondary mx-auto mb-4 animate-scale-in" />
                
                <h2 className="text-4xl font-bold mb-2 bg-gradient-gold bg-clip-text text-transparent">
                  Seja bem-vinda,
                </h2>
                <h3 className="text-5xl font-bold text-foreground mb-4">
                  {modelData.name}!
                </h3>
                
                <div className="flex items-center justify-center gap-4 text-muted-foreground mb-6">
                  <div className="flex items-center gap-2">
                    <User className="w-5 h-5" />
                    <span>{modelData.responsible}</span>
                  </div>
                  <span className="text-border">•</span>
                  <span>{modelData.room}</span>
                </div>
              </div>
              
              <Button 
                size="lg"
                onClick={handleConfirm}
                className="bg-gradient-gold hover:shadow-gold text-primary-foreground px-16 py-6 text-lg font-semibold transition-all duration-300 hover:scale-105"
              >
                Confirmar Presença
              </Button>
            </div>
          </Card>
        )}

        {/* Footer Navigation */}
        <div className="text-center mt-8">
          <Button 
            variant="ghost" 
            onClick={() => navigate('/painel')}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            Ir para Painel de Recepção →
          </Button>
        </div>
      </div>
    </div>
  );
};

export default CheckIn;
