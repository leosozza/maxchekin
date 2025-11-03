import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

type Stage = {
  id: string;
  name: string;
  webhook_url: string | null;
  webhook_on_enter: boolean;
  webhook_on_exit: boolean;
  panel_id: string | null;
};

type StageWebhookSettingsProps = {
  stage: Stage;
  onSave: (updates: {
    webhook_url: string | null;
    webhook_on_enter: boolean;
    webhook_on_exit: boolean;
    panel_id: string | null;
  }) => void;
};

export function StageWebhookSettings({ stage, onSave }: StageWebhookSettingsProps) {
  const [webhookUrl, setWebhookUrl] = useState(stage.webhook_url || '');
  const [onEnter, setOnEnter] = useState(stage.webhook_on_enter);
  const [onExit, setOnExit] = useState(stage.webhook_on_exit);
  const [panelId, setPanelId] = useState(stage.panel_id || '');

  const handleSave = () => {
    onSave({
      webhook_url: webhookUrl.trim() || null,
      webhook_on_enter: onEnter,
      webhook_on_exit: onExit,
      panel_id: panelId.trim() || null,
    });
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-blue-900/20 border border-blue-500/30 rounded">
        <p className="text-blue-300 text-sm mb-2">
          <strong>Webhook do Bitrix</strong>
        </p>
        <p className="text-blue-200 text-xs">
          Configure um webhook para atualizar o Bitrix automaticamente quando leads entrarem ou saírem desta etapa.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="text-white/70">URL do Webhook</Label>
        <Input
          value={webhookUrl}
          onChange={(e) => setWebhookUrl(e.target.value)}
          placeholder="https://seu-bitrix.com.br/webhook/..."
          className="bg-black/20 border-gold/20 text-white"
        />
        <p className="text-white/40 text-xs">
          URL completa do webhook do Bitrix que será chamado
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center space-x-2">
          <Checkbox
            id="on-enter"
            checked={onEnter}
            onCheckedChange={(checked) => setOnEnter(checked === true)}
          />
          <Label htmlFor="on-enter" className="text-white/70 cursor-pointer">
            Chamar webhook quando lead ENTRAR nesta etapa
          </Label>
        </div>

        <div className="flex items-center space-x-2">
          <Checkbox
            id="on-exit"
            checked={onExit}
            onCheckedChange={(checked) => setOnExit(checked === true)}
          />
          <Label htmlFor="on-exit" className="text-white/70 cursor-pointer">
            Chamar webhook quando lead SAIR desta etapa
          </Label>
        </div>
      </div>

      <div className="space-y-2">
        <Label className="text-white/70">ID do Painel (opcional)</Label>
        <Input
          value={panelId}
          onChange={(e) => setPanelId(e.target.value)}
          placeholder="UUID do painel de chamada"
          className="bg-black/20 border-gold/20 text-white"
        />
        <p className="text-white/40 text-xs">
          Se definido, ao mover um lead para esta etapa, ele será chamado automaticamente neste painel
        </p>
      </div>

      <div className="p-3 bg-yellow-900/20 border border-yellow-500/30 rounded">
        <p className="text-yellow-300 text-xs">
          <strong>Dados enviados ao webhook:</strong>
        </p>
        <pre className="text-yellow-200 text-xs mt-2 overflow-auto">
{`{
  "event": "enter" ou "exit",
  "lead_id": "123456",
  "stage_name": "${stage.name}",
  "timestamp": "2025-11-03T...",
  "model_name": "Nome da Modelo",
  "responsible": "Responsável",
  "room": "Sala"
}`}
        </pre>
      </div>

      <Button onClick={handleSave} className="bg-gold text-black w-full">
        Salvar Configurações
      </Button>
    </div>
  );
}
