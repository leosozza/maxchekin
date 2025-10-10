import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export default function Settings() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold mb-2">Configurações</h1>
        <p className="text-white/60">Configurações gerais do sistema</p>
      </div>

      <Card className="border-gold/20 bg-black/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-gold">Informações da Empresa</CardTitle>
          <CardDescription className="text-white/60">
            Dados básicos da sua empresa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white/80">Nome da Empresa</Label>
            <Input
              defaultValue="MaxFama"
              className="bg-black/20 border-gold/20 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-white/80">Email para Alertas</Label>
            <Input
              type="email"
              placeholder="admin@maxfama.com"
              className="bg-black/20 border-gold/20 text-white"
            />
          </div>

          <Button className="bg-gold hover:bg-gold/90 text-black">
            Salvar Alterações
          </Button>
        </CardContent>
      </Card>

      <Card className="border-gold/20 bg-black/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-gold">Configurações de Check-in</CardTitle>
          <CardDescription className="text-white/60">
            Ajuste o comportamento do sistema de check-in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-white/80">Tempo de Auto-Reset (segundos)</Label>
            <Input
              type="number"
              defaultValue="5"
              className="bg-black/20 border-gold/20 text-white"
            />
            <p className="text-xs text-white/40">
              Tempo para retornar à tela inicial após check-in
            </p>
          </div>

          <div className="space-y-2">
            <Label className="text-white/80">Tempo Máximo de Chamada (minutos)</Label>
            <Input
              type="number"
              defaultValue="60"
              className="bg-black/20 border-gold/20 text-white"
            />
            <p className="text-xs text-white/40">
              Tempo para marcar chamada como expirada
            </p>
          </div>

          <Button className="bg-gold hover:bg-gold/90 text-black">
            Salvar Configurações
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
