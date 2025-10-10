import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { AlignLeft, AlignCenter, AlignRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

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

interface ElementPropertiesPanelProps {
  elementKey: string;
  config: ElementConfig;
  onUpdate: (updates: Partial<ElementConfig>) => void;
}

export function ElementPropertiesPanel({ elementKey, config, onUpdate }: ElementPropertiesPanelProps) {
  const isTextElement = ['modelName', 'room', 'time', 'calledAt'].includes(elementKey);
  const isImageElement = elementKey === 'modelPhoto';

  return (
    <div className="space-y-6 p-4">
      <div>
        <h3 className="text-lg font-bold text-gold mb-1">
          {elementKey === 'modelName' && 'Nome do Modelo'}
          {elementKey === 'modelPhoto' && 'Foto do Modelo'}
          {elementKey === 'room' && 'Sala'}
          {elementKey === 'time' && 'Relógio'}
          {elementKey === 'calledAt' && 'Horário da Chamada'}
        </h3>
        <p className="text-sm text-white/60">Edite as propriedades do elemento</p>
      </div>

      <Separator className="bg-gold/20" />

      {/* Position */}
      <div className="space-y-3">
        <Label className="text-gold font-semibold">Posição</Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-sm text-white/80">X</Label>
            <Input
              type="number"
              value={config.x}
              onChange={(e) => onUpdate({ x: parseInt(e.target.value) || 0 })}
              className="bg-white/5 border-gold/20 text-white"
            />
          </div>
          <div>
            <Label className="text-sm text-white/80">Y</Label>
            <Input
              type="number"
              value={config.y}
              onChange={(e) => onUpdate({ y: parseInt(e.target.value) || 0 })}
              className="bg-white/5 border-gold/20 text-white"
            />
          </div>
        </div>
      </div>

      {/* Size */}
      <div className="space-y-3">
        <Label className="text-gold font-semibold">Tamanho</Label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label className="text-sm text-white/80">Largura</Label>
            <Input
              type="number"
              value={config.width}
              onChange={(e) => onUpdate({ width: parseInt(e.target.value) || 0 })}
              className="bg-white/5 border-gold/20 text-white"
            />
          </div>
          <div>
            <Label className="text-sm text-white/80">Altura</Label>
            <Input
              type="number"
              value={config.height}
              onChange={(e) => onUpdate({ height: parseInt(e.target.value) || 0 })}
              className="bg-white/5 border-gold/20 text-white"
            />
          </div>
        </div>
      </div>

      {/* Typography (text elements only) */}
      {isTextElement && (
        <>
          <Separator className="bg-gold/20" />
          <div className="space-y-3">
            <Label className="text-gold font-semibold">Tipografia</Label>
            
            <div>
              <Label className="text-sm text-white/80">Família</Label>
              <Select 
                value={config.fontFamily} 
                onValueChange={(value) => onUpdate({ fontFamily: value })}
              >
                <SelectTrigger className="bg-white/5 border-gold/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Inter">Inter</SelectItem>
                  <SelectItem value="Poppins">Poppins</SelectItem>
                  <SelectItem value="Montserrat">Montserrat</SelectItem>
                  <SelectItem value="Playfair Display">Playfair Display</SelectItem>
                  <SelectItem value="Roboto">Roboto</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm text-white/80">Tamanho: {config.fontSize}px</Label>
              <Slider
                value={[config.fontSize || 16]}
                onValueChange={([value]) => onUpdate({ fontSize: value })}
                min={12}
                max={120}
                step={2}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-sm text-white/80">Peso</Label>
              <Select 
                value={config.fontWeight?.toString()} 
                onValueChange={(value) => onUpdate({ fontWeight: parseInt(value) })}
              >
                <SelectTrigger className="bg-white/5 border-gold/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="300">Light (300)</SelectItem>
                  <SelectItem value="400">Regular (400)</SelectItem>
                  <SelectItem value="600">SemiBold (600)</SelectItem>
                  <SelectItem value="700">Bold (700)</SelectItem>
                  <SelectItem value="900">Black (900)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-sm text-white/80">Cor</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="color"
                  value={config.color}
                  onChange={(e) => onUpdate({ color: e.target.value })}
                  className="w-16 h-10 p-1 bg-white/5 border-gold/20"
                />
                <Input
                  type="text"
                  value={config.color}
                  onChange={(e) => onUpdate({ color: e.target.value })}
                  className="flex-1 bg-white/5 border-gold/20 text-white"
                  placeholder="#FFD700"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm text-white/80">Alinhamento</Label>
              <div className="flex gap-2 mt-1">
                <Button
                  variant={config.textAlign === 'left' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onUpdate({ textAlign: 'left' })}
                  className="flex-1"
                >
                  <AlignLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant={config.textAlign === 'center' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onUpdate({ textAlign: 'center' })}
                  className="flex-1"
                >
                  <AlignCenter className="h-4 w-4" />
                </Button>
                <Button
                  variant={config.textAlign === 'right' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => onUpdate({ textAlign: 'right' })}
                  className="flex-1"
                >
                  <AlignRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Image styling (image elements only) */}
      {isImageElement && (
        <>
          <Separator className="bg-gold/20" />
          <div className="space-y-3">
            <Label className="text-gold font-semibold">Borda</Label>
            
            <div>
              <Label className="text-sm text-white/80">Largura: {config.borderWidth}px</Label>
              <Slider
                value={[config.borderWidth || 0]}
                onValueChange={([value]) => onUpdate({ borderWidth: value })}
                min={0}
                max={20}
                step={1}
                className="mt-2"
              />
            </div>

            <div>
              <Label className="text-sm text-white/80">Cor da Borda</Label>
              <div className="flex gap-2 mt-1">
                <Input
                  type="color"
                  value={config.borderColor}
                  onChange={(e) => onUpdate({ borderColor: e.target.value })}
                  className="w-16 h-10 p-1 bg-white/5 border-gold/20"
                />
                <Input
                  type="text"
                  value={config.borderColor}
                  onChange={(e) => onUpdate({ borderColor: e.target.value })}
                  className="flex-1 bg-white/5 border-gold/20 text-white"
                  placeholder="#FFD700"
                />
              </div>
            </div>

            <div>
              <Label className="text-sm text-white/80">Arredondamento</Label>
              <Select 
                value={config.borderRadius} 
                onValueChange={(value) => onUpdate({ borderRadius: value })}
              >
                <SelectTrigger className="bg-white/5 border-gold/20 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="0%">Quadrado</SelectItem>
                  <SelectItem value="8px">Levemente arredondado</SelectItem>
                  <SelectItem value="16px">Arredondado</SelectItem>
                  <SelectItem value="50%">Círculo</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}

      {/* Appearance */}
      <Separator className="bg-gold/20" />
      <div className="space-y-3">
        <Label className="text-gold font-semibold">Aparência</Label>
        
        <div className="flex items-center justify-between">
          <Label className="text-sm text-white/80">Visibilidade</Label>
          <Switch
            checked={config.visible}
            onCheckedChange={(checked) => onUpdate({ visible: checked })}
          />
        </div>

        <div>
          <Label className="text-sm text-white/80">Z-Index (Camada)</Label>
          <Input
            type="number"
            value={config.zIndex}
            onChange={(e) => onUpdate({ zIndex: parseInt(e.target.value) || 0 })}
            className="bg-white/5 border-gold/20 text-white mt-1"
            min={0}
            max={100}
          />
        </div>
      </div>
    </div>
  );
}
