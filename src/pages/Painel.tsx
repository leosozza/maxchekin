import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Clock, MapPin, ArrowRight } from "lucide-react";

interface Model {
  id: string;
  name: string;
  responsible: string;
  room: string;
  photo: string;
  checkinTime: string;
}

const Painel = () => {
  const [currentModel, setCurrentModel] = useState<Model | null>(null);
  const [recentModels, setRecentModels] = useState<Model[]>([]);

  // Simula recebimento de novos check-ins via WebSocket
  useEffect(() => {
    // Mock de dados - em produção viria do WebSocket/Bitrix
    const mockModels: Model[] = [
      {
        id: "001",
        name: "Ana Carolina Silva",
        responsible: "Roberto Santos",
        room: "Estúdio A",
        photo: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=200&h=200&fit=crop",
        checkinTime: "14:30"
      },
      {
        id: "002",
        name: "Mariana Oliveira",
        responsible: "Carlos Mendes",
        room: "Estúdio B",
        photo: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&h=200&fit=crop",
        checkinTime: "14:28"
      },
      {
        id: "003",
        name: "Beatriz Costa",
        responsible: "Ana Paula",
        room: "Estúdio A",
        photo: "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=200&h=200&fit=crop",
        checkinTime: "14:25"
      }
    ];

    setCurrentModel(mockModels[0]);
    setRecentModels(mockModels.slice(1));

    // Simula atualização a cada 10 segundos
    const interval = setInterval(() => {
      // Rotaciona os modelos para simular novos check-ins
      setRecentModels(prev => {
        const newRecent = currentModel ? [currentModel, ...prev.slice(0, 4)] : prev;
        return newRecent;
      });
      
      // Define um novo modelo atual (em produção viria do WebSocket)
      const randomModel: Model = {
        id: Math.random().toString(),
        name: ["Sofia Martins", "Gabriela Lima", "Isabella Rodrigues"][Math.floor(Math.random() * 3)],
        responsible: ["Roberto Santos", "Carlos Mendes", "Ana Paula"][Math.floor(Math.random() * 3)],
        room: ["Estúdio A", "Estúdio B", "Sala VIP"][Math.floor(Math.random() * 3)],
        photo: [
          "https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=200&h=200&fit=crop",
          "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=200&h=200&fit=crop",
          "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=200&h=200&fit=crop"
        ][Math.floor(Math.random() * 3)],
        checkinTime: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
      };
      
      setCurrentModel(randomModel);
    }, 10000);

    return () => clearInterval(interval);
  }, [currentModel]);

  return (
    <div className="min-h-screen bg-gradient-studio p-6">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(120,119,198,0.08),transparent_50%)]" />
      
      <div className="relative z-10 max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-5xl font-bold bg-gradient-gold bg-clip-text text-transparent mb-2">
            MaxFama
          </h1>
          <p className="text-muted-foreground text-lg">Painel de Recepção</p>
          <div className="flex items-center justify-center gap-2 mt-4">
            <div className="w-2 h-2 rounded-full bg-secondary animate-pulse" />
            <span className="text-sm text-muted-foreground">Ao vivo</span>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6">
          {/* Main Panel - Chamada Atual */}
          <div className="lg:col-span-2">
            <Card className="bg-card/50 backdrop-blur-xl border-border/50 p-8 animate-scale-in">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-3 h-3 rounded-full bg-secondary animate-pulse" />
                <h2 className="text-xl font-semibold text-foreground">Chamando Agora</h2>
              </div>

              {currentModel ? (
                <div className="flex items-center gap-8 animate-slide-in">
                  {/* Photo */}
                  <div className="relative">
                    <div className="w-40 h-40 rounded-2xl bg-gradient-neon p-1 animate-pulse-glow">
                      <img 
                        src={currentModel.photo} 
                        alt={currentModel.name}
                        className="w-full h-full rounded-2xl object-cover"
                      />
                    </div>
                    <Badge className="absolute -top-2 -right-2 bg-secondary text-secondary-foreground shadow-neon">
                      #{currentModel.id}
                    </Badge>
                  </div>

                  {/* Info */}
                  <div className="flex-1">
                    <h3 className="text-5xl font-bold text-foreground mb-4">
                      {currentModel.name}
                    </h3>
                    
                    <div className="space-y-3">
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <User className="w-5 h-5 text-primary" />
                        <span className="text-lg">{currentModel.responsible}</span>
                      </div>
                      
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <MapPin className="w-5 h-5 text-accent" />
                        <span className="text-lg font-semibold text-accent">{currentModel.room}</span>
                      </div>
                      
                      <div className="flex items-center gap-3 text-muted-foreground">
                        <Clock className="w-5 h-5 text-primary" />
                        <span className="text-lg">Check-in: {currentModel.checkinTime}</span>
                      </div>
                    </div>
                  </div>

                  <ArrowRight className="w-12 h-12 text-primary animate-pulse" />
                </div>
              ) : (
                <div className="text-center py-16 text-muted-foreground">
                  <p className="text-xl">Aguardando próximo check-in...</p>
                </div>
              )}
            </Card>
          </div>

          {/* Sidebar - Histórico Recente */}
          <div className="lg:col-span-1">
            <Card className="bg-card/50 backdrop-blur-xl border-border/50 p-6 animate-scale-in">
              <h3 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-primary" />
                Histórico Recente
              </h3>

              <div className="space-y-4">
                {recentModels.length > 0 ? (
                  recentModels.map((model, index) => (
                    <div 
                      key={model.id}
                      className="flex items-center gap-4 p-3 rounded-lg bg-muted/20 border border-border/30 hover:border-primary/30 transition-all duration-300 animate-fade-in"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <img 
                        src={model.photo} 
                        alt={model.name}
                        className="w-12 h-12 rounded-lg object-cover"
                      />
                      
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {model.name}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {model.room}
                        </p>
                      </div>
                      
                      <span className="text-xs text-muted-foreground">
                        {model.checkinTime}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-muted-foreground text-sm py-8">
                    Nenhum histórico ainda
                  </p>
                )}
              </div>
            </Card>

            {/* Stats Card */}
            <Card className="bg-card/50 backdrop-blur-xl border-border/50 p-6 mt-6 animate-scale-in">
              <h3 className="text-lg font-semibold text-foreground mb-4">
                Estatísticas do Dia
              </h3>
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Check-ins Hoje</span>
                  <span className="text-2xl font-bold text-primary">28</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Em Atendimento</span>
                  <span className="text-2xl font-bold text-secondary">5</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Tempo Médio</span>
                  <span className="text-2xl font-bold text-accent">12min</span>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Painel;
