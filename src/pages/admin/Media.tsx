import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export default function Media() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gold mb-2">Mídias</h1>
          <p className="text-white/60">Gerenciar vídeos e fotos dos painéis</p>
        </div>
        <Button className="bg-gold hover:bg-gold/90 text-black">
          <Plus className="mr-2 h-4 w-4" />
          Nova Mídia
        </Button>
      </div>

      <Card className="border-gold/20 bg-black/40 backdrop-blur-sm">
        <CardContent className="text-center py-12">
          <p className="text-white/60 mb-4">Nenhuma mídia cadastrada</p>
          <p className="text-sm text-white/40">
            Faça upload de vídeos, fotos ou adicione links de streaming
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
