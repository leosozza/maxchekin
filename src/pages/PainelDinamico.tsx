import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Clock, User, MapPin, Menu } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RenderCustomLayout } from "@/components/admin/RenderCustomLayout";
import { Button } from "@/components/ui/button";

interface Call {
  id: string;
  model_name: string;
  model_photo: string;
  room: string;
  called_at: string;
}

interface Panel {
  name: string;
  default_layout: string;
}

export default function PainelDinamico() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [panel, setPanel] = useState<Panel | null>(null);
  const [currentCall, setCurrentCall] = useState<Call | null>(null);
  const [recentCalls, setRecentCalls] = useState<Call[]>([]);
  const [layout, setLayout] = useState<string>("clean");
  const [customLayout, setCustomLayout] = useState<any>(null);

  useEffect(() => {
    if (slug) {
      loadPanel();
      subscribeToRealtime();
    }
  }, [slug]);

  const loadPanel = async () => {
    const { data: panelData } = await supabase
      .from("panels")
      .select("id, name, default_layout")
      .eq("slug", slug)
      .single();

    if (panelData) {
      setPanel(panelData);
      setLayout(panelData.default_layout || "clean");
      loadCalls(panelData.name);
      loadCustomLayout(panelData.id);
    }
  };

  const loadCustomLayout = async (panelId: string) => {
    const { data } = await supabase
      .from("panel_layouts")
      .select("*")
      .eq("panel_id", panelId)
      .maybeSingle();

    if (data) {
      setCustomLayout(data);
    }
  };

  const loadCalls = async (panelName: string) => {
    const { data } = await supabase
      .from("calls")
      .select("*")
      .order("called_at", { ascending: false })
      .limit(10);

    if (data && data.length > 0) {
      setCurrentCall(data[0]);
      setRecentCalls(data.slice(1, 6));
    }
  };

  const subscribeToRealtime = () => {
    const channel = supabase
      .channel(`calls-${slug}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "calls",
        },
        (payload) => {
          console.log("New call received:", payload);
          const newCall = payload.new as Call;
          setCurrentCall(newCall);
          setRecentCalls((prev) => [prev[0], ...prev.slice(0, 4)].filter(Boolean));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // If custom layout exists, render it instead of default
  if (customLayout && layout === "clean") {
    return (
      <RenderCustomLayout 
        config={{
          ...customLayout,
          elements: customLayout.elements as any
        }} 
        currentCall={currentCall} 
      />
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-studio-dark via-background to-studio-dark landscape:orientation-landscape">
      {/* Botão Menu */}
      <Button
        onClick={() => navigate("/")}
        variant="outline"
        size="icon"
        className="fixed top-4 left-4 z-50 border-gold/20 hover:bg-gold/10"
      >
        <Menu className="w-5 h-5 text-gold" />
      </Button>

      {/* Header */}
      <header className="flex items-center justify-between p-6 border-b border-primary/20 bg-card/30 backdrop-blur">
        <div className="flex items-center space-x-4">
          <h1 className="text-3xl font-bold bg-gradient-gold bg-clip-text text-transparent">
            {panel?.name || "Painel"}
          </h1>
        </div>

        <div className="flex items-center space-x-6">
          {/* Layout Selector */}
          <Select value={layout} onValueChange={setLayout}>
            <SelectTrigger className="w-32 bg-card/50">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="clean">Clean</SelectItem>
              <SelectItem value="video">Vídeo</SelectItem>
              <SelectItem value="gallery">Galeria</SelectItem>
              <SelectItem value="split">Split</SelectItem>
            </SelectContent>
          </Select>

          {/* Clock */}
          <div className="flex items-center space-x-2 text-lg text-foreground">
            <Clock className="w-5 h-5" />
            <span>{new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="p-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Current Call */}
          <div className="lg:col-span-2">
            <Card className="p-8 bg-card/50 backdrop-blur border-primary/20 min-h-[500px] flex flex-col items-center justify-center">
              {currentCall ? (
                <div className="flex flex-col items-center space-y-6 animate-scale-in">
                  <h2 className="text-2xl font-light text-muted-foreground mb-4">
                    Chamando Agora
                  </h2>
                  
                  {currentCall.model_photo && (
                    <img
                      src={currentCall.model_photo}
                      alt={currentCall.model_name}
                      className="w-48 h-48 rounded-full object-cover border-4 border-gold shadow-glow"
                    />
                  )}

                  <h3 className="text-6xl font-bold text-foreground animate-shimmer">
                    {currentCall.model_name}
                  </h3>

                  {currentCall.room && (
                    <div className="flex items-center space-x-2 text-2xl text-gold">
                      <MapPin className="w-6 h-6" />
                      <span>{currentCall.room}</span>
                    </div>
                  )}

                  <p className="text-xl text-muted-foreground">
                    Chamado às {formatTime(currentCall.called_at)}
                  </p>
                </div>
              ) : (
                <div className="text-center space-y-4">
                  <User className="w-24 h-24 mx-auto text-muted-foreground/20" />
                  <p className="text-2xl text-muted-foreground">
                    Aguardando chamadas...
                  </p>
                </div>
              )}
            </Card>
          </div>

          {/* Recent History */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-foreground mb-4">
              Histórico Recente
            </h3>
            
            {recentCalls.map((call, index) => (
              <Card
                key={call.id}
                className="p-4 bg-card/30 backdrop-blur border-primary/10 hover:border-primary/30 transition-all"
                style={{ opacity: 1 - index * 0.15 }}
              >
                <div className="flex items-center space-x-4">
                  {call.model_photo && (
                    <img
                      src={call.model_photo}
                      alt={call.model_name}
                      className="w-12 h-12 rounded-full object-cover border-2 border-gold/50"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-foreground truncate">
                      {call.model_name}
                    </p>
                    {call.room && (
                      <p className="text-sm text-muted-foreground truncate">
                        {call.room}
                      </p>
                    )}
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    {formatTime(call.called_at)}
                  </span>
                </div>
              </Card>
            ))}

            {recentCalls.length === 0 && (
              <p className="text-center text-muted-foreground py-8">
                Nenhum histórico ainda
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
