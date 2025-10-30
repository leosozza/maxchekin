import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Plus, Settings, Users as UsersIcon } from 'lucide-react';
import {
  DndContext, closestCenter, PointerSensor, useSensor, useSensors,
} from '@dnd-kit/core';
import {
  SortableContext, verticalListSortingStrategy, arrayMove,
} from '@dnd-kit/sortable';

type Stage = { id: string; name: string; position: number; panel_id: string | null; is_default: boolean };
type CardItem = { id: string; lead_id: string; model_name: string | null; responsible: string | null; stage_id: string; position: number };

export default function KanbanBoard() {
  const [stages, setStages] = useState<Stage[]>([]);
  const [cardsByStage, setCardsByStage] = useState<Record<string, CardItem[]>>({});
  const [loading, setLoading] = useState(true);

  // modais
  const [openCreateStage, setOpenCreateStage] = useState(false);
  const [newStageName, setNewStageName] = useState('');
  const [stageUsersOpen, setStageUsersOpen] = useState<{open: boolean; stage?: Stage}>({open:false});

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

  // drag dentro da mesma coluna
  const onReorderWithinStage = async (stageId: string, fromIndex: number, toIndex: number) => {
    const items = cardsByStage[stageId] || [];
    const reordered = arrayMove(items, fromIndex, toIndex)
      .map((it, idx) => ({ ...it, position: idx }));
    setCardsByStage(prev => ({ ...prev, [stageId]: reordered }));
    // persist
    await supabase.from('kanban_cards')
      .upsert(reordered.map(r => ({ id: r.id, position: r.position })));
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

    // persist
    await supabase.from('kanban_cards').update({
      stage_id: toStageId, position: toIndex,
    }).eq('id', card.id);

    if (fromListIndexed.length) {
      await supabase.from('kanban_cards').upsert(fromListIndexed.map(r => ({ id: r.id, position: r.position })));
    }
    if (toListIndexed.length) {
      await supabase.from('kanban_cards').upsert(toListIndexed.map(r => ({ id: r.id, position: r.position })));
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
      // seus painéis já são gerenciados em /admin/panels e possuem realtime habilitado (tabela calls) :contentReference[oaicite:6]{index=6}
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
          <DndContext sensors={sensors} collisionDetection={closestCenter}>
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
                        {items.map((item, idx) => (
                          <div key={item.id} className="p-3 rounded bg-black/30 border border-gold/10">
                            <div className="text-white font-medium">{item.model_name || 'Sem nome'}</div>
                            <div className="text-white/60 text-xs">Lead #{item.lead_id}</div>
                            <div className="text-white/60 text-xs">Resp: {item.responsible || '—'}</div>

                            {/* ações rápidas */}
                            <div className="mt-2 flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-gold/20 text-white"
                                onClick={() => moveCardToStage(item, stage.id, idx+1)}
                              >
                                Abaixo
                              </Button>
                            </div>
                          </div>
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
    </div>
  );
}