import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Rnd } from 'react-rnd';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ArrowLeft, Save, RotateCcw, Maximize2, ZoomIn, ZoomOut } from 'lucide-react';
import { ElementPropertiesPanel } from '@/components/admin/ElementPropertiesPanel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ElementConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: number;
  fontFamily?: string;
  fontWeight?: number;
  color?: string;
  textAlign?: string;
  visible: boolean;
  zIndex: number;
  borderRadius?: string;
  borderWidth?: number;
  borderColor?: string;
}

interface LayoutElements {
  [key: string]: ElementConfig;
}

const DEFAULT_ELEMENTS: LayoutElements = {
  modelName: { x: 360, y: 400, width: 1200, height: 150, fontSize: 96, fontFamily: 'Inter', fontWeight: 700, color: '#FFD700', textAlign: 'center', visible: true, zIndex: 10 },
  modelPhoto: { x: 760, y: 100, width: 400, height: 400, borderRadius: '50%', borderWidth: 6, borderColor: '#FFD700', visible: true, zIndex: 20 },
  room: { x: 760, y: 600, width: 400, height: 80, fontSize: 48, fontFamily: 'Inter', fontWeight: 600, color: '#FFD700', textAlign: 'center', visible: true, zIndex: 10 },
  time: { x: 50, y: 50, width: 300, height: 60, fontSize: 32, fontFamily: 'Inter', fontWeight: 400, color: '#FFFFFF', visible: true, zIndex: 5 },
  calledAt: { x: 710, y: 750, width: 500, height: 50, fontSize: 28, fontFamily: 'Inter', fontWeight: 400, color: '#FFFFFF99', textAlign: 'center', visible: true, zIndex: 5 }
};

export default function PanelLayoutEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [panel, setPanel] = useState<any>(null);
  const [elements, setElements] = useState<LayoutElements>(DEFAULT_ELEMENTS);
  const [selectedElement, setSelectedElement] = useState<string | null>('modelName');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('landscape');
  const [zoom, setZoom] = useState(0.5);
  const [canvasSize, setCanvasSize] = useState({ width: 1920, height: 1080 });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadPanel();
    loadLayout();
  }, [id]);

  const loadPanel = async () => {
    const { data, error } = await supabase
      .from('panels')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      toast.error('Erro ao carregar painel');
      navigate('/admin/panels');
      return;
    }

    setPanel(data);
  };

  const loadLayout = async () => {
    const { data } = await supabase
      .from('panel_layouts')
      .select('*')
      .eq('panel_id', id)
      .maybeSingle();

    if (data) {
      setElements(data.elements as unknown as LayoutElements);
      setOrientation(data.orientation as 'portrait' | 'landscape');
      setCanvasSize({ width: data.canvas_width, height: data.canvas_height });
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const { data: existing } = await supabase
        .from('panel_layouts')
        .select('id')
        .eq('panel_id', id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('panel_layouts')
          .update({
            elements: elements as any,
            orientation,
            canvas_width: canvasSize.width,
            canvas_height: canvasSize.height
          })
          .eq('panel_id', id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('panel_layouts')
          .insert({
            panel_id: id,
            elements: elements as any,
            orientation,
            canvas_width: canvasSize.width,
            canvas_height: canvasSize.height
          });

        if (error) throw error;
      }

      toast.success('Layout salvo com sucesso!');
    } catch (error) {
      console.error('Error saving layout:', error);
      toast.error('Erro ao salvar layout');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    if (confirm('Tem certeza que deseja resetar para o layout padrão?')) {
      setElements(DEFAULT_ELEMENTS);
      setOrientation('landscape');
      toast.info('Layout resetado para o padrão');
    }
  };

  const updateElement = (key: string, updates: Partial<ElementConfig>) => {
    setElements(prev => ({
      ...prev,
      [key]: { ...prev[key], ...updates }
    }));
  };

  const handlePreview = () => {
    window.open(`/painel/${panel?.slug}`, '_blank');
  };

  if (!panel) {
    return <div className="flex items-center justify-center h-screen text-white">Carregando...</div>;
  }

  return (
    <div className="h-screen flex flex-col bg-studio-dark">
      {/* Toolbar */}
      <div className="h-16 bg-black/40 border-b border-gold/20 flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/admin/panels')} className="text-gold">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <Separator orientation="vertical" className="h-8 bg-gold/20" />
          <h1 className="text-xl font-bold text-gold">{panel.name} - Editor Visual</h1>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Label className="text-white/80 text-sm">Orientação:</Label>
            <Select value={orientation} onValueChange={(v: any) => setOrientation(v)}>
              <SelectTrigger className="w-40 bg-white/5 border-gold/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="landscape">Horizontal (16:9)</SelectItem>
                <SelectItem value="portrait">Vertical (9:16)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator orientation="vertical" className="h-8 bg-gold/20" />

          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setZoom(Math.max(0.25, zoom - 0.25))}>
              <ZoomOut className="h-4 w-4" />
            </Button>
            <span className="text-white/80 text-sm w-12 text-center">{Math.round(zoom * 100)}%</span>
            <Button variant="outline" size="sm" onClick={() => setZoom(Math.min(1, zoom + 0.25))}>
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>

          <Separator orientation="vertical" className="h-8 bg-gold/20" />

          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Resetar
          </Button>

          <Button variant="outline" size="sm" onClick={handlePreview}>
            <Maximize2 className="h-4 w-4 mr-2" />
            Preview
          </Button>

          <Button size="sm" onClick={handleSave} disabled={loading} className="bg-gold text-black hover:bg-gold/90">
            <Save className="h-4 w-4 mr-2" />
            {loading ? 'Salvando...' : 'Salvar Layout'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Canvas */}
        <div className="flex-1 overflow-auto bg-studio-dark/50 p-8">
          <div className="flex items-center justify-center min-h-full">
            <div
              style={{
                width: canvasSize.width * zoom,
                height: canvasSize.height * zoom,
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
              }}
              className="relative bg-gradient-to-br from-studio-dark via-background to-studio-dark shadow-2xl"
            >
              {/* Grid background */}
              <div
                className="absolute inset-0 opacity-10"
                style={{
                  backgroundImage: 'linear-gradient(#FFD700 1px, transparent 1px), linear-gradient(90deg, #FFD700 1px, transparent 1px)',
                  backgroundSize: '50px 50px'
                }}
              />

              {/* Model Name */}
              {elements.modelName?.visible && (
                <Rnd
                  size={{ width: elements.modelName.width, height: elements.modelName.height }}
                  position={{ x: elements.modelName.x, y: elements.modelName.y }}
                  onDragStop={(e, d) => updateElement('modelName', { x: d.x, y: d.y })}
                  onResizeStop={(e, direction, ref, delta, position) => {
                    updateElement('modelName', {
                      width: parseInt(ref.style.width),
                      height: parseInt(ref.style.height),
                      ...position
                    });
                  }}
                  bounds="parent"
                  onClick={() => setSelectedElement('modelName')}
                  className={`border-2 ${selectedElement === 'modelName' ? 'border-gold' : 'border-transparent hover:border-gold/50'} transition-colors`}
                  style={{
                    fontSize: elements.modelName.fontSize,
                    fontFamily: elements.modelName.fontFamily,
                    fontWeight: elements.modelName.fontWeight,
                    color: elements.modelName.color,
                    textAlign: elements.modelName.textAlign as any,
                    zIndex: elements.modelName.zIndex,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: elements.modelName.textAlign === 'center' ? 'center' : elements.modelName.textAlign === 'right' ? 'flex-end' : 'flex-start',
                  }}
                >
                  Ana Silva
                </Rnd>
              )}

              {/* Model Photo */}
              {elements.modelPhoto?.visible && (
                <Rnd
                  size={{ width: elements.modelPhoto.width, height: elements.modelPhoto.height }}
                  position={{ x: elements.modelPhoto.x, y: elements.modelPhoto.y }}
                  onDragStop={(e, d) => updateElement('modelPhoto', { x: d.x, y: d.y })}
                  onResizeStop={(e, direction, ref, delta, position) => {
                    updateElement('modelPhoto', {
                      width: parseInt(ref.style.width),
                      height: parseInt(ref.style.height),
                      ...position
                    });
                  }}
                  bounds="parent"
                  onClick={() => setSelectedElement('modelPhoto')}
                  className={`border-2 ${selectedElement === 'modelPhoto' ? 'border-gold' : 'border-transparent hover:border-gold/50'} transition-colors`}
                  style={{ zIndex: elements.modelPhoto.zIndex }}
                >
                  <div
                    className="w-full h-full bg-gradient-to-br from-gold/30 to-gold/10 flex items-center justify-center text-gold/50"
                    style={{
                      borderRadius: elements.modelPhoto.borderRadius,
                      border: `${elements.modelPhoto.borderWidth}px solid ${elements.modelPhoto.borderColor}`,
                    }}
                  >
                    FOTO
                  </div>
                </Rnd>
              )}

              {/* Room */}
              {elements.room?.visible && (
                <Rnd
                  size={{ width: elements.room.width, height: elements.room.height }}
                  position={{ x: elements.room.x, y: elements.room.y }}
                  onDragStop={(e, d) => updateElement('room', { x: d.x, y: d.y })}
                  onResizeStop={(e, direction, ref, delta, position) => {
                    updateElement('room', {
                      width: parseInt(ref.style.width),
                      height: parseInt(ref.style.height),
                      ...position
                    });
                  }}
                  bounds="parent"
                  onClick={() => setSelectedElement('room')}
                  className={`border-2 ${selectedElement === 'room' ? 'border-gold' : 'border-transparent hover:border-gold/50'} transition-colors`}
                  style={{
                    fontSize: elements.room.fontSize,
                    fontFamily: elements.room.fontFamily,
                    fontWeight: elements.room.fontWeight,
                    color: elements.room.color,
                    textAlign: elements.room.textAlign as any,
                    zIndex: elements.room.zIndex,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: elements.room.textAlign === 'center' ? 'center' : elements.room.textAlign === 'right' ? 'flex-end' : 'flex-start',
                  }}
                >
                  Sala 5
                </Rnd>
              )}

              {/* Time */}
              {elements.time?.visible && (
                <Rnd
                  size={{ width: elements.time.width, height: elements.time.height }}
                  position={{ x: elements.time.x, y: elements.time.y }}
                  onDragStop={(e, d) => updateElement('time', { x: d.x, y: d.y })}
                  onResizeStop={(e, direction, ref, delta, position) => {
                    updateElement('time', {
                      width: parseInt(ref.style.width),
                      height: parseInt(ref.style.height),
                      ...position
                    });
                  }}
                  bounds="parent"
                  onClick={() => setSelectedElement('time')}
                  className={`border-2 ${selectedElement === 'time' ? 'border-gold' : 'border-transparent hover:border-gold/50'} transition-colors`}
                  style={{
                    fontSize: elements.time.fontSize,
                    fontFamily: elements.time.fontFamily,
                    fontWeight: elements.time.fontWeight,
                    color: elements.time.color,
                    zIndex: elements.time.zIndex,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  14:30:45
                </Rnd>
              )}

              {/* Called At */}
              {elements.calledAt?.visible && (
                <Rnd
                  size={{ width: elements.calledAt.width, height: elements.calledAt.height }}
                  position={{ x: elements.calledAt.x, y: elements.calledAt.y }}
                  onDragStop={(e, d) => updateElement('calledAt', { x: d.x, y: d.y })}
                  onResizeStop={(e, direction, ref, delta, position) => {
                    updateElement('calledAt', {
                      width: parseInt(ref.style.width),
                      height: parseInt(ref.style.height),
                      ...position
                    });
                  }}
                  bounds="parent"
                  onClick={() => setSelectedElement('calledAt')}
                  className={`border-2 ${selectedElement === 'calledAt' ? 'border-gold' : 'border-transparent hover:border-gold/50'} transition-colors`}
                  style={{
                    fontSize: elements.calledAt.fontSize,
                    fontFamily: elements.calledAt.fontFamily,
                    fontWeight: elements.calledAt.fontWeight,
                    color: elements.calledAt.color,
                    textAlign: elements.calledAt.textAlign as any,
                    zIndex: elements.calledAt.zIndex,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: elements.calledAt.textAlign === 'center' ? 'center' : elements.calledAt.textAlign === 'right' ? 'flex-end' : 'flex-start',
                  }}
                >
                  Chamado às 14:25
                </Rnd>
              )}
            </div>
          </div>
        </div>

        {/* Properties Sidebar */}
        <div className="w-96 bg-black/40 border-l border-gold/20">
          <ScrollArea className="h-full">
            {selectedElement && (
              <ElementPropertiesPanel
                elementKey={selectedElement}
                config={elements[selectedElement]}
                onUpdate={(updates) => updateElement(selectedElement, updates)}
              />
            )}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
