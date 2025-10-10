import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

export default function CheckInSettings() {
  const [welcomeMessage, setWelcomeMessage] = useState("");
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
      setWelcomeMessage(data.welcome_message);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    
    const { data: existing } = await supabase
      .from("check_in_config")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (existing) {
      await supabase
        .from("check_in_config")
        .update({ welcome_message: welcomeMessage })
        .eq("id", existing.id);
    }

    toast({
      title: "Configuração salva!",
      description: "Mensagem de boas-vindas atualizada com sucesso.",
    });

    setLoading(false);
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Configurações do Check-in</h1>

      <Card className="p-6 max-w-2xl">
        <div className="space-y-4">
          <div>
            <Label htmlFor="welcome">Mensagem de Boas-Vindas</Label>
            <Input
              id="welcome"
              value={welcomeMessage}
              onChange={(e) => setWelcomeMessage(e.target.value)}
              placeholder="Seja bem-vinda"
              className="mt-2"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Esta mensagem aparecerá na tela de confirmação do check-in
            </p>
          </div>

          <Button onClick={handleSave} disabled={loading}>
            {loading ? "Salvando..." : "Salvar Configurações"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
