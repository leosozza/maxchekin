import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Copy, CheckCircle2 } from 'lucide-react';
import { useState } from 'react';
import { useToast } from '@/hooks/use-toast';

export default function Webhooks() {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  
  const webhookUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/bitrix-webhook`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast({
      title: 'URL copiada!',
      description: 'A URL do webhook foi copiada para a área de transferência.',
    });
    setTimeout(() => setCopied(false), 2000);
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
              defaultValue="https://maxsystem.bitrix24.com.br/rest/9/ia31i2r3aenevk0g"
              className="bg-black/20 border-gold/20 text-white font-mono text-sm"
              placeholder="https://sua-empresa.bitrix24.com.br/rest/..."
            />
          </div>

          <Button className="bg-gold hover:bg-gold/90 text-black">
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
