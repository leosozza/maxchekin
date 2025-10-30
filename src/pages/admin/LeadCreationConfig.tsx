import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import { Loader2, Save } from "lucide-react";

interface LeadField {
  id: string;
  field_name: string;
  field_value: string | null;
  field_type: string;
  description: string | null;
  is_active: boolean;
}

export default function LeadCreationConfig() {
  const [fields, setFields] = useState<LeadField[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    loadFields();
  }, []);

  const loadFields = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from("lead_creation_config")
        .select("*")
        .order("field_name");

      if (error) throw error;
      setFields(data || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar campos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (id: string, value: string) => {
    setFields(fields.map(f => f.id === id ? { ...f, field_value: value } : f));
  };

  const handleToggleActive = (id: string) => {
    setFields(fields.map(f => f.id === id ? { ...f, is_active: !f.is_active } : f));
  };

  const handleSave = async () => {
    try {
      setSaving(true);

      // Update all fields
      for (const field of fields) {
        const { error } = await supabase
          .from("lead_creation_config")
          .update({
            field_value: field.field_value,
            is_active: field.is_active,
          })
          .eq("id", field.id);

        if (error) throw error;
      }

      toast({
        title: "Configurações salvas!",
        description: "Os campos de criação de leads foram atualizados com sucesso.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/admin/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Configuração de Criação de Leads</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-3xl font-bold text-gold mb-2">Configuração de Criação de Leads</h1>
        <p className="text-white/60">
          Configure valores padrão para campos do Bitrix24 ao criar novos leads
        </p>
      </div>

      <Card className="border-gold/20 bg-black/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-gold">Campos Padrão do Bitrix24</CardTitle>
          <CardDescription className="text-white/60">
            Defina valores que serão preenchidos automaticamente ao criar novos leads
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {fields.map((field) => (
            <div key={field.id} className="space-y-3 p-4 rounded-lg bg-background/20 border border-gold/10">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label className="text-gold font-mono text-sm">{field.field_name}</Label>
                  <p className="text-xs text-white/60 mt-1">{field.description}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Label className="text-sm text-white/60">Ativo</Label>
                  <Switch
                    checked={field.is_active}
                    onCheckedChange={() => handleToggleActive(field.id)}
                  />
                </div>
              </div>
              <Input
                value={field.field_value || ""}
                onChange={(e) => handleFieldChange(field.id, e.target.value)}
                placeholder="Digite o valor padrão"
                disabled={!field.is_active}
                className="bg-background/50 border-gold/20"
              />
            </div>
          ))}

          <Button
            onClick={handleSave}
            disabled={saving}
            className="bg-gold hover:bg-gold/90 text-black w-full sm:w-auto"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Salvar Configurações
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <Card className="border-blue-500/20 bg-blue-500/5 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-blue-400 text-lg">💡 Como usar esta configuração</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-white/70">
          <p>
            <strong className="text-white/90">Campos Especiais:</strong>
          </p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>SOURCE_ID:</strong> Campo Fonte - ID da origem do lead (padrão: CALL)</li>
            <li><strong>PARENT_ID_1120:</strong> Projetos Comerciais - ID do projeto pai (padrão: 4)</li>
            <li><strong>UF_CRM_1741215746:</strong> Campo customizado relacionado ao projeto (padrão: 4)</li>
            <li><strong>UF_CRM_1744900570916:</strong> Campo para Nome - será preenchido com o nome do lead</li>
            <li><strong>UF_CRM_LEAD_1732627097745:</strong> Campo para Nome do Modelo - será preenchido com o nome do modelo</li>
            <li><strong>UF_CRM_1739563541:</strong> Campo Modelo Nome - será preenchido com o nome do modelo</li>
            <li><strong>UF_CRM_1740000000:</strong> Campo Idade - será preenchido com a idade do lead</li>
          </ul>
          <p className="pt-2 border-t border-white/10">
            <strong className="text-blue-300">Nota:</strong> Os campos UF_CRM_1744900570916, UF_CRM_LEAD_1732627097745, 
            UF_CRM_1739563541 e UF_CRM_1740000000 serão automaticamente preenchidos com os valores fornecidos no formulário 
            de criação de lead. Os campos SOURCE_ID, PARENT_ID_1120 e UF_CRM_1741215746 têm valores padrão que podem ser 
            configurados aqui.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
