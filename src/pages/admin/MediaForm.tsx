import { useState } from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface MediaFormProps {
  isOpen: boolean;
  onClose: () => void;
  panelId?: string;
}

export function MediaForm({ isOpen, onClose, panelId }: MediaFormProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [type, setType] = useState<'video' | 'image'>('video');
  const [displayMode, setDisplayMode] = useState<'slideshow' | 'fullscreen-video'>('slideshow');

  const createMedia = useMutation({
    mutationFn: async (data: { title: string; url: string; type: string; display_mode: string; panel_id?: string }) => {
      const { error } = await supabase.from('media').insert({
        title: data.title || 'Sem título',
        url: data.url,
        type: data.type,
        display_mode: data.display_mode,
        panel_id: data.panel_id || null,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media'] });
      toast({
        title: 'Mídia adicionada com sucesso',
      });
      handleClose();
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao adicionar mídia',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleClose = () => {
    setTitle('');
    setUrl('');
    setType('video');
    setDisplayMode('slideshow');
    onClose();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!url.trim()) {
      toast({
        title: 'URL é obrigatória',
        variant: 'destructive',
      });
      return;
    }

    // Validate: fullscreen-video only for video type
    if (displayMode === 'fullscreen-video' && type !== 'video') {
      toast({
        title: 'Modo tela cheia só é permitido para vídeos',
        variant: 'destructive',
      });
      return;
    }

    createMedia.mutate({
      title: title.trim(),
      url: url.trim(),
      type,
      display_mode: displayMode,
      panel_id: panelId,
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="bg-studio-dark border-gold/20">
        <DialogHeader>
          <DialogTitle className="text-gold">Adicionar Nova Mídia</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="title" className="text-white">
              Título
            </Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Nome da mídia"
              className="bg-black/40 border-gold/20 text-white"
            />
          </div>

          <div>
            <Label htmlFor="type" className="text-white">
              Tipo
            </Label>
            <Select value={type} onValueChange={(v: any) => setType(v)}>
              <SelectTrigger className="bg-black/40 border-gold/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-studio-dark border-gold/20">
                <SelectItem value="video">Vídeo (YouTube/Vimeo)</SelectItem>
                <SelectItem value="image">Imagem</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="url" className="text-white">
              URL *
            </Label>
            <Input
              id="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={
                type === 'video'
                  ? 'https://www.youtube.com/watch?v=...'
                  : 'https://example.com/image.jpg'
              }
              className="bg-black/40 border-gold/20 text-white"
              required
            />
            <p className="text-xs text-white/40 mt-1">
              {type === 'video'
                ? 'Cole o link do YouTube ou Vimeo'
                : 'Cole o link direto da imagem'}
            </p>
          </div>

          <div>
            <Label htmlFor="displayMode" className="text-white">
              Modo de Exibição
            </Label>
            <Select value={displayMode} onValueChange={(v: 'slideshow' | 'fullscreen-video') => setDisplayMode(v)}>
              <SelectTrigger className="bg-black/40 border-gold/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-studio-dark border-gold/20">
                <SelectItem value="slideshow">Slideshow com Transições Premium</SelectItem>
                <SelectItem value="fullscreen-video" disabled={type !== 'video'}>
                  🎬 Vídeo em Tela Cheia (apenas vídeos)
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-white/40 mt-1">
              {displayMode === 'slideshow' 
                ? 'Mídias com transições premium (Runway Walk, Bloom Fade, etc.)'
                : 'Vídeo em loop contínuo sem transições'}
            </p>
          </div>

          <Button
            type="submit"
            disabled={createMedia.isPending}
            className="w-full bg-gold hover:bg-gold/90 text-black"
          >
            {createMedia.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Adicionar Mídia'
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
