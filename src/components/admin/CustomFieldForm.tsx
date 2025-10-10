import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useBitrixFields } from "@/hooks/useBitrixFields";
import { Loader2 } from "lucide-react";

interface CustomFieldFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
  field?: {
    id: string;
    field_key: string;
    field_label: string;
    field_type: string;
    bitrix_field_name: string | null;
    show_in_checkin: boolean;
    show_in_panels: boolean;
  } | null;
}

export function CustomFieldForm({ open, onOpenChange, onSuccess, field }: CustomFieldFormProps) {
  const { toast } = useToast();
  const { data: bitrixFields, isLoading: loadingBitrix } = useBitrixFields();

  const [fieldKey, setFieldKey] = useState(field?.field_key || "");
  const [fieldLabel, setFieldLabel] = useState(field?.field_label || "");
  const [fieldType, setFieldType] = useState(field?.field_type || "text");
  const [bitrixField, setBitrixField] = useState(field?.bitrix_field_name || "");
  const [customBitrixField, setCustomBitrixField] = useState("");
  const [showInCheckin, setShowInCheckin] = useState(field?.show_in_checkin ?? true);
  const [showInPanels, setShowInPanels] = useState(field?.show_in_panels ?? true);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    if (!fieldKey || !fieldLabel || !fieldType) {
      toast({
        title: "Campos obrigatórios",
        description: "Preencha todos os campos obrigatórios",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    const finalBitrixField = bitrixField === "custom" ? customBitrixField : bitrixField;

    const fieldData = {
      field_key: fieldKey.toLowerCase().replace(/\s+/g, '_'),
      field_label: fieldLabel,
      field_type: fieldType,
      bitrix_field_name: finalBitrixField || null,
      show_in_checkin: showInCheckin,
      show_in_panels: showInPanels,
    };

    let error;
    if (field) {
      const result = await supabase
        .from("custom_fields")
        .update(fieldData)
        .eq("id", field.id);
      error = result.error;
    } else {
      const result = await supabase
        .from("custom_fields")
        .insert(fieldData);
      error = result.error;
    }

    setIsSaving(false);

    if (error) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: field ? "Campo atualizado!" : "Campo criado!",
      description: `O campo "${fieldLabel}" foi ${field ? 'atualizado' : 'criado'} com sucesso`,
    });

    onSuccess();
    onOpenChange(false);
    
    // Reset form
    setFieldKey("");
    setFieldLabel("");
    setFieldType("text");
    setBitrixField("");
    setCustomBitrixField("");
    setShowInCheckin(true);
    setShowInPanels(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-studio-dark border-gold/20">
        <DialogHeader>
          <DialogTitle className="text-gold">
            {field ? "Editar Campo" : "Novo Campo Customizado"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white/80">Chave do Campo *</Label>
            <Input
              value={fieldKey}
              onChange={(e) => setFieldKey(e.target.value)}
              placeholder="Ex: idade, altura, experiencia"
              className="bg-black/20 border-gold/20 text-white"
              disabled={!!field}
            />
            <p className="text-xs text-white/40">
              Identificador único (sem espaços, letras minúsculas)
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-white/80">Nome do Campo *</Label>
            <Input
              value={fieldLabel}
              onChange={(e) => setFieldLabel(e.target.value)}
              placeholder="Ex: Idade, Altura, Experiência"
              className="bg-black/20 border-gold/20 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white/80">Tipo de Dados *</Label>
            <Select value={fieldType} onValueChange={setFieldType}>
              <SelectTrigger className="bg-black/20 border-gold/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-studio-dark border-gold/20">
                <SelectItem value="text">Texto</SelectItem>
                <SelectItem value="number">Número</SelectItem>
                <SelectItem value="date">Data</SelectItem>
                <SelectItem value="image">Imagem</SelectItem>
                <SelectItem value="boolean">Sim/Não</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-white/80">Campo do Bitrix24</Label>
            {loadingBitrix ? (
              <div className="flex items-center gap-2 text-white/60">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Carregando campos...</span>
              </div>
            ) : (
              <>
                <Select value={bitrixField} onValueChange={setBitrixField}>
                  <SelectTrigger className="bg-black/20 border-gold/20 text-white">
                    <SelectValue placeholder="Selecione um campo" />
                  </SelectTrigger>
                  <SelectContent className="bg-studio-dark border-gold/20 max-h-[300px]">
                    <SelectItem value="custom">✏️ Campo Customizado</SelectItem>
                    {bitrixFields?.map((field) => (
                      <SelectItem key={field.name} value={field.name}>
                        {field.title} ({field.name})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {bitrixField === "custom" && (
                  <Input
                    value={customBitrixField}
                    onChange={(e) => setCustomBitrixField(e.target.value)}
                    placeholder="Ex: UF_CRM_CUSTOM_FIELD"
                    className="bg-black/20 border-gold/20 text-white mt-2"
                  />
                )}
              </>
            )}
          </div>

          <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-gold/10">
            <div className="space-y-0.5">
              <Label className="text-white/80">Exibir no Check-in</Label>
              <p className="text-xs text-white/40">Mostrar na tela de boas-vindas</p>
            </div>
            <Switch checked={showInCheckin} onCheckedChange={setShowInCheckin} />
          </div>

          <div className="flex items-center justify-between p-4 bg-black/20 rounded-lg border border-gold/10">
            <div className="space-y-0.5">
              <Label className="text-white/80">Exibir nos Painéis</Label>
              <p className="text-xs text-white/40">Mostrar nos painéis de fila</p>
            </div>
            <Switch checked={showInPanels} onCheckedChange={setShowInPanels} />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-gold/20"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-gold text-black hover:bg-gold/90"
          >
            {isSaving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {field ? "Atualizar" : "Criar Campo"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
