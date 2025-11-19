import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";

export function CheckInSettings() {
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
        description: "Configurações do check-in atualizadas com sucesso.",
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
    <Card className="p-6">
      <div className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">Tela de Boas-Vindas</h3>
          <p className="text-sm text-muted-foreground mb-6">
            Personalize a tela de confirmação que aparece após o check-in
          </p>
        </div>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="welcome">Mensagem de Boas-Vindas</Label>
            <Input
              id="welcome"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Seja bem-vinda"
            />
            <p className="text-xs text-muted-foreground">
              Esta mensagem será exibida na tela de confirmação do check-in
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duração da Exibição (segundos)</Label>
            <Input
              id="duration"
              type="number"
              min="1"
              max="30"
              value={displayDuration}
              onChange={(e) => setDisplayDuration(parseInt(e.target.value))}
            />
            <p className="text-xs text-muted-foreground">
              Por quanto tempo a tela de confirmação ficará visível
            </p>
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="show-responsible">Mostrar Responsável</Label>
              <p className="text-xs text-muted-foreground">
                Exibir o nome do responsável na tela de confirmação
              </p>
            </div>
            <Switch
              id="show-responsible"
              checked={showResponsible}
              onCheckedChange={setShowResponsible}
            />
          </div>

          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="show-lead-id">Mostrar ID do Lead</Label>
              <p className="text-xs text-muted-foreground">
                Exibir o ID do lead Bitrix24 na tela de confirmação
              </p>
            </div>
            <Switch
              id="show-lead-id"
              checked={showLeadId}
              onCheckedChange={setShowLeadId}
            />
          </div>
        </div>

        <Button onClick={handleSave} disabled={loading} className="w-full">
          {loading ? "Salvando..." : "Salvar Configurações"}
        </Button>
      </div>
    </Card>
  );
}
