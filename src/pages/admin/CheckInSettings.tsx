import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";

export default function CheckInSettings() {
  const [welcomeMessage, setWelcomeMessage] = useState("");
  const [displayDuration, setDisplayDuration] = useState(5);
  const [showResponsible, setShowResponsible] = useState(true);
  const [showLeadId, setShowLeadId] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    const { data } = await supabase
      .from("check_in_config")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (data) {
      setWelcomeMessage(data.welcome_message || "Seja bem-vinda");
      setDisplayDuration(data.display_duration_seconds || 5);
      setShowResponsible(data.show_responsible !== false);
      setShowLeadId(data.show_lead_id === true);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    
    try {
      const { data: existing } = await supabase
        .from("check_in_config")
        .select("id")
        .limit(1)
        .maybeSingle();

      const updateData = {
        welcome_message: welcomeMessage,
        display_duration_seconds: displayDuration,
        show_responsible: showResponsible,
        show_lead_id: showLeadId,
      };

      if (existing) {
        const { error } = await supabase
          .from("check_in_config")
          .update(updateData)
          .eq("id", existing.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("check_in_config")
          .insert(updateData);

        if (error) throw error;
      }

      toast({
        title: "Configuração salva!",
        description: "Configurações da tela de boas-vindas atualizadas com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Configurações do Check-in</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-3xl font-bold text-gold mb-2">Configurações da Tela de Boas-Vindas</h1>
        <p className="text-white/60">
          Personalize a tela de confirmação que aparece após o check-in
        </p>
      </div>

      <Card className="p-6 max-w-2xl border-gold/20 bg-black/40 backdrop-blur-sm">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="welcome" className="text-gold">Mensagem de Boas-Vindas</Label>
            <Input
              id="welcome"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Seja bem-vinda"
              className="bg-background/50 border-gold/20"
            />
            <p className="text-sm text-white/60">
              Esta mensagem aparecerá na tela de confirmação do check-in
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration" className="text-gold">Duração da Exibição (segundos)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              max="60"
              value={displayDuration}
              onChange={(e) => setDisplayDuration(parseInt(e.target.value) || 5)}
              className="bg-background/50 border-gold/20"
            />
            <p className="text-sm text-white/60">
              Tempo que a tela de boas-vindas ficará visível (entre 1 e 60 segundos)
            </p>
          </div>

          <div className="space-y-4 border-t border-gold/20 pt-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-responsible" className="text-gold">Mostrar Responsável</Label>
                <p className="text-sm text-white/60">
                  Exibir o nome do responsável pelo lead na tela de boas-vindas
                </p>
              </div>
              <Switch
                id="show-responsible"
                checked={showResponsible}
                onCheckedChange={setShowResponsible}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="show-lead-id" className="text-gold">Mostrar ID do Lead</Label>
                <p className="text-sm text-white/60">
                  Exibir o ID do lead na tela de boas-vindas
                </p>
              </div>
              <Switch
                id="show-lead-id"
                checked={showLeadId}
                onCheckedChange={setShowLeadId}
              />
            </div>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={loading}
            className="bg-gold hover:bg-gold/90 text-black"
          >
            {loading ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </Card>

      <Card className="p-6 max-w-2xl border-blue-500/20 bg-blue-500/5 backdrop-blur-sm">
        <div className="space-y-3">
          <h3 className="text-lg font-semibold text-blue-400">💡 Sobre a Tela de Boas-Vindas</h3>
          <p className="text-sm text-white/70">
            A tela de boas-vindas é exibida automaticamente após a confirmação do check-in. 
            Ela mostra uma mensagem personalizada com o nome da modelo, foto e informações adicionais.
          </p>
          <p className="text-sm text-white/70">
            Após o tempo configurado, o sistema retorna automaticamente para a tela de scanner, 
            pronto para o próximo check-in.
          </p>
        </div>
      </Card>
    </div>
  );
}
