import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Plus, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBitrixFields } from "@/hooks/useBitrixFields";
import BitrixFieldDetector from "@/components/admin/BitrixFieldDetector";
import FieldMappingRow from "@/components/admin/FieldMappingRow";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";

export default function FieldMapping() {
  const [detectorOpen, setDetectorOpen] = useState(false);

  const { data: mappings, isLoading, refetch } = useQuery({
    queryKey: ["field-mappings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("field_mapping")
        .select("*")
        .eq("is_active", true)
        .order("created_at", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const { data: bitrixFields, isLoading: isLoadingBitrix, refetch: refetchBitrix } = useBitrixFields();

  return (
    <div className="space-y-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Mapeamento de Campos</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-3xl font-bold text-gold mb-2">Mapeamento de Campos</h1>
        <p className="text-white/60">Mapear campos do Bitrix24 para o MaxCheckin</p>
      </div>

      <Card className="border-gold/20 bg-black/40 backdrop-blur-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-gold">Campos Mapeados</CardTitle>
              <CardDescription className="text-white/60">
                Configure quais campos do Bitrix24 correspondem aos dados do MaxCheckin
              </CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => refetchBitrix()}
                variant="outline"
                className="border-gold/20 hover:bg-gold/10"
                disabled={isLoadingBitrix}
              >
                {isLoadingBitrix ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Atualizar Campos Bitrix
              </Button>
              <Button
                onClick={() => setDetectorOpen(true)}
                className="bg-gold hover:bg-gold/90 text-black"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Campo
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-white/60">
              <Loader2 className="w-6 h-6 animate-spin mr-2" />
              Carregando mapeamentos...
            </div>
          ) : mappings && mappings.length > 0 ? (
            <div className="space-y-3">
              {mappings.map((mapping) => (
                <FieldMappingRow
                  key={mapping.id}
                  mapping={mapping}
                  bitrixFields={bitrixFields || []}
                  onUpdate={() => refetch()}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-white/60">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-40" />
              <p className="text-lg mb-2">Nenhum mapeamento configurado</p>
              <p className="text-sm mb-4">Clique em "Adicionar Campo" para começar</p>
              <Button
                onClick={() => setDetectorOpen(true)}
                className="bg-gold hover:bg-gold/90 text-black"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Primeiro Campo
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="border-blue-500/20 bg-blue-500/5 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-blue-400 text-lg">💡 Como usar o Mapeamento de Campos</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-white/70">
          <p>
            <strong className="text-white/90">1. Campos do Sistema (MaxCheckin):</strong> São os campos fixos do sistema de check-in
          </p>
          <p>
            <strong className="text-white/90">2. Campos do Bitrix24:</strong> São os campos do seu CRM que contêm as informações
          </p>
          <p>
            <strong className="text-white/90">3. Mapeamento:</strong> Define qual campo do Bitrix alimenta cada campo do sistema
          </p>
          <p className="pt-2 border-t border-white/10">
            <strong className="text-blue-300">Exemplo:</strong> Se você mapear "Nome do Modelo" ⬅️ "NAME", 
            o sistema vai buscar o nome da modelo do campo NAME do Bitrix24.
          </p>
        </CardContent>
      </Card>

      <BitrixFieldDetector
        open={detectorOpen}
        onOpenChange={setDetectorOpen}
        onSuccess={() => refetch()}
      />
    </div>
  );
}
