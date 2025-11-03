import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { performFinalSync } from '@/utils/bitrix/finalSync';
import { StageWebhookSettings } from '@/components/admin/StageWebhookSettings';
import { StageFieldsSettings } from '@/components/admin/StageFieldsSettings';
import { KanbanBoard as KanbanBoardComponent } from '@/components/kanban/KanbanBoard';

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

export default function KanbanBoard() {
  const { toast } = useToast();

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

  const handleCreateStage = async () => {
    const { data: stages } = await supabase
      .from('kanban_stages')
      .select('position')
      .order('position', { ascending: false })
      .limit(1);

    const position = stages && stages.length > 0 ? stages[0].position + 1 : 0;
    const { error } = await supabase
      .from('kanban_stages')
      .insert({ name: newStageName, position });

    if (!error) {
      setOpenCreateStage(false);
      setNewStageName('');
      toast({
        title: 'Etapa criada!',
        description: `A etapa "${newStageName}" foi criada com sucesso`,
      });
      // Reload will be handled by the KanbanBoard component
      window.location.reload();
    } else {
      toast({
        title: 'Erro ao criar etapa',
        variant: 'destructive',
      });
    }
  };

  // Request final sync
  const handleFinalSyncRequest = (card: CardItem) => {
    setFinalSyncCard(card);
    setFinalSyncNotes('');
    setFinalSyncStatus('COMPLETED');
    setFinalSyncOpen(true);
  };

  // Execute final sync
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
        title: 'Sincronização concluída!',
        description: `Lead ${finalSyncCard.lead_id} sincronizado com Bitrix`,
      });

      // Remove card from Kanban after sync
      const { error } = await supabase
        .from('kanban_cards')
        .delete()
        .eq('id', finalSyncCard.id);

      if (!error) {
        setFinalSyncOpen(false);
        setFinalSyncCard(null);
        // Reload to show updated cards
        window.location.reload();
      }
    } catch (error) {
      console.error('Error syncing:', error);
      toast({
        title: 'Erro na sincronização',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setSyncingFinal(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Kanban Board Component */}
      <KanbanBoardComponent
        onStageSettingsClick={(stage) => setStageSettingsOpen({ open: true, stage })}
        onStageFieldsClick={(stage) => setStageUsersOpen({ open: true, stage })}
        onCreateStageClick={() => setOpenCreateStage(true)}
        onFinalSyncRequest={handleFinalSyncRequest}
      />

      {/* Create Stage Dialog */}
      <Dialog open={openCreateStage} onOpenChange={setOpenCreateStage}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle className="text-primary">Nova Etapa</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <Input
              value={newStageName}
              onChange={(e) => setNewStageName(e.target.value)}
              placeholder="Nome da etapa"
              className="bg-input border-border text-foreground"
            />
            <Button onClick={handleCreateStage} className="bg-primary text-primary-foreground">
              Criar
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Configure Stage Fields Dialog */}
      <Dialog
        open={stageUsersOpen.open}
        onOpenChange={(o) => setStageUsersOpen({ open: o, stage: stageUsersOpen.stage })}
      >
        <DialogContent className="bg-card border-border max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-primary">
              Campos Personalizados: {stageUsersOpen.stage?.name}
            </DialogTitle>
          </DialogHeader>
          {stageUsersOpen.stage && <StageFieldsSettings stageId={stageUsersOpen.stage.id} />}
        </DialogContent>
      </Dialog>

      {/* Stage Settings Dialog (Webhook) */}
      <Dialog
        open={stageSettingsOpen.open}
        onOpenChange={(o) => setStageSettingsOpen({ open: o, stage: stageSettingsOpen.stage })}
      >
        <DialogContent className="bg-card border-border max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-primary">
              Configurações: {stageSettingsOpen.stage?.name}
            </DialogTitle>
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
                  toast({ title: 'Configurações salvas!' });
                  setStageSettingsOpen({ open: false });
                  window.location.reload();
                } else {
                  toast({ title: 'Erro ao salvar', variant: 'destructive' });
                }
              }}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* Final Sync Dialog */}
      <Dialog open={finalSyncOpen} onOpenChange={setFinalSyncOpen}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-primary">
              Concluir Fluxo e Sincronizar com Bitrix
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="p-4 bg-muted rounded border border-border">
              <p className="text-foreground text-sm mb-2">
                <strong>Lead:</strong> {finalSyncCard?.model_name || 'Sem nome'}
              </p>
              <p className="text-muted-foreground text-xs">ID: {finalSyncCard?.lead_id}</p>
            </div>

            <div>
              <label className="text-muted-foreground text-sm block mb-2">
                Status Final no Bitrix
              </label>
              <Input
                value={finalSyncStatus}
                onChange={(e) => setFinalSyncStatus(e.target.value)}
                placeholder="Ex: COMPLETED, MATERIAL_DELIVERED"
                className="bg-input border-border text-foreground"
              />
              <p className="text-muted-foreground text-xs mt-1">
                ID do status no Bitrix (ex: COMPLETED, CONVERTED, etc.)
              </p>
            </div>

            <div>
              <label className="text-muted-foreground text-sm block mb-2">
                Observações (opcional)
              </label>
              <Textarea
                value={finalSyncNotes}
                onChange={(e) => setFinalSyncNotes(e.target.value)}
                placeholder="Adicione observações sobre o atendimento..."
                className="bg-input border-border text-foreground min-h-[100px]"
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
                className="border-border text-foreground"
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