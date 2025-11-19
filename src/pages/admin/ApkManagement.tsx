import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, Download, Trash2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface ApkConfig {
  id: string;
  version: string;
  download_url: string;
  file_size: number | null;
  release_notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export default function ApkManagement() {
  const queryClient = useQueryClient();
  const [version, setVersion] = useState("");
  const [downloadUrl, setDownloadUrl] = useState("");
  const [fileSize, setFileSize] = useState("");
  const [releaseNotes, setReleaseNotes] = useState("");

  // Fetch APK configurations
  const { data: apkConfigs, isLoading } = useQuery({
    queryKey: ["apk-configs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("apk_config")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as ApkConfig[];
    },
  });

  // Create APK config
  const createMutation = useMutation({
    mutationFn: async () => {
      // Deactivate all existing configs first
      await supabase
        .from("apk_config")
        .update({ is_active: false })
        .eq("is_active", true);

      const { error } = await supabase.from("apk_config").insert({
        version,
        download_url: downloadUrl,
        file_size: fileSize ? parseInt(fileSize) : null,
        release_notes: releaseNotes || null,
        is_active: true,
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apk-configs"] });
      toast.success("APK configurado com sucesso!");
      setVersion("");
      setDownloadUrl("");
      setFileSize("");
      setReleaseNotes("");
    },
    onError: (error: Error) => {
      toast.error("Erro ao configurar APK: " + error.message);
    },
  });

  // Delete APK config
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("apk_config").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apk-configs"] });
      toast.success("Configuração removida!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao remover: " + error.message);
    },
  });

  // Activate specific version
  const activateMutation = useMutation({
    mutationFn: async (id: string) => {
      // Deactivate all
      await supabase
        .from("apk_config")
        .update({ is_active: false })
        .eq("is_active", true);

      // Activate selected
      const { error } = await supabase
        .from("apk_config")
        .update({ is_active: true })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["apk-configs"] });
      toast.success("Versão ativada!");
    },
    onError: (error: Error) => {
      toast.error("Erro ao ativar: " + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!version.trim() || !downloadUrl.trim()) {
      toast.error("Versão e URL são obrigatórios");
      return;
    }
    createMutation.mutate();
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "—";
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(2)} MB`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gerenciamento de APK</h1>
        <p className="text-muted-foreground">
          Configure o APK disponível para download na tela de login
        </p>
      </div>

      <Alert>
        <AlertDescription>
          💡 <strong>Como funciona:</strong> Faça upload do APK para um serviço de hospedagem
          (Google Drive, Dropbox, etc.) e cole o link de download direto aqui. Apenas uma versão
          pode estar ativa por vez.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Adicionar Nova Versão</CardTitle>
          <CardDescription>
            Configure uma nova versão do APK para disponibilizar aos usuários
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="version">Versão *</Label>
                <Input
                  id="version"
                  placeholder="Ex: 1.0.5"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fileSize">Tamanho do Arquivo (bytes)</Label>
                <Input
                  id="fileSize"
                  type="number"
                  placeholder="Ex: 52428800"
                  value={fileSize}
                  onChange={(e) => setFileSize(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="downloadUrl">URL de Download *</Label>
              <Input
                id="downloadUrl"
                type="url"
                placeholder="https://..."
                value={downloadUrl}
                onChange={(e) => setDownloadUrl(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="releaseNotes">Notas da Versão</Label>
              <Textarea
                id="releaseNotes"
                placeholder="O que há de novo nesta versão..."
                value={releaseNotes}
                onChange={(e) => setReleaseNotes(e.target.value)}
                rows={3}
              />
            </div>

            <Button type="submit" disabled={createMutation.isPending} className="w-full">
              <Upload className="mr-2 h-4 w-4" />
              {createMutation.isPending ? "Salvando..." : "Adicionar Versão"}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Versões Configuradas</CardTitle>
          <CardDescription>Gerencie as versões disponíveis do APK</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center text-muted-foreground">Carregando...</p>
          ) : !apkConfigs || apkConfigs.length === 0 ? (
            <p className="text-center text-muted-foreground">
              Nenhuma versão configurada ainda
            </p>
          ) : (
            <div className="space-y-3">
              {apkConfigs.map((config) => (
                <div
                  key={config.id}
                  className={`flex items-center justify-between p-4 border rounded-lg ${
                    config.is_active ? "border-primary bg-primary/5" : "border-border"
                  }`}
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="font-semibold">Versão {config.version}</h3>
                      {config.is_active && (
                        <span className="px-2 py-1 text-xs font-medium bg-primary text-primary-foreground rounded">
                          ATIVA
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Tamanho: {formatFileSize(config.file_size)}
                    </p>
                    {config.release_notes && (
                      <p className="text-sm text-muted-foreground mt-1">{config.release_notes}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-2">
                      Criado em: {new Date(config.created_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(config.download_url, "_blank")}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    {!config.is_active && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => activateMutation.mutate(config.id)}
                        disabled={activateMutation.isPending}
                      >
                        Ativar
                      </Button>
                    )}
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Tem certeza que deseja remover a versão ${config.version}?`
                          )
                        ) {
                          deleteMutation.mutate(config.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
