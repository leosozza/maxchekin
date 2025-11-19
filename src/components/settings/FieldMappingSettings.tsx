import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Search, Plus, Loader2, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useBitrixFields } from "@/hooks/useBitrixFields";
import BitrixFieldDetector from "@/components/admin/BitrixFieldDetector";
import FieldMappingRow from "@/components/admin/FieldMappingRow";

export function FieldMappingSettings() {
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
    <>
      <Card>
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Mapeamento de Campos</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Configure quais campos do Bitrix24 correspondem aos dados do sistema
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => refetchBitrix()}
                variant="outline"
                size="sm"
                disabled={isLoadingBitrix}
              >
                {isLoadingBitrix ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-2" />
                )}
                Atualizar Campos
              </Button>
              <Button
                onClick={() => setDetectorOpen(true)}
                size="sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                Adicionar Campo
              </Button>
            </div>
          </div>
        </div>

        <CardContent className="p-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
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
            <div className="text-center py-12 text-muted-foreground">
              <Search className="w-12 h-12 mx-auto mb-4 opacity-40" />
              <p>Nenhum mapeamento configurado</p>
              <p className="text-sm mt-2">
                Clique em "Adicionar Campo" para mapear campos do Bitrix24
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <BitrixFieldDetector
        open={detectorOpen}
        onOpenChange={setDetectorOpen}
        onSuccess={() => {
          refetch();
          setDetectorOpen(false);
        }}
      />
    </>
  );
}
