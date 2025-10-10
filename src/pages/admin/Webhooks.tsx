import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Copy, CheckCircle2, Loader2, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

export default function Webhooks() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const [bitrixUrl, setBitrixUrl] = useState('');
  const [notifyOnCheckin, setNotifyOnCheckin] = useState(true);
  const [notifyOnCall, setNotifyOnCall] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bitrix-webhook`;

  const { data: config, refetch } = useQuery({
    queryKey: ['webhook-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('webhook_config')
        .select('*')
        .eq('is_active', true)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    }
  });

  useEffect(() => {
    if (config) {
      setBitrixUrl(config.bitrix_webhook_url || '');
      setNotifyOnCheckin(config.notify_on_checkin ?? true);
      setNotifyOnCall(config.notify_on_call ?? true);
    }
  }, [config]);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast({
      title: 'URL copiada!',
      description: 'A URL do webhook foi copiada para a área de transferência.',
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    if (!bitrixUrl.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite uma URL válida do Bitrix24',
        variant: 'destructive',
      });
      return;
    }

    setIsSaving(true);

    const { error } = await supabase
      .from('webhook_config')
      .upsert({
        bitrix_webhook_url: bitrixUrl,
        notify_on_checkin: notifyOnCheckin,
        notify_on_call: notifyOnCall,
        is_active: true,
      });

    setIsSaving(false);

    if (error) {
      toast({
        title: 'Erro ao salvar',
        description: error.message,
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Configurações salvas!',
      description: 'A URL do webhook foi configurada com sucesso',
    });

    refetch();
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold mb-2">Webhooks</h1>
        <p className="text-white/60">Configurar integração com Bitrix24</p>
      </div>

      <Card className="border-gold/20 bg-black/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-gold">Webhook de Entrada (Receber Chamadas)</CardTitle>
          <CardDescription className="text-white/60">
            Use esta URL para configurar o webhook no Bitrix24
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white/80">URL do Webhook</Label>
            <div className="flex gap-2">
              <Input
                value={webhookUrl}
                readOnly
                className="bg-black/20 border-gold/20 text-white font-mono text-sm"
              />
              <Button
                onClick={copyToClipboard}
                variant="outline"
                className="border-gold/20"
              >
                {copied ? (
                  <CheckCircle2 className="h-4 w-4 text-green-400" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>

          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-4">
            <h4 className="text-sm font-semibold text-blue-400 mb-2">Como configurar no Bitrix24:</h4>
            <ol className="text-sm text-white/70 space-y-1 list-decimal list-inside">
              <li>Acesse Configurações → Automação → Webhooks</li>
              <li>Crie um novo webhook de saída</li>
              <li>Cole a URL acima no campo de destino</li>
              <li>Configure para disparar quando um lead mudar de etapa</li>
            </ol>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gold/20 bg-black/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-gold">Webhook de Saída (Notificar Bitrix)</CardTitle>
          <CardDescription className="text-white/60">
            URL base do Bitrix24 para enviar atualizações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white/80">URL Base Bitrix24</Label>
            <Input
              value={bitrixUrl}
              onChange={(e) => setBitrixUrl(e.target.value)}
              className="bg-black/20 border-gold/20 text-white font-mono text-sm"
              placeholder="https://sua-empresa.bitrix24.com.br/rest/..."
            />
            <p className="text-xs text-white/40">
              Exemplo: https://maxsystem.bitrix24.com.br/rest/9/ia31i2r3aenevk0g
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-white/80">Notificar no Check-in</Label>
                <p className="text-xs text-white/40">
                  Atualizar campo "Presença Confirmada" no Bitrix ao fazer check-in
                </p>
              </div>
              <Switch
                checked={notifyOnCheckin}
                onCheckedChange={setNotifyOnCheckin}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-white/80">Notificar ao Chamar Modelo</Label>
                <p className="text-xs text-white/40">
                  Atualizar status no Bitrix quando chamar modelo no painel
                </p>
              </div>
              <Switch
                checked={notifyOnCall}
                onCheckedChange={setNotifyOnCall}
              />
            </div>
          </div>

          <Button 
            onClick={handleSave}
            disabled={isSaving}
            className="bg-gold hover:bg-gold/90 text-black"
          >
            {isSaving ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                Salvar Configurações
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
