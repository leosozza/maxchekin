import { useEffect, useMemo, useState } from 'react';
import type React from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Settings, Users as UsersIcon, Phone, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { performFinalSync } from '@/utils/bitrix/finalSync';
import { StageWebhookSettings } from '@/components/admin/StageWebhookSettings';
import { StageFieldsSettings } from '@/components/admin/StageFieldsSettings';
import { CustomFieldModal } from '@/components/admin/CustomFieldModal';
import { CustomField } from '@/hooks/useCustomFields';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent, DragStartEvent, useDroppable,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, arrayMove, useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

type Stage = { 
  id: string; 
  name: string; 
  position: number; 
  panel_id: string | null; 
  is_default: boolean; 
  auto_call: boolean;
  webhook_url: string | null;
  webhook_on_enter: boolean;
  webhook_on_exit: boolean;
};

type CardItem = { 
  id: string; 
  lead_id: string; 
  model_name: string | null; 
  responsible: string | null; 
  room: string | null; 
  stage_id: string; 
  position: number;
  custom_field_values: Record<string, string | number | boolean>;
};

// Droppable stage container to support dropping cards on empty stages
function DroppableStage({ stageId, children }: { stageId: string; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id: `stage-${stageId}` });
  
  return (
    <div 
      ref={setNodeRef} 
      className={`min-h-[100px] transition-colors ${isOver ? 'bg-primary/5 border-2 border-primary/30 rounded' : ''}`}
    >
      {children}
    </div>
  );
}

function SortableCard({
  item,
  stageId,
  stages,
  onMoveCard,
  onCallNow,
  onFinalSync
}: {
  item: CardItem;
  stageId: string;
  stages: Stage[];
  onMoveCard: (card: CardItem, toStageId: string, toIndex: number) => void;
  onCallNow: (card: CardItem) => void;
  onFinalSync: (card: CardItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-3 rounded bg-card/50 border border-border cursor-grab hover:bg-card hover:border-primary/50 transition-colors ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="text-foreground font-medium">{item.model_name || 'Sem nome'}</div>
      <div className="text-muted-foreground text-xs">Lead #{item.lead_id}</div>
      <div className="text-muted-foreground text-xs">Resp: {item.responsible || '—'}</div>

      {/* ações rápidas */}
      <div className="mt-2 flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={(e) => { e.stopPropagation(); onCallNow(item); }}
            title="Chamar agora no painel"
          >
            <Phone className="w-3 h-3 mr-1" />
            Chamar
          </Button>
        </div>
        
        {/* Mostrar botão de sync final apenas na última etapa */}
        {stages.findIndex(s => s.id === stageId) === stages.length - 1 && (
          <Button
            size="sm"
            variant="default"
            className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white w-full"
            onClick={(e) => { e.stopPropagation(); onFinalSync(item); }}
            title="Concluir e sincronizar com Bitrix"
          >
            <CheckCircle className="w-3 h-3 mr-1" />
            Concluir Fluxo
          </Button>
        )}
      </div>
    </div>
  );
}

export default function KanbanBoard() {
  const { toast } = useToast();

  const [stages, setStages] = useState<Stage[]>([]);
  const [cardsByStage, setCardsByStage] = useState<Record<string, CardItem[]>>({});
  const [loading, setLoading] = useState(true);

  // Dialog states
  const [openCreateStage, setOpenCreateStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [stageUsersOpen, setStageUsersOpen] = useState<{ open: boolean; stage?: Stage }>({
    open: false,
  });
  const [stageSettingsOpen, setStageSettingsOpen] = useState<{ open: boolean; stage?: Stage }>({
    open: false,
  });
  
  // Final sync modal state
  const [finalSyncOpen, setFinalSyncOpen] = useState(false);
  const [finalSyncCard, setFinalSyncCard] = useState<CardItem | null>(null);
  const [finalSyncNotes, setFinalSyncNotes] = useState('');
  const [finalSyncStatus, setFinalSyncStatus] = useState('COMPLETED');
  const [syncingFinal, setSyncingFinal] = useState(false);

  // Modal de campos customizados
  const [customFieldsModalOpen, setCustomFieldsModalOpen] = useState(false);
  const [customFieldsForStage, setCustomFieldsForStage] = useState<CustomField[]>([]);
  const [pendingCardMove, setPendingCardMove] = useState<{card: CardItem; toStageId: string; toIndex: number} | null>(null);

  // drag state
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(useSensor(PointerSensor, {
    activationConstraint: {
      distance: 8,
    },
  }));

  async function loadData() {
    setLoading(true);
    try {
      const { data: s, error: es } = await supabase
        .from('kanban_stages').select('*').order('position', { ascending: true });
      if (es) throw es;

      const { data: c, error: ec } = await supabase
        .from('kanban_cards')
        .select('id,lead_id,model_name,responsible,room,stage_id,position,custom_field_values')
        .order('position', { ascending: true });
      if (ec) throw ec;

      setStages((s || []) as Stage[]);
      const grouped: Record<string, CardItem[]> = {};
      (c || []).forEach((item) => {
        if (item && typeof item === 'object' && 'id' in item && 'stage_id' in item) {
          const cardItem = item as CardItem;
          const key = cardItem.stage_id;
          grouped[key] = grouped[key] || [];
          grouped[key].push(cardItem);
        }
      });
      setCardsByStage(grouped);
    } catch (error) {
      console.error('Error loading kanban data:', error);
      toast({
        title: "Erro ao carregar dados",
        description: "Não foi possível carregar as etapas e cards.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const onDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find active card's stage and index
    let activeStageId = '';
    let activeIndex = -1;
    let activeCard: CardItem | null = null;

    for (const [stageId, items] of Object.entries(cardsByStage)) {
      const idx = items.findIndex(i => i.id === activeId);
      if (idx !== -1) {
        activeStageId = stageId;
        activeIndex = idx;
        activeCard = items[idx];
        break;
      }
    }

    if (!activeCard) return;

    try {
      // Dropping on a stage container (empty or end)
      if (overId.startsWith('stage-')) {
        const targetStageId = overId.replace('stage-', '');
        if (targetStageId === activeStageId) {
          const targetItems = cardsByStage[targetStageId] || [];
          if (activeIndex === targetItems.length - 1) return;
          await checkAndMoveCard(activeCard, targetStageId, targetItems.length);
          return;
        }
        const targetItems = cardsByStage[targetStageId] || [];
        await checkAndMoveCard(activeCard, targetStageId, targetItems.length);
        return;
      }

      // Find the over card's stage and index
      let overStageId = '';
      let overIndex = -1;

      for (const [stageId, items] of Object.entries(cardsByStage)) {
        const idxOver = items.findIndex(i => i.id === overId);
        if (idxOver !== -1) {
          overStageId = stageId;
          overIndex = idxOver;
          break;
        }
      }

      if (!overStageId) return;

      if (activeStageId === overStageId) {
        // Reorder within stage
        const items = cardsByStage[activeStageId];
        const reordered = arrayMove(items, activeIndex, overIndex);
        const updated = reordered.map((it, idx) => ({ ...it, position: idx }));
        setCardsByStage(prev => ({ ...prev, [activeStageId]: updated }));
        // Persist positions
        for (const card of updated) {
          await supabase.from('kanban_cards').update({ position: card.position }).eq('id', card.id);
        }
      } else {
        // Move to another stage at specific index
        await checkAndMoveCard(activeCard, overStageId, overIndex);
      }
    } catch (error) {
      console.error('Error during drag operation:', error);
      toast({
        title: "Erro ao mover card",
        description: "Não foi possível mover o card. Tente novamente.",
        variant: "destructive",
      });
      await loadData();
    }
  };

  // Verificar se a etapa de destino tem campos customizados
  const checkAndMoveCard = async (card: CardItem, toStageId: string, toIndex: number) => {
    try {
      const { data: stageFields, error } = await supabase
        .from('kanban_stage_fields')
        .select('*, custom_fields(*)')
        .eq('stage_id', toStageId)
        .order('sort_order');

      if (error) {
        throw error;
      }

      if (stageFields && stageFields.length > 0) {
        // Filtrar apenas campos válidos
        const validFields = stageFields
          .map(sf => sf.custom_fields)
          .filter((field): field is CustomField => field !== null && field !== undefined);
        setCustomFieldsForStage(validFields);
        setPendingCardMove({ card, toStageId, toIndex });
        setCustomFieldsModalOpen(true);
      } else {
        // Sem campos customizados - mover direto
        await moveCardToStage(card, toStageId, toIndex);
      }
    } catch (error) {
      console.error('Erro ao verificar campos da etapa:', error);
      toast({
        title: "Erro ao verificar campos",
        description: "Não foi possível verificar os campos da etapa.",
        variant: "destructive",
      });
    }
  };

  // Callback do modal de campos customizados
  const handleCustomFieldsSubmit = async (values: Record<string, string | number | boolean>) => {
    if (!pendingCardMove) return;

    try {
      const { card, toStageId, toIndex } = pendingCardMove;
      
      // Atualizar valores customizados do card
      const updatedCard = {
        ...card,
        custom_field_values: { ...card.custom_field_values, ...values }
      };

      await moveCardToStage(updatedCard, toStageId, toIndex, 'kanban', values);
      setPendingCardMove(null);
      setCustomFieldsModalOpen(false);
      
      toast({
        title: "Card movido com sucesso!",
        description: "Os campos personalizados foram salvos.",
      });
    } catch (error) {
      console.error('Error submitting custom fields:', error);
      toast({
        title: "Erro ao mover card",
        description: "Não foi possível salvar os campos personalizados.",
        variant: "destructive",
      });
    }
  };

  // mover entre colunas
  const moveCardToStage = async (
    card: CardItem, 
    toStageId: string, 
    toIndex: number, 
    byMethod: 'kanban' | 'checkin' = 'kanban', 
    customFieldValues?: Record<string, string | number | boolean>
  ) => {
    const fromStageId = card.stage_id;
    const fromStage = stages.find(s => s.id === fromStageId);
    const toStage = stages.find(s => s.id === toStageId);

    // Chamar webhook de saída da etapa anterior
    if (fromStage?.webhook_url && fromStage.webhook_on_exit) {
      try {
        await supabase.functions.invoke('kanban-webhook', {
          body: {
            webhook_url: fromStage.webhook_url,
            lead_id: card.lead_id,
            stage_name: fromStage.name,
            event_type: 'exit',
            card_data: {
              model_name: card.model_name,
              responsible: card.responsible,
              room: card.room,
            }
          }
        });
        console.log(`Webhook de saída chamado para etapa ${fromStage.name}`);
      } catch (error) {
        console.error('Erro ao chamar webhook de saída:', error);
      }
    }

    // atualiza UI
    const fromList = (cardsByStage[fromStageId] || []).filter(x => x.id !== card.id);
    const toList = [...(cardsByStage[toStageId] || [])];
    const newCard = { ...card, stage_id: toStageId };
    toList.splice(toIndex, 0, newCard);

    // reindex
    const toListIndexed = toList.map((it, idx) => ({ ...it, position: idx }));
    const fromListIndexed = fromList.map((it, idx) => ({ ...it, position: idx }));

    setCardsByStage(prev => ({
      ...prev,
      [fromStageId]: fromListIndexed,
      [toStageId]: toListIndexed,
    }));

    // persist - update positions individually
    try {
      for (const r of fromListIndexed) {
        const { error } = await supabase.from('kanban_cards').update({ position: r.position }).eq('id', r.id);
        if (error) throw error;
      }
      
      // Define proper update type for card updates
      interface CardUpdateData {
        stage_id: string;
        position: number;
        custom_field_values?: Record<string, string | number | boolean>;
      }
      
      for (const r of toListIndexed) {
        const updateData: CardUpdateData = { stage_id: r.stage_id, position: r.position };
        if (customFieldValues && r.id === card.id) {
          updateData.custom_field_values = { ...r.custom_field_values, ...customFieldValues };
        }
        const { error } = await supabase.from('kanban_cards').update(updateData).eq('id', r.id);
        if (error) throw error;
      }
    } catch (error) {
      console.error('Erro ao persistir movimentação:', error);
      toast({
        title: "Erro ao mover card",
        description: "As alterações podem não ter sido salvas corretamente",
        variant: "destructive",
      });
      // Recarregar dados para garantir sincronização
      loadData();
      return;
    }

    // auditar
    await supabase.from('kanban_events').insert({
      lead_id: card.lead_id,
      from_stage_id: fromStageId,
      to_stage_id: toStageId,
      method: byMethod,
    });

    // Chamar webhook de entrada na nova etapa
    if (toStage?.webhook_url && toStage.webhook_on_enter) {
      try {
        await supabase.functions.invoke('kanban-webhook', {
          body: {
            webhook_url: toStage.webhook_url,
            lead_id: card.lead_id,
            stage_name: toStage.name,
            event_type: 'enter',
            card_data: {
              model_name: card.model_name,
              responsible: card.responsible,
              room: card.room,
            }
          }
        });
        console.log(`Webhook de entrada chamado para etapa ${toStage.name}`);
      } catch (error) {
        console.error('Erro ao chamar webhook de entrada:', error);
      }
    }

    // chamar painel (se a coluna tiver panel_id vinculado)
    if (toStage?.panel_id) {
      const customData: Record<string, string | number | boolean> = {};
      
      // Incluir valores de campos customizados no custom_data
      if (customFieldValues) {
        Object.entries(customFieldValues).forEach(([key, value]) => {
          customData[key] = value;
        });
      }

      await supabase.from('calls').insert({
        panel_id: toStage.panel_id,
        lead_id: card.lead_id,
        model_name: card.model_name || '',
        room: card.room,
        source: 'kanban',
        custom_data: customData
      });
      
      toast({
        title: "Lead chamado no painel!",
        description: `${card.model_name} foi chamado no painel ${toStage.name}`,
      });
    }
  };

  const handleCreateStage = async () => {
    if (!newStageName.trim()) {
      toast({
        title: "Nome inválido",
        description: "Digite um nome para a etapa.",
        variant: "destructive",
      });
      return;
    }

    try {
      const position = stages.length;
      const { data, error } = await supabase
        .from('kanban_stages')
        .insert({ name: newStageName, position })
        .select('*')
        .single();
      
      if (error) throw error;
      
      if (data) {
        setStages(prev => [...prev, data as any]);
        setOpenCreateStage(false);
        setNewStageName('');
        toast({
          title: "Etapa criada!",
          description: `A etapa "${newStageName}" foi criada com sucesso.`,
        });
      }
    } catch (error) {
      console.error('Error creating stage:', error);
      toast({
        title: "Erro ao criar etapa",
        description: "Não foi possível criar a etapa. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  // Chamar agora - insere em calls sem mover o card
  const handleCallNow = async (card: CardItem) => {
    try {
      const currentStage = stages.find(s => s.id === card.stage_id);
      if (!currentStage?.panel_id) {
        toast({
          title: "Painel não configurado",
          description: "Esta etapa não tem um painel vinculado.",
          variant: "destructive",
        });
        return;
      }

      // Insere chamada no painel
      await supabase.from('calls').insert({
        panel_id: currentStage.panel_id,
        lead_id: card.lead_id,
        model_name: card.model_name || '',
        room: card.room,
        source: 'kanban_call_now'
      });

      // Registra evento de auditoria
      await supabase.from('kanban_events').insert({
        lead_id: card.lead_id,
        from_stage_id: card.stage_id,
        to_stage_id: card.stage_id, // mesma etapa
        method: 'kanban',
      });

      toast({
        title: "Lead chamado no painel!",
        description: `${card.model_name || 'Lead'} foi chamado no painel ${currentStage.name}`,
      });
    } catch (error) {
      console.error('Erro ao chamar lead:', error);
      toast({
        title: "Erro ao chamar lead",
        description: "Não foi possível chamar o lead no painel.",
        variant: "destructive",
      });
    }
  };

  // Abrir modal de sync final
  const handleFinalSyncRequest = (card: CardItem) => {
    setFinalSyncCard(card);
    setFinalSyncNotes('');
    setFinalSyncStatus('COMPLETED');
    setFinalSyncOpen(true);
  };

  // Executar sync final
  const executeFinalSync = async () => {
    if (!finalSyncCard) return;

    setSyncingFinal(true);
    try {
      await performFinalSync(
        finalSyncCard.lead_id,
        finalSyncStatus,
        finalSyncNotes || undefined
      );

      toast({
        title: "Sincronização concluída!",
        description: `Lead ${finalSyncCard.lead_id} sincronizado com Bitrix`,
      });

      // Remover card do Kanban após sync
      const { error } = await supabase
        .from('kanban_cards')
        .delete()
        .eq('id', finalSyncCard.id);

      if (!error) {
        // Atualizar UI
        setCardsByStage(prev => {
          const updated = { ...prev };
          updated[finalSyncCard.stage_id] = updated[finalSyncCard.stage_id]?.filter(
            c => c.id !== finalSyncCard.id
          ) || [];
          return updated;
        });
      }

      setFinalSyncOpen(false);
      setFinalSyncCard(null);
    } catch (error) {
      console.error('Erro ao sincronizar:', error);
      toast({
        title: "Erro na sincronização",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
    } finally {
      setSyncingFinal(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Kanban (Etapas)</h1>
          <p className="text-muted-foreground">Arraste leads entre etapas. Cada etapa pode acionar um painel.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setOpenCreateStage(true)} className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Plus className="w-4 h-4 mr-1" /> Nova Etapa
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Carregando...</div>
      ) : (
        <div className="flex gap-4 overflow-auto pb-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={onDragStart} onDragEnd={onDragEnd}>
            {stages.map(stage => {
              const items = cardsByStage[stage.id] || [];
              return (
                <Card key={stage.id} className="min-w-[320px] border-border bg-card/60 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-primary">{stage.name}</CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm"
                        onClick={() => setStageUsersOpen({open:true, stage})}>
                        <UsersIcon className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm"
                        onClick={() => setStageSettingsOpen({open:true, stage})}>
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <DroppableStage stageId={stage.id}>
                      <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                          {items.map((item) => (
                            <SortableCard 
                              key={item.id} 
                              item={item} 
                              stageId={stage.id} 
                              stages={stages}
                              onMoveCard={moveCardToStage}
                              onCallNow={handleCallNow}
                              onFinalSync={handleFinalSyncRequest}
                            />
                          ))}
                          {items.length === 0 && (
                            <div className="text-center text-muted-foreground text-sm py-8">
                              Arraste cards para cá
                            </div>
                          )}
                        </div>
                      </SortableContext>
                    </DroppableStage>
                  </CardContent>
                </Card>
              );
            })}
          </DndContext>
        </div>
      )}

      {/* Criar Etapa */}
      <Dialog open={openCreateStage} onOpenChange={setOpenCreateStage}>
        <DialogContent className="bg-card border-border">
          <DialogHeader><DialogTitle className="text-primary">Nova Etapa</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input
              value={newStageName}
              onChange={e => setNewStageName(e.target.value)}
              placeholder="Nome da etapa"
              className="bg-background border-input text-foreground"
            />
            <Button onClick={handleCreateStage} className="bg-primary text-primary-foreground hover:bg-primary/90">Criar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Configurar Campos da Etapa */}
      <Dialog open={stageUsersOpen.open} onOpenChange={(o)=>setStageUsersOpen({open:o, stage: stageUsersOpen.stage})}>
        <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader><DialogTitle className="text-primary">Campos Personalizados: {stageUsersOpen.stage?.name}</DialogTitle></DialogHeader>
          {stageUsersOpen.stage && (
            <StageFieldsSettings stageId={stageUsersOpen.stage.id} />
          )}
        </DialogContent>
      </Dialog>

      {/* Configurações da Etapa (Webhook) */}
      <Dialog open={stageSettingsOpen.open} onOpenChange={(o)=>setStageSettingsOpen({open:o, stage: stageSettingsOpen.stage})}>
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-primary">Configurações: {stageSettingsOpen.stage?.name}</DialogTitle>
          </DialogHeader>
          {stageSettingsOpen.stage && (
            <StageWebhookSettings 
              stage={stageSettingsOpen.stage} 
              onSave={async (updates) => {
                const { error } = await supabase
                  .from('kanban_stages')
                  .update(updates)
                  .eq('id', stageSettingsOpen.stage!.id);
                
                if (!error) {
                  toast({ title: "Configurações salvas!" });
                  loadData();
                  setStageSettingsOpen({open: false});
                } else {
                  toast({ title: "Erro ao salvar", variant: "destructive" });
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Sincronização Final */}
      <Dialog open={finalSyncOpen} onOpenChange={setFinalSyncOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-primary">Concluir Fluxo e Sincronizar com Bitrix</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-muted/50 rounded border border-border">
              <p className="text-foreground text-sm mb-2">
                <strong>Lead:</strong> {finalSyncCard?.model_name || 'Sem nome'}
              </p>
              <p className="text-muted-foreground text-xs">
                ID: {finalSyncCard?.lead_id}
              </p>
            </div>

            <div>
              <label className="text-foreground text-sm block mb-2">Status Final no Bitrix</label>
              <Input
                value={finalSyncStatus}
                onChange={(e) => setFinalSyncStatus(e.target.value)}
                placeholder="Ex: COMPLETED, MATERIAL_DELIVERED"
                className="bg-background border-input text-foreground"
              />
              <p className="text-muted-foreground text-xs mt-1">
                ID do status no Bitrix (ex: COMPLETED, CONVERTED, etc.)
              </p>
            </div>

            <div>
              <label className="text-foreground text-sm block mb-2">Observações (opcional)</label>
              <Textarea
                value={finalSyncNotes}
                onChange={(e) => setFinalSyncNotes(e.target.value)}
                placeholder="Adicione observações sobre o atendimento..."
                className="bg-background border-input text-foreground min-h-[100px]"
              />
            </div>

            <div className="p-3 bg-blue-500/10 border border-blue-500/30 rounded">
              <p className="text-blue-600 dark:text-blue-400 text-xs">
                <strong>O que será sincronizado:</strong>
              </p>
              <ul className="text-blue-600 dark:text-blue-300 text-xs mt-2 space-y-1 list-disc list-inside">
                <li>Status final do lead</li>
                <li>Timestamps de todas as etapas</li>
                <li>Duração em cada etapa</li>
                <li>Tempo total de atendimento</li>
                <li>Observações (se houver)</li>
              </ul>
            </div>

            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => setFinalSyncOpen(false)}
                disabled={syncingFinal}
              >
                Cancelar
              </Button>
              <Button
                onClick={executeFinalSync}
                disabled={syncingFinal}
                className="bg-green-600 hover:bg-green-700 dark:bg-green-600 dark:hover:bg-green-700 text-white"
              >
                {syncingFinal ? 'Sincronizando...' : 'Confirmar e Sincronizar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal de Campos Customizados */}
      <CustomFieldModal
        open={customFieldsModalOpen}
        onOpenChange={setCustomFieldsModalOpen}
        fields={customFieldsForStage}
        onSubmit={handleCustomFieldsSubmit}
      />
    </div>
  );
}