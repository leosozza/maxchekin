import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Download, Trash2, FileDown, Smartphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';

export default function ApkSettings() {
  const [apkInfo, setApkInfo] = useState<any>(null);
  const [uploading, setUploading] = useState(false);
  const [versionName, setVersionName] = useState('');
  const [versionCode, setVersionCode] = useState('');
  const { toast } = useToast();
  const { user } = useAuth();

  const loadCurrentApk = async () => {
    const { data } = await supabase
      .from('apk_config')
      .select('*')
      .eq('is_active', true)
      .single();
    
    if (data) {
      setApkInfo(data);
      setVersionName(data.version_name || '');
      setVersionCode(data.version_code?.toString() || '');
    }
  };

  useEffect(() => {
    loadCurrentApk();
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.apk')) {
      toast({
        title: "Arquivo inválido",
        description: "Por favor, selecione um arquivo APK válido.",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    try {
      if (apkInfo) {
        await supabase
          .from('apk_config')
          .update({ is_active: false })
          .eq('id', apkInfo.id);
        
        await supabase.storage
          .from('apk-files')
          .remove([apkInfo.file_path]);
      }

      const fileName = `maxcheckin-${Date.now()}.apk`;
      const filePath = `apks/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('apk-files')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { error: dbError } = await supabase
        .from('apk_config')
        .insert({
          file_name: file.name,
          file_path: filePath,
          file_size: file.size,
          version_name: versionName || null,
          version_code: versionCode ? parseInt(versionCode) : null,
          uploaded_by: user?.id,
          is_active: true
        });

      if (dbError) throw dbError;

      toast({
        title: "Upload concluído",
        description: "APK atualizado com sucesso!",
      });

      loadCurrentApk();
      e.target.value = '';
    } catch (error: any) {
      console.error('Erro no upload:', error);
      toast({
        title: "Erro no upload",
        description: error.message || "Não foi possível fazer upload do APK.",
        variant: "destructive",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteApk = async () => {
    if (!apkInfo) return;

    if (!confirm('Tem certeza que deseja remover o APK atual?')) return;

    try {
      await supabase.storage
        .from('apk-files')
        .remove([apkInfo.file_path]);

      await supabase
        .from('apk_config')
        .delete()
        .eq('id', apkInfo.id);

      toast({
        title: "APK removido",
        description: "O APK foi removido com sucesso.",
      });

      setApkInfo(null);
    } catch (error: any) {
      toast({
        title: "Erro ao remover",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDownload = () => {
    if (!apkInfo) return;

    const { data } = supabase.storage
      .from('apk-files')
      .getPublicUrl(apkInfo.file_path);

    if (data?.publicUrl) {
      window.open(data.publicUrl, '_blank');
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-primary mb-2">Gerenciar APK</h1>
        <p className="text-muted-foreground">
          Faça upload do APK do aplicativo móvel
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Smartphone className="w-5 h-5" />
            Upload de APK
          </CardTitle>
          <CardDescription>
            Faça upload do arquivo APK que será disponibilizado para download
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome da Versão</Label>
              <Input
                placeholder="Ex: 1.0.0"
                value={versionName}
                onChange={(e) => setVersionName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Código da Versão</Label>
              <Input
                type="number"
                placeholder="Ex: 1"
                value={versionCode}
                onChange={(e) => setVersionCode(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="apk-file">Arquivo APK</Label>
            <Input
              id="apk-file"
              type="file"
              accept=".apk"
              onChange={handleFileUpload}
              disabled={uploading}
            />
          </div>

          {uploading && (
            <p className="text-sm text-muted-foreground">
              Fazendo upload...
            </p>
          )}
        </CardContent>
      </Card>

      {apkInfo && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileDown className="w-5 h-5 text-primary" />
              APK Atual
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-muted-foreground">Nome do Arquivo</p>
                <p className="font-medium">{apkInfo.file_name}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Tamanho</p>
                <p className="font-medium">
                  {(apkInfo.file_size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
              {apkInfo.version_name && (
                <div>
                  <p className="text-sm text-muted-foreground">Versão</p>
                  <p className="font-medium">{apkInfo.version_name}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Upload</p>
                <p className="font-medium">
                  {new Date(apkInfo.uploaded_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleDownload}
                variant="outline"
                className="flex-1"
              >
                <Download className="w-4 h-4 mr-2" />
                Baixar APK
              </Button>
              <Button
                onClick={handleDeleteApk}
                variant="destructive"
                className="flex-1"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Remover APK
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-base">Instruções</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>1. Faça o upload do arquivo APK compilado do aplicativo móvel</p>
          <p>2. O APK será disponibilizado automaticamente na tela de login</p>
          <p>3. Usuários móveis poderão baixar e instalar o aplicativo</p>
          <p className="text-muted-foreground mt-4">
            ⚠️ Certifique-se de que o APK foi assinado corretamente antes do upload
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
