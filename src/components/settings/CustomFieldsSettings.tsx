import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { useCustomFields } from "@/hooks/useCustomFields";
import { CustomFieldForm } from "@/components/admin/CustomFieldForm";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import BitrixFieldDetector from "@/components/admin/BitrixFieldDetector";

export function CustomFieldsSettings() {
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
      list: "Lista",
    };
    return types[type] || type;
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditingField(null);
  };

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center min-h-[200px]">
          <p className="text-muted-foreground">Carregando campos...</p>
        </div>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Campos Customizados</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Gerencie os campos personalizados do check-in
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setDetectorOpen(true)}
                variant="outline"
                size="sm"
              >
                <Search className="w-4 h-4 mr-2" />
                Detectar Campos Bitrix
              </Button>
              <Button
                onClick={() => {
                  setEditingField(null);
                  setFormOpen(true);
                }}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Novo Campo
              </Button>
            </div>
          </div>
        </div>

        <CardContent className="p-6">
          {fields && fields.length > 0 ? (
            <div className="space-y-3">
              {fields.map((field) => (
                <div
                  key={field.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-medium">{field.field_label}</h4>
                      <Badge variant="outline">{getTypeLabel(field.field_type)}</Badge>
                      {field.show_in_checkin && <Badge variant="secondary">Check-in</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Chave: {field.field_key}
                      {field.bitrix_field_name && ` • Bitrix: ${field.bitrix_field_name}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(field)}
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(field.id, field.field_label)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-40" />
              <p>Nenhum campo customizado configurado</p>
              <p className="text-sm mt-2">Clique em "Novo Campo" para começar</p>
            </div>
          )}
        </CardContent>
      </Card>

      <CustomFieldForm
        open={formOpen}
        onOpenChange={setFormOpen}
        field={editingField}
        onSuccess={() => {
          refetch();
          handleFormClose();
        }}
      />

      <BitrixFieldDetector
        open={detectorOpen}
        onOpenChange={setDetectorOpen}
        onSuccess={() => {
          refetch();
          setDetectorOpen(false);
        }}
      />
    </>
  );
}
