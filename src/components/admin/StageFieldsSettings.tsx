import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CustomField } from '@/hooks/useCustomFields';

interface StageFieldsSettingsProps {
  stageId: string;
}

interface StageFieldLink {
  id: string;
  field_id: string;
  custom_fields: CustomField;
}

export function StageFieldsSettings({ stageId }: StageFieldsSettingsProps) {
  const [availableFields, setAvailableFields] = useState<CustomField[]>([]);
  const [stageFields, setStageFields] = useState<StageFieldLink[]>([]);
  // Note: We only support text, number, and list types for Kanban custom fields
  // Other field types (date, image, boolean) are not supported in this context
  const [newField, setNewField] = useState({
    field_label: '',
    field_type: 'text' as 'text' | 'number' | 'list',
    field_options: [] as string[],
    optionInput: ''
  });
  const { toast } = useToast();

  useEffect(() => {
    loadFields();
  }, [stageId]);

  const loadFields = async () => {
    // Carregar campos customizados existentes
    const { data: fields } = await supabase
      .from('custom_fields')
      .select('*')
      .eq('is_active', true)
      .order('sort_order');
    
    if (fields) setAvailableFields(fields as CustomField[]);

    // Carregar campos vinculados a esta etapa
    const { data: linkedFields } = await supabase
      .from('kanban_stage_fields')
      .select('*, custom_fields(*)')
      .eq('stage_id', stageId)
      .order('sort_order');
    
    if (linkedFields) setStageFields(linkedFields as StageFieldLink[]);
  };

  const createNewField = async () => {
    if (!newField.field_label) {
      toast({ title: "Digite um nome para o campo", variant: "destructive" });
      return;
    }

    const fieldKey = newField.field_label.toLowerCase().replace(/\s+/g, '_');
    
    const { data: field, error } = await supabase
      .from('custom_fields')
      .insert({
        field_key: fieldKey,
        field_label: newField.field_label,
        field_type: newField.field_type,
        field_options: newField.field_type === 'list' ? newField.field_options : [],
        show_in_checkin: false,
        show_in_panels: true
      })
      .select()
      .single();

    if (error || !field) {
      toast({ title: "Erro ao criar campo", variant: "destructive" });
      return;
    }

    // Vincular à etapa
    await supabase.from('kanban_stage_fields').insert({
      stage_id: stageId,
      field_id: (field as any).id,
      sort_order: stageFields.length
    });

    setNewField({
      field_label: '',
      field_type: 'text',
      field_options: [],
      optionInput: ''
    });

    toast({ title: "Campo criado com sucesso!" });
    loadFields();
  };

  const linkExistingField = async (fieldId: string) => {
    await supabase.from('kanban_stage_fields').insert({
      stage_id: stageId,
      field_id: fieldId,
      sort_order: stageFields.length
    });

    toast({ title: "Campo adicionado!" });
    loadFields();
  };

  const unlinkField = async (linkId: string) => {
    await supabase.from('kanban_stage_fields').delete().eq('id', linkId);
    toast({ title: "Campo removido!" });
    loadFields();
  };

  const addOption = () => {
    if (newField.optionInput.trim()) {
      setNewField(prev => ({
        ...prev,
        field_options: [...prev.field_options, prev.optionInput.trim()],
        optionInput: ''
      }));
    }
  };

  const removeOption = (index: number) => {
    setNewField(prev => ({
      ...prev,
      field_options: prev.field_options.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="space-y-6">
      {/* Campos já vinculados */}
      <div>
        <h3 className="text-foreground font-medium mb-3">Campos desta Etapa</h3>
        <div className="space-y-2">
          {stageFields.map((link) => (
            <div
              key={link.id}
              className="flex items-center justify-between p-3 bg-muted/50 rounded border border-border"
            >
              <div>
                <p className="text-foreground">{link.custom_fields.field_label}</p>
                <p className="text-muted-foreground text-xs">Tipo: {link.custom_fields.field_type}</p>
              </div>
              <Button
                size="sm"
                variant="outline"
                onClick={() => unlinkField(link.id)}
                className="border-red-500/20 text-red-600 dark:text-red-400 hover:bg-red-500/10"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          {stageFields.length === 0 && (
            <p className="text-muted-foreground text-sm">Nenhum campo configurado</p>
          )}
        </div>
      </div>

      {/* Adicionar campo existente */}
      <div>
        <h3 className="text-foreground font-medium mb-3">Adicionar Campo Existente</h3>
        <Select onValueChange={linkExistingField}>
          <SelectTrigger className="bg-background border-input text-foreground">
            <SelectValue placeholder="Selecione um campo" />
          </SelectTrigger>
          <SelectContent className="bg-card border-border">
            {availableFields
              .filter(f => !stageFields.some(sf => sf.field_id === f.id))
              .map((field) => (
                <SelectItem key={field.id} value={field.id} className="text-foreground">
                  {field.field_label} ({field.field_type})
                </SelectItem>
              ))}
          </SelectContent>
        </Select>
      </div>

      {/* Criar novo campo */}
      <div>
        <h3 className="text-foreground font-medium mb-3">Criar Novo Campo</h3>
        <div className="space-y-3">
          <div>
            <Label className="text-foreground">Nome do Campo</Label>
            <Input
              value={newField.field_label}
              onChange={(e) => setNewField(prev => ({ ...prev, field_label: e.target.value }))}
              placeholder="Ex: Produtor"
              className="bg-background border-input text-foreground"
            />
          </div>

          <div>
            <Label className="text-foreground">Tipo</Label>
            <Select
              value={newField.field_type}
              onValueChange={(value: 'text' | 'number' | 'list') =>
                setNewField(prev => ({ ...prev, field_type: value }))
              }
            >
              <SelectTrigger className="bg-background border-input text-foreground">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="text" className="text-foreground">Texto</SelectItem>
                <SelectItem value="number" className="text-foreground">Número</SelectItem>
                <SelectItem value="list" className="text-foreground">Lista de Opções</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {newField.field_type === 'list' && (
            <div>
              <Label className="text-foreground">Opções da Lista</Label>
              <div className="flex gap-2 mb-2">
                <Input
                  value={newField.optionInput}
                  onChange={(e) => setNewField(prev => ({ ...prev, optionInput: e.target.value }))}
                  placeholder="Digite uma opção"
                  className="bg-background border-input text-foreground"
                  onKeyPress={(e) => e.key === 'Enter' && addOption()}
                />
                <Button
                  onClick={addOption}
                  size="sm"
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>
              <div className="space-y-1">
                {newField.field_options.map((option, index) => (
                  <div key={index} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                    <span className="text-foreground text-sm">{option}</span>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => removeOption(index)}
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-red-600 dark:hover:text-red-400"
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button
            onClick={createNewField}
            className="bg-primary text-primary-foreground hover:bg-primary/90 w-full"
          >
            <Plus className="w-4 h-4 mr-2" />
            Criar Campo
          </Button>
        </div>
      </div>
    </div>
  );
}