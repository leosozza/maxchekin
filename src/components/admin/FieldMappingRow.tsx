import { useState } from "react";
import { Pencil, Trash2, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface FieldMappingRowProps {
  mapping: {
    id: string;
    maxcheckin_field_name: string;
    bitrix_field_name: string;
    field_type: string;
  };
  bitrixFields: Array<{ name: string; title: string; type: string }>;
  onUpdate: () => void;
}

export default function FieldMappingRow({
  mapping,
  bitrixFields,
  onUpdate,
}: FieldMappingRowProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [bitrixField, setBitrixField] = useState(mapping.bitrix_field_name);
  const [customField, setCustomField] = useState("");
  const { toast } = useToast();

  const maxCheckinFieldLabels: Record<string, string> = {
    model_name: "Nome do Modelo",
    model_photo: "Foto do Modelo",
    responsible: "Responsável",
    room: "Sala/Estúdio",
    lead_id: "ID do Lead",
    presenca_confirmada: "Presença Confirmada",
  };

  const handleSave = async () => {
    const finalBitrixField = customField || bitrixField;

    if (!finalBitrixField) {
      toast({
        title: "Erro",
        description: "Selecione um campo do Bitrix",
        variant: "destructive",
      });
      return;
    }

    const { error } = await supabase
      .from("field_mapping")
      .update({ bitrix_field_name: finalBitrixField })
      .eq("id", mapping.id);

    if (error) {
      toast({
        title: "Erro ao salvar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Salvo!",
      description: "Mapeamento atualizado com sucesso",
    });

    setIsEditing(false);
    onUpdate();
  };

  const handleDelete = async () => {
    const { error } = await supabase
      .from("field_mapping")
      .update({ is_active: false })
      .eq("id", mapping.id);

    if (error) {
      toast({
        title: "Erro ao desativar",
        description: error.message,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Desativado!",
      description: "Mapeamento desativado",
    });

    onUpdate();
  };

  if (isEditing) {
    return (
      <div className="grid grid-cols-[2fr_auto_2fr_auto] gap-4 items-center p-4 bg-black/20 rounded-lg border border-gold/20">
        <div className="text-white/80">
          {maxCheckinFieldLabels[mapping.maxcheckin_field_name] ||
            mapping.maxcheckin_field_name}
        </div>

        <div className="text-gold text-xl">⬅️</div>

        <div className="space-y-2">
          <Select value={bitrixField} onValueChange={setBitrixField}>
            <SelectTrigger className="bg-black/40 border-gold/20 text-white">
              <SelectValue placeholder="Selecione um campo" />
            </SelectTrigger>
            <SelectContent>
              {bitrixFields.map((field) => (
                <SelectItem key={field.name} value={field.name}>
                  {field.title} ({field.name})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            placeholder="Ou digite campo customizado (ex: UF_CRM_123)"
            value={customField}
            onChange={(e) => setCustomField(e.target.value)}
            className="bg-black/40 border-gold/20 text-white placeholder:text-white/40"
          />
        </div>

        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={handleSave}
            className="bg-green-600 hover:bg-green-700"
          >
            <Check className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setIsEditing(false)}
            className="border-white/20"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[2fr_auto_2fr_auto] gap-4 items-center p-4 bg-black/20 rounded-lg border border-gold/20">
      <div className="text-white/80">
        {maxCheckinFieldLabels[mapping.maxcheckin_field_name] ||
          mapping.maxcheckin_field_name}
      </div>

      <div className="text-gold text-xl">⬅️</div>

      <div className="text-white font-mono text-sm">
        {mapping.bitrix_field_name}
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setIsEditing(true)}
          className="border-gold/20 hover:bg-gold/10"
        >
          <Pencil className="w-4 h-4" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={handleDelete}
          className="border-red-500/20 hover:bg-red-500/10 text-red-400"
        >
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
