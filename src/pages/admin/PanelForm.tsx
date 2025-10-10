import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

export default function PanelForm() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    description: '',
    icon: 'monitor',
    is_active: true,
    bitrix_stage_id: '',
    default_layout: 'clean',
  });

  useEffect(() => {
    if (id) {
      loadPanel();
    }
  }, [id]);

  const loadPanel = async () => {
    try {
      const { data, error } = await supabase
        .from('panels')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setFormData(data);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar painel',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const slug = formData.slug || generateSlug(formData.name);

      if (id) {
        const { error } = await supabase
          .from('panels')
          .update({ ...formData, slug })
          .eq('id', id);

        if (error) throw error;

        toast({
          title: 'Painel atualizado',
          description: 'As alterações foram salvas com sucesso.',
        });
      } else {
        const { error } = await supabase
          .from('panels')
          .insert([{ ...formData, slug }]);

        if (error) throw error;

        toast({
          title: 'Painel criado',
          description: 'O novo painel foi criado com sucesso.',
        });
      }

      navigate('/admin/panels');
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar painel',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold mb-2">
          {id ? 'Editar Painel' : 'Novo Painel'}
        </h1>
        <p className="text-white/60">
          {id ? 'Edite as informações do painel' : 'Crie um novo painel de chamadas'}
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card className="border-gold/20 bg-black/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-gold">Informações Básicas</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-white/80">Nome do Painel *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => {
                  setFormData({ ...formData, name: e.target.value });
                  if (!id && !formData.slug) {
                    setFormData(prev => ({ ...prev, slug: generateSlug(e.target.value) }));
                  }
                }}
                required
                className="bg-black/20 border-gold/20 text-white"
                placeholder="Ex: Estúdio A"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="slug" className="text-white/80">Slug (URL)</Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                className="bg-black/20 border-gold/20 text-white"
                placeholder="estudio-a"
              />
              <p className="text-xs text-white/40">
                URL: /painel/{formData.slug || 'slug'}
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="text-white/80">Descrição</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-black/20 border-gold/20 text-white"
                placeholder="Descrição do painel..."
                rows={3}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="layout" className="text-white/80">Layout Padrão</Label>
              <Select
                value={formData.default_layout}
                onValueChange={(value) => setFormData({ ...formData, default_layout: value })}
              >
                <SelectTrigger className="bg-black/20 border-gold/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="clean">Clean (Minimalista)</SelectItem>
                  <SelectItem value="video">Video (Vídeo de Fundo)</SelectItem>
                  <SelectItem value="gallery">Gallery (Slideshow)</SelectItem>
                  <SelectItem value="split">Split (Dividido)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bitrix_stage_id" className="text-white/80">ID da Etapa Bitrix</Label>
              <Input
                id="bitrix_stage_id"
                value={formData.bitrix_stage_id}
                onChange={(e) => setFormData({ ...formData, bitrix_stage_id: e.target.value })}
                className="bg-black/20 border-gold/20 text-white"
                placeholder="ESTUDIO_A"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-white/80">Painel Ativo</Label>
                <p className="text-xs text-white/40">
                  Painéis inativos não recebem chamadas
                </p>
              </div>
              <Switch
                checked={formData.is_active}
                onCheckedChange={(checked) => setFormData({ ...formData, is_active: checked })}
              />
            </div>
          </CardContent>
        </Card>

        <div className="flex gap-4 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/admin/panels')}
            className="border-gold/20"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={loading}
            className="bg-gold hover:bg-gold/90 text-black"
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Painel'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
