import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { useBitrixFields } from "@/hooks/useBitrixFields";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface BitrixFieldDetectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

const MAX_CHECKIN_FIELDS = [
  { value: "model_name", label: "Nome do Modelo" },
  { value: "model_photo", label: "Foto do Modelo" },
  { value: "responsible", label: "Responsável" },
  { value: "room", label: "Sala/Estúdio" },
  { value: "lead_id", label: "ID do Lead" },
  { value: "presenca_confirmada", label: "Presença Confirmada" },
];

export default function BitrixFieldDetector({
  open,
  onOpenChange,
  onSuccess,
}: BitrixFieldDetectorProps) {
  const [maxCheckinField, setMaxCheckinField] = useState("");
  const [bitrixField, setBitrixField] = useState("");
  const [customField, setCustomField] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const { data: bitrixFields, isLoading } = useBitrixFields();
  const { toast } = useToast();

  const handleSave = async () => {
    if (!maxCheckinField) {
      toast({
        title: "Erro",
        description: "Selecione um campo MaxCheckin",
        variant: "destructive",
      });
      return;
    }

    const finalBitrixField = customField || bitrixField;
    if (!finalBitrixField) {
      toast({
        title: "Erro",
        description: "Selecione ou digite um campo do Bitrix",
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);

    // Check if mapping already exists
    const { data: existing } = await supabase
      .from("field_mapping")
      .select("id")
      .eq("maxcheckin_field_name", maxCheckinField)
      .eq("is_active", true)
      .maybeSingle();

    if (existing) {
      toast({
        title: "Erro",
        description: "Já existe um mapeamento ativo para este campo",
        variant: "destructive",
      });
      setIsSaving(false);
      return;
    }

    const { error } = await supabase.from("field_mapping").insert({
      maxcheckin_field_name: maxCheckinField,
      bitrix_field_name: finalBitrixField,
      field_type: "string",
      is_active: true,
    });

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
      title: "Mapeamento criado!",
      description: "O campo foi mapeado com sucesso",
    });

    // Reset form
    setMaxCheckinField("");
    setBitrixField("");
    setCustomField("");

    onSuccess();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="border-gold/20 bg-black/40 backdrop-blur-sm max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-gold">Adicionar Mapeamento</DialogTitle>
          <DialogDescription className="text-white/60">
            Mapeie um campo do MaxCheckin para um campo do Bitrix24
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="space-y-2">
            <Label className="text-white/80">Campo MaxCheckin</Label>
            <Select value={maxCheckinField} onValueChange={setMaxCheckinField}>
              <SelectTrigger className="bg-black/20 border-gold/20 text-white">
                <SelectValue placeholder="Selecione o campo do sistema" />
              </SelectTrigger>
              <SelectContent>
                {MAX_CHECKIN_FIELDS.map((field) => (
                  <SelectItem key={field.value} value={field.value}>
                    {field.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-center py-2">
            <div className="text-gold text-3xl font-bold">⬅️ Mapeia para</div>
          </div>

          <div className="space-y-2">
            <Label className="text-white/80">Campo do Bitrix24</Label>
            {isLoading ? (
              <div className="flex items-center gap-2 text-white/60">
                <Loader2 className="w-4 h-4 animate-spin" />
                Carregando campos do Bitrix...
              </div>
            ) : (
              <Select value={bitrixField} onValueChange={setBitrixField}>
                <SelectTrigger className="bg-black/20 border-gold/20 text-white">
                  <SelectValue placeholder="Selecione o campo do Bitrix" />
                </SelectTrigger>
                <SelectContent>
                  {bitrixFields?.map((field) => (
                    <SelectItem key={field.name} value={field.name}>
                      {field.title} ({field.name})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-2">
            <Label className="text-white/80">
              Ou digite um campo customizado
            </Label>
            <Input
              placeholder="Ex: UF_CRM_1728399483"
              value={customField}
              onChange={(e) => setCustomField(e.target.value)}
              className="bg-black/20 border-gold/20 text-white placeholder:text-white/40"
            />
            <p className="text-xs text-white/40">
              Use esta opção se o campo não aparecer na lista acima
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <Button
            onClick={handleSave}
            disabled={isSaving}
            className="bg-gold hover:bg-gold/90 text-black flex-1"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Mapeamento
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="border-white/20"
          >
            Cancelar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
