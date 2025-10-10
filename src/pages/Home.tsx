import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Monitor, Camera, Video, Users, QrCode, Settings, Smartphone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Panel {
  id: string;
  name: string;
  slug: string;
  description: string;
  icon: string;
}

const iconMap: Record<string, any> = {
  UserCheck: Monitor,
  Camera: Camera,
  Video: Video,
  Users: Users,
  QrCode: QrCode,
};

export default function Home() {
  const [panels, setPanels] = useState<Panel[]>([]);
  const navigate = useNavigate();
  const { isAdmin } = useAuth();

  useEffect(() => {
    loadPanels();
  }, []);

  const loadPanels = async () => {
    const { data } = await supabase
      .from("panels")
      .select("*")
      .eq("is_active", true)
      .order("name");
    
    if (data) setPanels(data);
  };

  const handlePanelClick = (slug: string) => {
    if (slug === "check-in") {
      navigate("/checkin");
    } else {
      navigate(`/painel/${slug}`);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-studio-dark to-background p-8">
      <div className="max-w-7xl mx-auto">
        <div className="absolute top-8 right-8">
          {isAdmin && (
            <Button
              onClick={() => navigate("/admin/dashboard")}
              variant="outline"
              className="border-gold/20 hover:bg-gold/10"
            >
              <Settings className="mr-2 h-4 w-4" />
              Admin
            </Button>
          )}
        </div>

        <div className="text-center mb-12 animate-fade-in">
          <h1 className="text-6xl font-bold mb-4 bg-gradient-gold bg-clip-text text-transparent">
            MaxCheckin
          </h1>
          <p className="text-xl text-muted-foreground">
            Selecione o painel para esta tela
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Check-in Panel */}
          <Card
            onClick={() => navigate("/checkin")}
            className="group cursor-pointer p-8 hover:shadow-elegant hover:scale-105 transition-all duration-300 bg-card/50 backdrop-blur border-primary/20 hover:border-primary/50"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-6 rounded-full bg-gradient-gold group-hover:shadow-glow transition-all">
                <QrCode className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Check-in</h2>
              <p className="text-sm text-muted-foreground">
                Tela de boas-vindas com scanner QR
              </p>
            </div>
          </Card>

          {/* App Download Panel */}
          <Card
            onClick={() => navigate("/app-download")}
            className="group cursor-pointer p-8 hover:shadow-elegant hover:scale-105 transition-all duration-300 bg-card/50 backdrop-blur border-primary/20 hover:border-primary/50"
          >
            <div className="flex flex-col items-center text-center space-y-4">
              <div className="p-6 rounded-full bg-gradient-gold group-hover:shadow-glow transition-all">
                <Smartphone className="w-12 h-12 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Baixar App</h2>
              <p className="text-sm text-muted-foreground">
                Instalar aplicativo móvel
              </p>
            </div>
          </Card>

          {/* Dynamic Panels */}
          {panels.map((panel) => {
            const Icon = iconMap[panel.icon] || Monitor;
            
            return (
              <Card
                key={panel.id}
                onClick={() => handlePanelClick(panel.slug)}
                className="group cursor-pointer p-8 hover:shadow-elegant hover:scale-105 transition-all duration-300 bg-card/50 backdrop-blur border-primary/20 hover:border-primary/50"
              >
                <div className="flex flex-col items-center text-center space-y-4">
                  <div className="p-6 rounded-full bg-gradient-gold group-hover:shadow-glow transition-all">
                    <Icon className="w-12 h-12 text-white" />
                  </div>
                  <h2 className="text-2xl font-bold text-foreground">{panel.name}</h2>
                  <p className="text-sm text-muted-foreground">{panel.description}</p>
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
