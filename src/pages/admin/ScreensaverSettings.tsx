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
import { Loader2, Monitor, Sparkles, Image, Clock, Film, Trash2, Plus, Play, Volume2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { FullscreenVideo } from "@/components/checkin/FullscreenVideo";

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
  const navigate = useNavigate();

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

  // Fetch media items
  const { data: mediaItems = [], isLoading: isLoadingMedia } = useQuery({
    queryKey: ['screensaver-media-list'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('media')
        .select('*')
        .eq('is_active', true)
        .order('sort_order');
      
      if (error) throw error;
      return data || [];
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

  const deleteMediaMutation = useMutation({
    mutationFn: async (mediaId: string) => {
      const { error } = await supabase
        .from('media')
        .delete()
        .eq('id', mediaId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screensaver-media-list'] });
      queryClient.invalidateQueries({ queryKey: ['screensaver-media'] });
      toast.success('Mídia removida com sucesso!');
    },
    onError: (error) => {
      toast.error('Erro ao remover mídia: ' + error.message);
    },
  });

  const toggleMediaDisplayMode = useMutation({
    mutationFn: async ({ id, displayMode }: { id: string; displayMode: string }) => {
      const { error } = await supabase
        .from('media')
        .update({ display_mode: displayMode })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['screensaver-media-list'] });
      queryClient.invalidateQueries({ queryKey: ['screensaver-media'] });
      toast.success('Modo de exibição atualizado!');
    },
    onError: (error) => {
      toast.error('Erro ao atualizar modo: ' + error.message);
    },
  });

  const [transitionType, setTransitionType] = useState(config?.transition_type || 'random');
  const [slideDuration, setSlideDuration] = useState(config?.slide_duration_seconds || 8);
  const [enableParticles, setEnableParticles] = useState(config?.enable_particles ?? true);
  const [showBranding, setShowBranding] = useState(config?.show_branding ?? true);
  const [showQrCode, setShowQrCode] = useState(config?.show_qr_code ?? true);
  const [performanceMode, setPerformanceMode] = useState(config?.performance_mode || 'auto');
  const [tapMessage, setTapMessage] = useState(config?.tap_message || 'Toque para ativar');
  const [previewMedia, setPreviewMedia] = useState<{ url: string; title: string } | null>(null);

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

  const handleDeleteMedia = (mediaId: string) => {
    if (confirm('Tem certeza que deseja remover esta mídia?')) {
      deleteMediaMutation.mutate(mediaId);
    }
  };

  if (isLoading || isLoadingMedia) {
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

        {/* Gerenciar Mídias - Full Width */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Film className="w-5 h-5" />
                  Mídias do Screensaver
                </CardTitle>
                <CardDescription>
                  Gerencie as imagens e vídeos exibidos no screensaver
                </CardDescription>
              </div>
              <Button onClick={() => navigate('/admin/media')}>
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Mídia
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {mediaItems.length === 0 ? (
              <div className="text-center py-12">
                <Film className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">
                  Nenhuma mídia cadastrada
                </p>
                <Button onClick={() => navigate('/admin/media')}>
                  <Plus className="w-4 h-4 mr-2" />
                  Adicionar Primeira Mídia
                </Button>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {mediaItems.map((media) => (
                  <Card key={media.id} className="overflow-hidden">
                    <div 
                      className="relative aspect-video bg-muted cursor-pointer group"
                      onClick={() => media.type === 'video' && setPreviewMedia({ url: media.url, title: media.title || 'Preview' })}
                    >
                      {media.type === 'image' ? (
                        <img
                          src={media.url}
                          alt={media.title || 'Mídia'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="relative w-full h-full">
                          <video
                            src={media.url}
                            className="w-full h-full object-cover"
                            muted
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 transition-colors">
                            <Play className="w-12 h-12 text-white group-hover:scale-110 transition-transform" />
                          </div>
                        </div>
                      )}
                      
                      {/* Badge do modo */}
                      <div className="absolute top-2 right-2">
                        {media.display_mode === 'fullscreen-video' ? (
                          <Badge variant="default" className="bg-primary">
                            🎬 Fullscreen
                          </Badge>
                        ) : (
                          <Badge variant="secondary">
                            📸 Slideshow
                          </Badge>
                        )}
                      </div>
                    </div>
                    
                    <CardContent className="p-4 space-y-3">
                      <div>
                        <h4 className="font-medium truncate">
                          {media.title || 'Sem título'}
                        </h4>
                        <p className="text-xs text-muted-foreground">
                          {media.type === 'image' ? 'Imagem' : 'Vídeo'}
                        </p>
                      </div>

                      {/* Controles para vídeos */}
                      {media.type === 'video' && (
                        <div className="space-y-2">
                          <Label className="text-xs">Modo de Exibição</Label>
                          <Select
                            value={media.display_mode || 'slideshow'}
                            onValueChange={(value) =>
                              toggleMediaDisplayMode.mutate({
                                id: media.id,
                                displayMode: value,
                              })
                            }
                          >
                            <SelectTrigger className="h-8 text-xs">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="slideshow">
                                📸 Slideshow (com transições)
                              </SelectItem>
                              <SelectItem value="fullscreen-video">
                                🎬 Fullscreen Loop
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-xs text-muted-foreground">
                            {media.display_mode === 'fullscreen-video'
                              ? 'Vídeo em tela cheia sem transições'
                              : 'Vídeo no slideshow com transições'}
                          </p>
                        </div>
                      )}

                      <Button
                        variant="destructive"
                        size="sm"
                        className="w-full"
                        onClick={() => handleDeleteMedia(media.id)}
                        disabled={deleteMediaMutation.isPending}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Remover
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
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

      <Dialog open={!!previewMedia} onOpenChange={() => setPreviewMedia(null)}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-full h-full p-0 border-0 bg-black">
          <div className="w-full h-full aspect-video">
            {previewMedia && (
              <FullscreenVideo url={previewMedia.url} title={previewMedia.title} showControls={true} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
