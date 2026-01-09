import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useTheme, type ThemeMode } from '@/hooks/useTheme';
import { Sun, Moon, Palette } from 'lucide-react';
import { Motion } from '@/components/ui/motion';

export default function Settings() {
  const { theme, setTheme } = useTheme();

  const themes: { value: ThemeMode; label: string; description: string; icon: typeof Sun }[] = [
    { 
      value: 'blue-pink', 
      label: 'Blue-Pink', 
      description: 'Tema principal com gradiente azul e rosa vibrante',
      icon: Palette 
    },
    { 
      value: 'dark', 
      label: 'Escuro', 
      description: 'Tema escuro com tons azulados',
      icon: Moon 
    },
    { 
      value: 'light', 
      label: 'Claro', 
      description: 'Tema claro com acentos coloridos',
      icon: Sun 
    },
  ];

  return (
    <Motion preset="fadeIn" className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary mb-2">Configurações</h1>
        <p className="text-muted-foreground">Configurações gerais do sistema</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aparência</CardTitle>
          <CardDescription>
            Escolha o tema da interface
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <RadioGroup value={theme} onValueChange={(value) => setTheme(value as ThemeMode)}>
            {themes.map((t) => {
              const Icon = t.icon;
              return (
                <div key={t.value} className="flex items-start space-x-3 p-4 border rounded-lg hover:bg-accent/5 cursor-pointer transition-colors">
                  <RadioGroupItem value={t.value} id={t.value} className="mt-1" />
                  <div className="flex-1">
                    <Label htmlFor={t.value} className="flex items-center gap-2 cursor-pointer font-medium">
                      <Icon className="h-4 w-4" />
                      {t.label}
                    </Label>
                    <p className="text-sm text-muted-foreground mt-1">{t.description}</p>
                  </div>
                </div>
              );
            })}
          </RadioGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Informações da Empresa</CardTitle>
          <CardDescription>
            Dados básicos da sua empresa
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Nome da Empresa</Label>
            <Input defaultValue="MaxFama" />
          </div>

          <div className="space-y-2">
            <Label>Email para Alertas</Label>
            <Input type="email" placeholder="admin@maxfama.com" />
          </div>

          <Button>Salvar Alterações</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Configurações de Check-in</CardTitle>
          <CardDescription>
            Ajuste o comportamento do sistema de check-in
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Tempo de Auto-Reset (segundos)</Label>
            <Input type="number" defaultValue="5" />
            <p className="text-xs text-muted-foreground">
              Tempo para retornar à tela inicial após check-in
            </p>
          </div>

          <div className="space-y-2">
            <Label>Tempo Máximo de Chamada (minutos)</Label>
            <Input type="number" defaultValue="60" />
            <p className="text-xs text-muted-foreground">
              Tempo para marcar chamada como expirada
            </p>
          </div>

          <Button>Salvar Configurações</Button>
        </CardContent>
      </Card>
    </Motion>
  );
}
