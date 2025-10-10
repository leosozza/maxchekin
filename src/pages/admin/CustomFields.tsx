import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus, Pencil, Trash2, Search } from "lucide-react";
import { useCustomFields } from "@/hooks/useCustomFields";
import { CustomFieldForm } from "@/components/admin/CustomFieldForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import BitrixFieldDetector from "@/components/admin/BitrixFieldDetector";

export default function CustomFields() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: fields, isLoading, refetch } = useCustomFields();
  
  const [formOpen, setFormOpen] = useState(false);
  const [detectorOpen, setDetectorOpen] = useState(false);
  const [editingField, setEditingField] = useState<any>(null);

  const handleEdit = (field: any) => {
    setEditingField(field);
    setFormOpen(true);
  };

  const handleDelete = async (id: string, label: string) => {
    if (!confirm(`Deseja realmente desativar o campo "${label}"?`)) return;

    const { error } = await supabase
      .from("custom_fields")
      .update({ is_active: false })
      .eq("id", id);

    if (error) {
      toast({
        title: "Erro ao desativar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Campo desativado!",
      description: `O campo "${label}" foi desativado com sucesso`,
    });

    refetch();
  };

  const getTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      text: "Texto",
      number: "Número",
      date: "Data",
      image: "Imagem",
      boolean: "Sim/Não",
    };
    return types[type] || type;
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingField(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-white/60">Carregando campos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin/dashboard")}
              className="text-gold hover:text-gold/80"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-3xl font-bold text-white">Campos Customizados</h1>
          </div>
          <p className="text-white/60">
            Gerencie os campos que aparecem no check-in e nos painéis de fila
          </p>
        </div>

        <div className="flex gap-2">
          <Button
            onClick={() => setDetectorOpen(true)}
            variant="outline"
            className="border-gold/20 text-gold hover:bg-gold/10"
          >
            <Search className="w-4 h-4 mr-2" />
            Detectar Campos Bitrix
          </Button>
          <Button
            onClick={() => {
              setEditingField(null);
              setFormOpen(true);
            }}
            className="bg-gold text-black hover:bg-gold/90"
          >
            <Plus className="w-4 h-4 mr-2" />
            Novo Campo
          </Button>
        </div>
      </div>

      <Card className="bg-studio-dark border-gold/20">
        <CardHeader>
          <CardTitle className="text-white">Campos Ativos</CardTitle>
          <CardDescription className="text-white/60">
            {fields?.length || 0} campo(s) configurado(s)
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!fields || fields.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-white/60 mb-4">Nenhum campo configurado ainda</p>
              <Button
                onClick={() => setFormOpen(true)}
                className="bg-gold text-black hover:bg-gold/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Criar Primeiro Campo
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-4 px-4 py-2 text-sm font-semibold text-gold border-b border-gold/20">
                <div className="col-span-3">Campo</div>
                <div className="col-span-2">Tipo</div>
                <div className="col-span-3">Bitrix</div>
                <div className="col-span-2">Visibilidade</div>
                <div className="col-span-2 text-right">Ações</div>
              </div>

              {fields.map((field) => (
                <div
                  key={field.id}
                  className="grid grid-cols-12 gap-4 px-4 py-3 rounded-lg bg-black/20 border border-gold/10 hover:border-gold/20 transition-colors items-center"
                >
                  <div className="col-span-3">
                    <p className="text-white font-medium">{field.field_label}</p>
                    <p className="text-xs text-white/40">{field.field_key}</p>
                  </div>

                  <div className="col-span-2">
                    <Badge variant="outline" className="border-gold/20 text-gold">
                      {getTypeLabel(field.field_type)}
                    </Badge>
                  </div>

                  <div className="col-span-3">
                    <p className="text-sm text-white/70">
                      {field.bitrix_field_name || <span className="text-white/40">Não mapeado</span>}
                    </p>
                  </div>

                  <div className="col-span-2 flex gap-1">
                    {field.show_in_checkin && (
                      <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                        Check-in
                      </Badge>
                    )}
                    {field.show_in_panels && (
                      <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                        Painéis
                      </Badge>
                    )}
                  </div>

                  <div className="col-span-2 flex justify-end gap-2">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleEdit(field)}
                      className="text-gold hover:text-gold/80 hover:bg-gold/10"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => handleDelete(field.id, field.field_label)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <CustomFieldForm
        open={formOpen}
        onOpenChange={handleFormClose}
        onSuccess={refetch}
        field={editingField}
      />

      <BitrixFieldDetector
        open={detectorOpen}
        onOpenChange={setDetectorOpen}
        onSuccess={refetch}
      />
    </div>
  );
}
