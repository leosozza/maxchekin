import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Monitor, Sparkles, Image, Clock } from "lucide-react";

const TRANSITION_OPTIONS = [
  { value: 'random', label: 'Aleatório (Recomendado)' },
  { value: 'runway-walk', label: 'Runway Walk - Efeito Passarela' },
  { value: 'bloom-fade', label: 'Bloom Fade - Desfoque Suave' },
  { value: 'chromatic-split', label: 'Chromatic Split - Efeito Cromático' },
  { value: 'parallax-deep', label: 'Parallax Deep - Profundidade 3D' },
  { value: 'vortex-spin', label: 'Vortex Spin - Rotação Vórtice' },
  { value: 'glass-morph', label: 'Glass Morph - Vidro Fosco' },
];

const PERFORMANCE_OPTIONS = [
  { value: 'auto', label: 'Automático (Recomendado)' },
  { value: 'enhanced', label: 'Alto - Máxima Qualidade' },
  { value: 'lite', label: 'Leve - Melhor Performance' },
];

export default function ScreensaverSettings() {
  const queryClient = useQueryClient();

  const { data: config, isLoading } = useQuery({
    queryKey: ['screensaver-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('screensaver_config')
        .select('*')
        .single();
      
      if (error) throw error;
      return data;
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (updates: any) => {
      const { error } = await supabase
        .from('screensaver_config')
        .update(updates)
        .eq('id', config?.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screensaver-config'] });
      toast.success('Configurações atualizadas com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao salvar configurações: ' + error.message);
    },
  });

  const [transitionType, setTransitionType] = useState(config?.transition_type || 'random');
  const [slideDuration, setSlideDuration] = useState(config?.slide_duration_seconds || 8);
  const [enableParticles, setEnableParticles] = useState(config?.enable_particles ?? true);
  const [showBranding, setShowBranding] = useState(config?.show_branding ?? true);
  const [showQrCode, setShowQrCode] = useState(config?.show_qr_code ?? true);
  const [performanceMode, setPerformanceMode] = useState(config?.performance_mode || 'auto');
  const [tapMessage, setTapMessage] = useState(config?.tap_message || 'Toque para ativar');

  // Update local state when config loads
  if (config && transitionType === 'random' && config.transition_type !== 'random') {
    setTransitionType(config.transition_type);
    setSlideDuration(config.slide_duration_seconds);
    setEnableParticles(config.enable_particles);
    setShowBranding(config.show_branding);
    setShowQrCode(config.show_qr_code);
    setPerformanceMode(config.performance_mode);
    setTapMessage(config.tap_message);
  }

  const handleSave = () => {
    updateMutation.mutate({
      transition_type: transitionType,
      slide_duration_seconds: slideDuration,
      enable_particles: enableParticles,
      show_branding: showBranding,
      show_qr_code: showQrCode,
      performance_mode: performanceMode,
      tap_message: tapMessage,
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Configurações de Screensaver</h1>
        <p className="text-muted-foreground">
          Personalize as animações e comportamento da tela de descanso
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Transições */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              Efeitos de Transição
            </CardTitle>
            <CardDescription>
              Configure o tipo de animação entre slides
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Transição</Label>
              <Select value={transitionType} onValueChange={setTransitionType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRANSITION_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Partículas Premium</Label>
                <p className="text-sm text-muted-foreground">
                  Efeitos de partículas douradas
                </p>
              </div>
              <Switch
                checked={enableParticles}
                onCheckedChange={setEnableParticles}
              />
            </div>
          </CardContent>
        </Card>

        {/* Tempo */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Temporização
            </CardTitle>
            <CardDescription>
              Configure o tempo de exibição de cada slide
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Duração do Slide (segundos)</Label>
              <Input
                type="number"
                min={3}
                max={60}
                value={slideDuration}
                onChange={(e) => setSlideDuration(parseInt(e.target.value))}
              />
              <p className="text-xs text-muted-foreground">
                Entre 3 e 60 segundos
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Branding */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Image className="w-5 h-5" />
              Elementos Visuais
            </CardTitle>
            <CardDescription>
              Configure logo e QR code na tela
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Mostrar Logo MaxFama</Label>
                <p className="text-sm text-muted-foreground">
                  Exibir logo no canto superior
                </p>
              </div>
              <Switch
                checked={showBranding}
                onCheckedChange={setShowBranding}
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>Mostrar QR Code</Label>
                <p className="text-sm text-muted-foreground">
                  Exibir QR code de ativação
                </p>
              </div>
              <Switch
                checked={showQrCode}
                onCheckedChange={setShowQrCode}
              />
            </div>

            <div className="space-y-2">
              <Label>Mensagem de Ativação</Label>
              <Input
                value={tapMessage}
                onChange={(e) => setTapMessage(e.target.value)}
                placeholder="Toque para ativar"
              />
            </div>
          </CardContent>
        </Card>

        {/* Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Monitor className="w-5 h-5" />
              Performance
            </CardTitle>
            <CardDescription>
              Ajuste a qualidade dos efeitos visuais
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Modo de Performance</Label>
              <Select value={performanceMode} onValueChange={setPerformanceMode}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PERFORMANCE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Automático detecta a capacidade do dispositivo
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button
          onClick={handleSave}
          disabled={updateMutation.isPending}
          size="lg"
        >
          {updateMutation.isPending && (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          )}
          Salvar Configurações
        </Button>
      </div>
    </div>
  );
}
