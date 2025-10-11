import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Image, Video } from 'lucide-react';
import { MediaForm } from './MediaForm';

export default function Media() {
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { data: media, isLoading } = useQuery({
    queryKey: ['media'],
    queryFn: async () => {
      const { data } = await supabase
        .from('media')
        .select('*')
        .order('created_at', { ascending: false });
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gold mb-2">Mídias</h1>
          <p className="text-white/60">Gerenciar vídeos e fotos dos painéis</p>
        </div>
        <Button
          onClick={() => setIsFormOpen(true)}
          className="bg-gold hover:bg-gold/90 text-black"
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Mídia
        </Button>
      </div>

      {isLoading ? (
        <div className="text-center py-12 text-white/60">Carregando...</div>
      ) : !media || media.length === 0 ? (
        <Card className="border-gold/20 bg-black/40 backdrop-blur-sm">
          <CardContent className="text-center py-12">
            <p className="text-white/60 mb-4">Nenhuma mídia cadastrada</p>
            <p className="text-sm text-white/40">
              Adicione links de vídeos do YouTube/Vimeo ou imagens
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {media.map((item) => (
            <Card key={item.id} className="border-gold/20 bg-black/40 backdrop-blur-sm">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  {item.type === 'video' ? (
                    <Video className="w-5 h-5 text-gold flex-shrink-0" />
                  ) : (
                    <Image className="w-5 h-5 text-gold flex-shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-white font-medium truncate">
                      {item.title || 'Sem título'}
                    </h3>
                    <p className="text-xs text-white/40 truncate">{item.url}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <MediaForm isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} />
    </div>
  );
}
