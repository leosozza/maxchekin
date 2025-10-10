import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

export default function FieldMapping() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gold mb-2">Mapeamento de Campos</h1>
        <p className="text-white/60">Mapear campos do Bitrix24 para o MaxCheckin</p>
      </div>

      <Card className="border-gold/20 bg-black/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-gold">Campos do Sistema</CardTitle>
          <CardDescription className="text-white/60">
            Configure quais campos do Bitrix24 correspondem aos dados do MaxCheckin
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label className="text-white/80">Nome do Modelo</Label>
            <Select defaultValue="NAME">
              <SelectTrigger className="bg-black/20 border-gold/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="NAME">NAME (Nome)</SelectItem>
                <SelectItem value="TITLE">TITLE (Título)</SelectItem>
                <SelectItem value="UF_CRM_NAME">UF_CRM_NAME (Campo Customizado)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-white/80">Foto do Modelo</Label>
            <Select defaultValue="UF_CRM_PHOTO">
              <SelectTrigger className="bg-black/20 border-gold/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UF_CRM_PHOTO">UF_CRM_PHOTO</SelectItem>
                <SelectItem value="UF_CRM_IMAGE">UF_CRM_IMAGE</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-white/80">Responsável</Label>
            <Select defaultValue="ASSIGNED_BY">
              <SelectTrigger className="bg-black/20 border-gold/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ASSIGNED_BY">ASSIGNED_BY (Responsável)</SelectItem>
                <SelectItem value="CREATED_BY">CREATED_BY (Criado por)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-white/80">Sala/Estúdio</Label>
            <Select defaultValue="UF_CRM_ROOM">
              <SelectTrigger className="bg-black/20 border-gold/20 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="UF_CRM_ROOM">UF_CRM_ROOM</SelectItem>
                <SelectItem value="STAGE_ID">STAGE_ID (Etapa)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Button className="bg-gold hover:bg-gold/90 text-black">
            Salvar Mapeamento
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
