import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Breadcrumb, BreadcrumbList, BreadcrumbItem, BreadcrumbLink, BreadcrumbSeparator, BreadcrumbPage } from "@/components/ui/breadcrumb";
import LeadSearchByPhone from "@/components/bitrix/LeadSearchByPhone";
import { BitrixLead } from "@/hooks/useBitrixLead";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";

export default function LeadSearch() {
  const [selectedLead, setSelectedLead] = useState<BitrixLead | null>(null);

  const handleSelectLead = (lead: BitrixLead) => {
    setSelectedLead(lead);
  };

  const handleClearSelection = () => {
    setSelectedLead(null);
  };

  return (
    <div className="space-y-6 p-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Busca de Leads</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div>
        <h1 className="text-3xl font-bold text-gold mb-2">Busca de Leads por Telefone</h1>
        <p className="text-white/60">
          Busque leads existentes no Bitrix24 pelo número de telefone ou crie um novo lead
        </p>
      </div>

      <Card className="border-gold/20 bg-black/40 backdrop-blur-sm">
        <CardHeader>
          <CardTitle className="text-gold">Pesquisar Lead</CardTitle>
          <CardDescription className="text-white/60">
            Digite o telefone com DDD para buscar leads existentes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <LeadSearchByPhone onSelectLead={handleSelectLead} />
        </CardContent>
      </Card>

      {selectedLead && (
        <Card className="border-green-500/20 bg-green-900/20 backdrop-blur-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <CardTitle className="text-green-500">Lead Selecionado</CardTitle>
              </div>
              <Button
                onClick={handleClearSelection}
                variant="outline"
                size="sm"
                className="border-white/20"
              >
                Limpar Seleção
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 text-white">
              <p>
                <strong>ID:</strong> {selectedLead.ID}
              </p>
              <p>
                <strong>Título:</strong> {selectedLead.TITLE || "N/A"}
              </p>
              {selectedLead.NAME && (
                <p>
                  <strong>Nome:</strong> {selectedLead.NAME}
                </p>
              )}
              {selectedLead.PHONE && selectedLead.PHONE.length > 0 && (
                <p>
                  <strong>Telefone:</strong> {selectedLead.PHONE[0]?.VALUE || "N/A"}
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
