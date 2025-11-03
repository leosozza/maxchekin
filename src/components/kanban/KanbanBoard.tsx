import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Settings, Users as UsersIcon, Phone, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { CustomFieldModal } from './CustomFieldModal';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from '@dnd-kit/sortable';

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
  custom_field_values: Record<string, unknown>;
};

interface SortableCardProps {
  item: CardItem;
  stageId: string;
  stages: Stage[];
  onCallNow: (card: CardItem) => void;
  onFinalSync: (card: CardItem) => void;
}

function SortableCard({ item, stageId, stages, onCallNow, onFinalSync }: SortableCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
  });

  const style = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`p-3 rounded bg-card border border-border cursor-grab hover:border-primary/30 transition-colors ${
        isDragging ? 'opacity-50 shadow-lg' : ''
      }`}
    >
      <div className="font-medium text-foreground">{item.model_name || 'Sem nome'}</div>
      <div className="text-muted-foreground text-xs">Lead #{item.lead_id}</div>
      <div className="text-muted-foreground text-xs">Resp: {item.responsible || '—'}</div>

      {/* Quick actions */}
      <div className="mt-2 flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="flex-1"
            onClick={(e) => {
              e.stopPropagation();
              onCallNow(item);
            }}
            title="Chamar agora no painel"
          >
            <Phone className="w-3 h-3 mr-1" />
            Chamar
          </Button>
        </div>

        {/* Show final sync button only on last stage */}
        {stages.findIndex((s) => s.id === stageId) === stages.length - 1 && (
          <Button
            size="sm"
            variant="default"
            className="bg-green-600 hover:bg-green-700 text-white w-full"
            onClick={(e) => {
              e.stopPropagation();
              onFinalSync(item);
            }}
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

interface KanbanBoardProps {
  onStageSettingsClick?: (stage: Stage) => void;
  onStageFieldsClick?: (stage: Stage) => void;
  onCreateStageClick?: () => void;
  onFinalSyncRequest?: (card: CardItem) => void;
}

export function KanbanBoard({
  onStageSettingsClick,
  onStageFieldsClick,
  onCreateStageClick,
  onFinalSyncRequest,
}: KanbanBoardProps) {
  const [stages, setStages] = useState<Stage[]>([]);
  const [cardsByStage, setCardsByStage] = useState<Record<string, CardItem[]>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // Custom fields modal state
  const [customFieldsModalOpen, setCustomFieldsModalOpen] = useState(false);
  const [customFieldsForStage, setCustomFieldsForStage] = useState<unknown[]>([]);
  const [pendingCardMove, setPendingCardMove] = useState<{
    card: CardItem;
    toStageId: string;
    toIndex: number;
  } | null>(null);

  // Drag state
  const [activeId, setActiveId] = useState<string | null>(null);

  // Configure sensors with activation constraint
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  async function loadData() {
    setLoading(true);
    try {
      const { data: s, error: es } = await supabase
        .from('kanban_stages')
        .select('*')
        .order('position', { ascending: true });
      if (es) throw es;

      const { data: c, error: ec } = await supabase
        .from('kanban_cards')
        .select('id,lead_id,model_name,responsible,room,stage_id,position,custom_field_values')
        .order('position', { ascending: true });
      if (ec) throw ec;

      setStages((s || []) as Stage[]);
      const grouped: Record<string, CardItem[]> = {};
      (c || []).forEach((item: unknown) => {
        const typedItem = item as CardItem;
        const key = typedItem.stage_id;
        grouped[key] = grouped[key] || [];
        grouped[key].push(typedItem);
      });
      setCardsByStage(grouped);
    } catch (error) {
      console.error('Error loading kanban data:', error);
      toast({
        title: 'Erro ao carregar dados',
        description: 'Não foi possível carregar o quadro Kanban',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }

  // Load data once on component mount
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    loadData();
  }, []);

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const onDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the stage and index for active and over
    let activeStageId = '';
    let activeIndex = -1;
    let overStageId = '';
    let overIndex = -1;

    for (const [stageId, items] of Object.entries(cardsByStage)) {
      const idx = items.findIndex((i) => i.id === activeId);
      if (idx !== -1) {
        activeStageId = stageId;
        activeIndex = idx;
      }
      const idxOver = items.findIndex((i) => i.id === overId);
      if (idxOver !== -1) {
        overStageId = stageId;
        overIndex = idxOver;
      }
    }

    if (activeStageId === overStageId) {
      // Reorder within stage
      const items = cardsByStage[activeStageId];
      const reordered = arrayMove(items, activeIndex, overIndex);
      const updated = reordered.map((it, idx) => ({ ...it, position: idx }));
      setCardsByStage((prev) => ({ ...prev, [activeStageId]: updated }));
      
      // Persist - update each card's position individually
      for (const card of updated) {
        await supabase.from('kanban_cards').update({ position: card.position }).eq('id', card.id);
      }
      
      toast({
        title: 'Posição atualizada',
        description: 'Card reordenado com sucesso',
      });
    } else {
      // Move to another stage - check for custom fields
      const activeCard = cardsByStage[activeStageId][activeIndex];
      await checkAndMoveCard(activeCard, overStageId, overIndex);
    }
  };

  // Check if destination stage has custom fields
  const checkAndMoveCard = async (card: CardItem, toStageId: string, toIndex: number) => {
    const { data: stageFields } = await supabase
      .from('kanban_stage_fields')
      .select('*, custom_fields(*)')
      .eq('stage_id', toStageId)
      .order('sort_order');

    if (stageFields && stageFields.length > 0) {
      // Has custom fields - open modal
      setCustomFieldsForStage(stageFields.map((sf) => sf.custom_fields));
      setPendingCardMove({ card, toStageId, toIndex });
      setCustomFieldsModalOpen(true);
    } else {
      // No custom fields - move directly
      await moveCardToStage(card, toStageId, toIndex);
    }
  };

  // Custom fields modal callback
  const handleCustomFieldsSubmit = async (values: Record<string, unknown>) => {
    if (!pendingCardMove) return;

    const { card, toStageId, toIndex } = pendingCardMove;

    // Update card custom field values
    const updatedCard = {
      ...card,
      custom_field_values: { ...card.custom_field_values, ...values },
    };

    await moveCardToStage(updatedCard, toStageId, toIndex, values);
    setPendingCardMove(null);
    setCustomFieldsModalOpen(false);
  };

  // Move card between stages
  const moveCardToStage = async (
    card: CardItem,
    toStageId: string,
    toIndex: number,
    customFieldValues?: Record<string, unknown>
  ) => {
    const fromStageId = card.stage_id;
    const fromStage = stages.find((s) => s.id === fromStageId);
    const toStage = stages.find((s) => s.id === toStageId);

    // Call exit webhook from previous stage
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
            },
          },
        });
      } catch (error) {
        console.error('Error calling exit webhook:', error);
      }
    }

    // Update UI
    const fromList = (cardsByStage[fromStageId] || []).filter((x) => x.id !== card.id);
    const toList = [...(cardsByStage[toStageId] || [])];
    const newCard = { ...card, stage_id: toStageId };
    toList.splice(toIndex, 0, newCard);

    // Reindex positions
    const toListIndexed = toList.map((it, idx) => ({ ...it, position: idx }));
    const fromListIndexed = fromList.map((it, idx) => ({ ...it, position: idx }));

    setCardsByStage((prev) => ({
      ...prev,
      [fromStageId]: fromListIndexed,
      [toStageId]: toListIndexed,
    }));

    // Persist - update positions individually
    for (const r of fromListIndexed) {
      await supabase.from('kanban_cards').update({ position: r.position }).eq('id', r.id);
    }

    for (const r of toListIndexed) {
      const updateData: Record<string, unknown> = { stage_id: r.stage_id, position: r.position };
      if (customFieldValues && r.id === card.id) {
        updateData.custom_field_values = { ...r.custom_field_values, ...customFieldValues };
      }
      await supabase.from('kanban_cards').update(updateData).eq('id', r.id);
    }

    // Audit trail
    await supabase.from('kanban_events').insert({
      lead_id: card.lead_id,
      from_stage_id: fromStageId,
      to_stage_id: toStageId,
      method: 'kanban',
    });

    // Call entry webhook for new stage
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
            },
          },
        });
      } catch (error) {
        console.error('Error calling entry webhook:', error);
      }
    }

    // Call panel if stage has linked panel_id
    if (toStage?.panel_id) {
      const customData: Record<string, unknown> = {};

      // Include custom field values in custom_data
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
        custom_data: customData,
      });

      toast({
        title: 'Lead chamado no painel!',
        description: `${card.model_name} foi chamado no painel ${toStage.name}`,
      });
    } else {
      toast({
        title: 'Card movido',
        description: `${card.model_name} foi movido para ${toStage?.name}`,
      });
    }
  };

  // Call now - inserts into calls without moving card
  const handleCallNow = async (card: CardItem) => {
    try {
      const currentStage = stages.find((s) => s.id === card.stage_id);
      if (!currentStage?.panel_id) {
        toast({
          title: 'Aviso',
          description: 'Esta etapa não tem painel vinculado',
          variant: 'destructive',
        });
        return;
      }

      // Insert call into panel
      await supabase.from('calls').insert({
        panel_id: currentStage.panel_id,
        lead_id: card.lead_id,
        model_name: card.model_name || '',
        room: card.room,
        source: 'kanban_call_now',
      });

      // Audit event
      await supabase.from('kanban_events').insert({
        lead_id: card.lead_id,
        from_stage_id: card.stage_id,
        to_stage_id: card.stage_id,
        method: 'kanban',
      });

      toast({
        title: 'Lead chamado!',
        description: `${card.model_name} foi chamado no painel`,
      });
    } catch (error) {
      console.error('Error calling lead:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível chamar o lead',
        variant: 'destructive',
      });
    }
  };

  // Request final sync
  const handleFinalSyncRequest = (card: CardItem) => {
    if (onFinalSyncRequest) {
      onFinalSyncRequest(card);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-primary">Kanban (Etapas)</h1>
          <p className="text-muted-foreground">
            Arraste leads entre etapas. Cada etapa pode acionar um painel.
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={onCreateStageClick} className="bg-primary text-primary-foreground">
            <Plus className="w-4 h-4 mr-1" /> Nova Etapa
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-muted-foreground">Carregando...</div>
      ) : (
        <div className="flex gap-4 overflow-auto pb-4">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={onDragStart}
            onDragEnd={onDragEnd}
          >
            {stages.map((stage) => {
              const items = cardsByStage[stage.id] || [];
              return (
                <Card key={stage.id} className="min-w-[320px] border-border">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-primary">{stage.name}</CardTitle>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onStageFieldsClick?.(stage)}
                        title="Configurar campos personalizados"
                      >
                        <UsersIcon className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => onStageSettingsClick?.(stage)}
                        title="Configurações da etapa"
                      >
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <SortableContext
                      items={items.map((i) => i.id)}
                      strategy={verticalListSortingStrategy}
                    >
                      <div className="space-y-2">
                        {items.map((item) => (
                          <SortableCard
                            key={item.id}
                            item={item}
                            stageId={stage.id}
                            stages={stages}
                            onCallNow={handleCallNow}
                            onFinalSync={handleFinalSyncRequest}
                          />
                        ))}
                      </div>
                    </SortableContext>
                  </CardContent>
                </Card>
              );
            })}
          </DndContext>
        </div>
      )}

      {/* Custom Fields Modal */}
      <CustomFieldModal
        open={customFieldsModalOpen}
        onOpenChange={setCustomFieldsModalOpen}
        fields={customFieldsForStage}
        onSubmit={handleCustomFieldsSubmit}
      />
    </div>
  );
}
