import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Settings, Users as UsersIcon, Phone, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { performFinalSync } from '@/utils/bitrix/finalSync';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, arrayMove, useSortable,
} from '@dnd-kit/sortable';

type Stage = { id: string; name: string; position: number; panel_id: string | null; is_default: boolean };
type CardItem = { id: string; lead_id: string; model_name: string | null; responsible: string | null; stage_id: string; position: number };

function SortableCard({ item, stageId, stages, onMoveCard, onCallNow, onFinalSync }: { 
  item: CardItem; 
  stageId: string; 
  stages: Stage[];
  onMoveCard: (card: CardItem, toStageId: string, toIndex: number) => void;
  onCallNow: (card: CardItem) => void;
  onFinalSync: (card: CardItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

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
      className={`p-3 rounded bg-black/30 border border-gold/10 cursor-grab ${isDragging ? 'opacity-50' : ''}`}
    >
      <div className="text-white font-medium">{item.model_name || 'Sem nome'}</div>
      <div className="text-white/60 text-xs">Lead #{item.lead_id}</div>
      <div className="text-white/60 text-xs">Resp: {item.responsible || '—'}</div>

      {/* ações rápidas */}
      <div className="mt-2 flex flex-col gap-2">
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-gold/20 text-white hover:bg-gold/10 flex-1"
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
            className="bg-green-600 hover:bg-green-700 text-white w-full"
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
  const [stages, setStages] = useState<Stage[]>([]);
  const [cardsByStage, setCardsByStage] = useState<Record<string, CardItem[]>>({});
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  // modais
  const [openCreateStage, setOpenCreateStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [stageUsersOpen, setStageUsersOpen] = useState<{open: boolean; stage?: Stage}>({open:false});
  
  // modal de sync final
  const [finalSyncOpen, setFinalSyncOpen] = useState(false);
  const [finalSyncCard, setFinalSyncCard] = useState<CardItem | null>(null);
  const [finalSyncNotes, setFinalSyncNotes] = useState('');
  const [finalSyncStatus, setFinalSyncStatus] = useState('COMPLETED');
  const [syncingFinal, setSyncingFinal] = useState(false);

  const sensors = useSensors(useSensor(PointerSensor));

  async function loadData() {
    setLoading(true);
    try {
      const { data: s, error: es } = await supabase
        .from('kanban_stages').select('*').order('position', { ascending: true });
      if (es) throw es;

      const { data: c, error: ec } = await supabase
        .from('kanban_cards')
        .select('id,lead_id,model_name,responsible,stage_id,position')
        .order('position', { ascending: true });
      if (ec) throw ec;

      setStages((s || []) as Stage[]);
      const grouped: Record<string, CardItem[]> = {};
      (c || []).forEach((item: any) => {
        const key = item.stage_id;
        grouped[key] = grouped[key] || [];
        grouped[key].push(item);
      });
      setCardsByStage(grouped);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadData(); }, []);

  const onDragEnd = (event: DragEndEvent) => {
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
      const idx = items.findIndex(i => i.id === activeId);
      if (idx !== -1) {
        activeStageId = stageId;
        activeIndex = idx;
      }
      const idxOver = items.findIndex(i => i.id === overId);
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
      setCardsByStage(prev => ({ ...prev, [activeStageId]: updated }));
      // Persist
      supabase.from('kanban_cards').upsert(updated.map(r => ({ id: r.id, position: r.position })));
    } else {
      // Move to another stage
      const activeCard = cardsByStage[activeStageId][activeIndex];
      moveCardToStage(activeCard, overStageId, overIndex);
    }
  };

  // mover entre colunas
  const moveCardToStage = async (card: CardItem, toStageId: string, toIndex: number, byMethod: 'kanban' | 'checkin' = 'kanban') => {
    const fromStageId = card.stage_id;

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

    // persist - batch all position updates together
    const allUpdates = [
      ...fromListIndexed.map(r => ({ id: r.id, stage_id: fromStageId, position: r.position })),
      ...toListIndexed.map(r => ({ id: r.id, stage_id: toStageId, position: r.position }))
    ];
    
    if (allUpdates.length) {
      await supabase.from('kanban_cards').upsert(allUpdates);
    }

    // auditar
    await supabase.from('kanban_events').insert({
      lead_id: card.lead_id,
      from_stage_id: fromStageId,
      to_stage_id: toStageId,
      method: byMethod,
    });

    // chamar painel (se a coluna tiver panel_id vinculado)
    const targetStage = stages.find(s => s.id === toStageId);
    if (targetStage?.panel_id) {
      await supabase.from('calls').insert({
        panel_id: targetStage.panel_id,
        lead_id: card.lead_id,
        source: 'kanban',
        created_at: new Date().toISOString()
      });
      // Panel integration: panels managed in /admin/panels with realtime enabled (calls table)
    }
  };

  const handleCreateStage = async () => {
    const position = stages.length;
    const { data, error } = await supabase.from('kanban_stages').insert({ name: newStageName, position }).select('*').single();
    if (!error && data) {
      setStages(prev => [...prev, data as any]);
      setOpenCreateStage(false);
      setNewStageName('');
    }
  };

  // Chamar agora - insere em calls sem mover o card
  const handleCallNow = async (card: CardItem) => {
    try {
      const currentStage = stages.find(s => s.id === card.stage_id);
      if (!currentStage?.panel_id) {
        // Não há painel vinculado a esta etapa
        console.warn('Etapa atual não tem painel vinculado');
        return;
      }

      // Insere chamada no painel
      await supabase.from('calls').insert({
        panel_id: currentStage.panel_id,
        lead_id: card.lead_id,
        source: 'kanban_call_now',
        created_at: new Date().toISOString()
      });

      // Registra evento de auditoria
      await supabase.from('kanban_events').insert({
        lead_id: card.lead_id,
        from_stage_id: card.stage_id,
        to_stage_id: card.stage_id, // mesma etapa
        method: 'kanban',
      });

      console.log(`Lead ${card.lead_id} chamado no painel`);
    } catch (error) {
      console.error('Erro ao chamar lead:', error);
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
          <h1 className="text-3xl font-bold text-gold">Kanban (Etapas)</h1>
          <p className="text-white/60">Arraste leads entre etapas. Cada etapa pode acionar um painel.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setOpenCreateStage(true)} className="bg-gold text-black">
            <Plus className="w-4 h-4 mr-1" /> Nova Etapa
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="text-white/60">Carregando...</div>
      ) : (
        <div className="flex gap-4 overflow-auto pb-4">
          <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
            {stages.map(stage => {
              const items = cardsByStage[stage.id] || [];
              return (
                <Card key={stage.id} className="min-w-[320px] border-gold/20 bg-black/40 backdrop-blur-sm">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-gold">{stage.name}</CardTitle>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="border-gold/20 text-white"
                        onClick={() => setStageUsersOpen({open:true, stage})}>
                        <UsersIcon className="w-4 h-4" />
                      </Button>
                      <Button variant="outline" size="sm" className="border-gold/20 text-white">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
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
                      </div>
                    </SortableContext>
                  </CardContent>
                </Card>
              );
            })}
          </DndContext>
        </div>
      )}

      {/* Criar Etapa */}
      <Dialog open={openCreateStage} onOpenChange={setOpenCreateStage}>
        <DialogContent className="bg-studio-dark border-gold/20">
          <DialogHeader><DialogTitle className="text-gold">Nova Etapa</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <Input value={newStageName} onChange={e => setNewStageName(e.target.value)} placeholder="Nome da etapa" className="bg-black/20 border-gold/20 text-white"/>
            <Button onClick={handleCreateStage} className="bg-gold text-black">Criar</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Configurar Usuários da Etapa (check-in por usuário/etapa) */}
      <Dialog open={stageUsersOpen.open} onOpenChange={(o)=>setStageUsersOpen({open:o, stage: stageUsersOpen.stage})}>
        <DialogContent className="bg-studio-dark border-gold/20">
          <DialogHeader><DialogTitle className="text-gold">Usuários da etapa {stageUsersOpen.stage?.name}</DialogTitle></DialogHeader>
          {/* aqui você pode listar usuários do sistema e marcar os que operam essa etapa,
              salvando em public.kanban_stage_users */}
          <div className="text-white/60">Em construção: vincular usuários a esta etapa.</div>
        </DialogContent>
      </Dialog>

      {/* Modal de Sincronização Final */}
      <Dialog open={finalSyncOpen} onOpenChange={setFinalSyncOpen}>
        <DialogContent className="bg-studio-dark border-gold/20 max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-gold">Concluir Fluxo e Sincronizar com Bitrix</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="p-4 bg-black/20 rounded border border-gold/10">
              <p className="text-white text-sm mb-2">
                <strong>Lead:</strong> {finalSyncCard?.model_name || 'Sem nome'}
              </p>
              <p className="text-white/60 text-xs">
                ID: {finalSyncCard?.lead_id}
              </p>
            </div>

            <div>
              <label className="text-white/70 text-sm block mb-2">Status Final no Bitrix</label>
              <Input
                value={finalSyncStatus}
                onChange={(e) => setFinalSyncStatus(e.target.value)}
                placeholder="Ex: COMPLETED, MATERIAL_DELIVERED"
                className="bg-black/20 border-gold/20 text-white"
              />
              <p className="text-white/40 text-xs mt-1">
                ID do status no Bitrix (ex: COMPLETED, CONVERTED, etc.)
              </p>
            </div>

            <div>
              <label className="text-white/70 text-sm block mb-2">Observações (opcional)</label>
              <Textarea
                value={finalSyncNotes}
                onChange={(e) => setFinalSyncNotes(e.target.value)}
                placeholder="Adicione observações sobre o atendimento..."
                className="bg-black/20 border-gold/20 text-white min-h-[100px]"
              />
            </div>

            <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded">
              <p className="text-blue-300 text-xs">
                <strong>O que será sincronizado:</strong>
              </p>
              <ul className="text-blue-200 text-xs mt-2 space-y-1 list-disc list-inside">
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
                className="border-gold/20 text-white"
              >
                Cancelar
              </Button>
              <Button
                onClick={executeFinalSync}
                disabled={syncingFinal}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {syncingFinal ? 'Sincronizando...' : 'Confirmar e Sincronizar'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}