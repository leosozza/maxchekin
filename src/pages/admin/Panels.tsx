import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, Eye, Paintbrush, QrCode, Settings } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface Panel {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  is_active: boolean;
  default_layout: string;
  bitrix_stage_id: string | null;
}

export default function Panels() {
  const [panels, setPanels] = useState<Panel[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    loadPanels();
  }, []);

  const loadPanels = async () => {
    try {
      const { data, error } = await supabase
        .from('panels')
        .select('*')
        .order('name');

      if (error) throw error;
      setPanels(data || []);
    } catch (error: any) {
      toast({
        title: 'Erro ao carregar painéis',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja deletar este painel?')) return;

    try {
      const { error } = await supabase
        .from('panels')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast({
        title: 'Painel deletado',
        description: 'O painel foi removido com sucesso.',
      });

      loadPanels();
    } catch (error: any) {
      toast({
        title: 'Erro ao deletar painel',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  const handleToggleActive = async (panel: Panel) => {
    try {
      const { error } = await supabase
        .from('panels')
        .update({ is_active: !panel.is_active })
        .eq('id', panel.id);

      if (error) throw error;

      toast({
        title: panel.is_active ? 'Painel desativado' : 'Painel ativado',
      });

      loadPanels();
    } catch (error: any) {
      toast({
        title: 'Erro ao atualizar painel',
        description: error.message,
        variant: 'destructive',
      });
    }
  };

  if (loading) {
    return <div className="text-white">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gold mb-2">Painéis</h1>
          <p className="text-white/60">
            Gerenciar painéis de chamadas. Use o botão Ativar/Desativar para controlar quais painéis ficam visíveis.
          </p>
        </div>
        <Button
          onClick={() => navigate('/admin/panels/new')}
          className="bg-gold hover:bg-gold/90 text-black"
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Painel
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Check-in Panel (Special) */}
        <Card className="border-gold/20 bg-gradient-to-br from-gold/10 to-black/40 backdrop-blur-sm">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-gold" />
                <CardTitle className="text-gold">Painel de Boas-Vindas</CardTitle>
              </div>
              <Badge className="bg-gold/20 text-gold border-gold/30">
                Check-in
              </Badge>
            </div>
            <p className="text-sm text-white/60">Tela de entrada com scanner QR</p>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-white/80 mb-4">
              Configure os campos e layout da tela de check-in
            </p>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open('/checkin', '_blank')}
                className="border-gold/20"
                title="Visualizar"
              >
                <Eye className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/admin/checkin-settings')}
                className="border-gold/20"
                title="Configurar Tela de Boas-Vindas"
              >
                <Settings className="h-4 w-4 mr-1" />
                Tela de Boas-Vindas
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Dynamic Panels */}
        {panels.map((panel) => (
          <Card key={panel.id} className="border-gold/20 bg-black/40 backdrop-blur-sm">
            <CardHeader>
              <div className="flex justify-between items-start">
                <CardTitle className="text-gold">{panel.name}</CardTitle>
                <Badge 
                  variant={panel.is_active ? 'default' : 'secondary'}
                  className={panel.is_active ? 'bg-green-600' : 'bg-gray-600'}
                >
                  {panel.is_active ? 'Visível' : 'Oculto'}
                </Badge>
              </div>
              <p className="text-sm text-white/60">{panel.slug}</p>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-white/80 mb-4">
                {panel.description || 'Sem descrição'}
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(`/painel/${panel.slug}`, '_blank')}
                  className="border-gold/20"
                  title="Visualizar"
                >
                  <Eye className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/admin/panels/${panel.id}/editor`)}
                  className="border-gold/20"
                  title="Editor Visual"
                >
                  <Paintbrush className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => navigate(`/admin/panels/${panel.id}/edit`)}
                  className="border-gold/20"
                  title="Editar"
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant={panel.is_active ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleToggleActive(panel)}
                  className={panel.is_active 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'border-gold/20 hover:bg-gold/10'
                  }
                  title={panel.is_active ? 'Ocultar painel' : 'Tornar visível'}
                >
                  {panel.is_active ? '✓ Visível' : 'Mostrar'}
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleDelete(panel.id)}
                  title="Deletar"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {panels.length === 0 && (
        <Card className="border-gold/20 bg-black/40 backdrop-blur-sm">
          <CardContent className="text-center py-12">
            <p className="text-white/60 mb-4">Nenhum painel cadastrado</p>
            <Button
              onClick={() => navigate('/admin/panels/new')}
              className="bg-gold hover:bg-gold/90 text-black"
            >
              <Plus className="mr-2 h-4 w-4" />
              Criar Primeiro Painel
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
