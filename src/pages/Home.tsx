import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useUserPermissions, hasPermission } from "@/hooks/useUserPermissions";
import { Monitor, Camera, Video, Users, QrCode, Settings, LogOut, ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AuthGuard } from "@/components/admin/AuthGuard";

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
  const { user, isAdmin, signOut } = useAuth();
  const { data: permissions, isLoading: permissionsLoading } = useUserPermissions(user?.id);

  useEffect(() => {
    if (!user) {
      navigate('/admin/login');
      return;
    }
    loadPanels();
  }, [user, navigate]);

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

  const canAccessCheckin = isAdmin || hasPermission(permissions, 'checkin');
  const canAccessPanel = (panelId: string) => isAdmin || hasPermission(permissions, 'panel', panelId);

  if (permissionsLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-studio-dark to-background flex items-center justify-center">
        <div className="text-gold">Carregando...</div>
      </div>
    );
  }

  return (
    <AuthGuard requireRole="admin">
      <div className="min-h-screen bg-gradient-to-br from-background via-studio-dark to-background p-4 md:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="absolute top-4 md:top-8 left-4 md:left-8">
            <Button
              onClick={() => navigate("/checkin")}
              variant="ghost"
              size="icon"
              className="hover:bg-gold/10"
              title="Voltar para Check-in"
            >
              <ArrowLeft className="w-5 h-5 text-gold" />
            </Button>
          </div>

          <div className="absolute top-4 md:top-8 right-4 md:right-8 flex gap-2">
        <Button
          onClick={() => navigate("/dashboard")}
          variant="outline"
          className="border-gold/20 hover:bg-gold/10"
          size="sm"
        >
              <Settings className="md:mr-2 h-4 w-4" />
              <span className="hidden md:inline">Admin</span>
            </Button>
            <Button
              onClick={signOut}
              variant="outline"
              className="border-gold/20 hover:bg-gold/10"
              size="sm"
            >
              <LogOut className="md:mr-2 h-4 w-4" />
              <span className="hidden md:inline">Sair</span>
            </Button>
          </div>

          <div className="text-center mb-8 md:mb-12 animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-bold mb-4 bg-gradient-gold bg-clip-text text-transparent">
              Seleção de Painéis
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground">
              Escolha qual painel você deseja visualizar
            </p>
          </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {/* Check-in Panel */}
          {canAccessCheckin && (
            <Card
              onClick={() => navigate("/checkin")}
              className="group cursor-pointer p-6 md:p-8 hover:shadow-elegant hover:scale-105 transition-all duration-300 bg-card/50 backdrop-blur border-primary/20 hover:border-primary/50"
            >
              <div className="flex flex-col items-center text-center space-y-3 md:space-y-4">
                <div className="p-4 md:p-6 rounded-full bg-gradient-gold group-hover:shadow-glow transition-all">
                  <QrCode className="w-8 h-8 md:w-12 md:h-12 text-white" />
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-foreground">Check-in</h2>
                <p className="text-xs md:text-sm text-muted-foreground">
                  Tela de boas-vindas com scanner QR
                </p>
              </div>
            </Card>
          )}

          {/* Dynamic Panels - Only shown if panels exist AND are explicitly enabled */}
          {isAdmin && panels.length > 0 && panels
            .filter(panel => canAccessPanel(panel.id))
            .map((panel) => {
              const Icon = iconMap[panel.icon] || Monitor;
              
              return (
                <Card
                  key={panel.id}
                  onClick={() => handlePanelClick(panel.slug)}
                  className="group cursor-pointer p-6 md:p-8 hover:shadow-elegant hover:scale-105 transition-all duration-300 bg-card/50 backdrop-blur border-primary/20 hover:border-primary/50"
                >
                  <div className="flex flex-col items-center text-center space-y-3 md:space-y-4">
                    <div className="p-4 md:p-6 rounded-full bg-gradient-gold group-hover:shadow-glow transition-all">
                      <Icon className="w-8 h-8 md:w-12 md:h-12 text-white" />
                    </div>
                    <h2 className="text-xl md:text-2xl font-bold text-foreground">{panel.name}</h2>
                    <p className="text-xs md:text-sm text-muted-foreground">{panel.description}</p>
                  </div>
                </Card>
              );
            })}
        </div>
        </div>
      </div>
    </AuthGuard>
  );
}
