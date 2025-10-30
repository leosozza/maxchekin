import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Loader2, Search, UserPlus, Phone } from "lucide-react";
import { findLeadsByPhone, createLead, BitrixLead } from "@/hooks/useBitrixLead";
import { useToast } from "@/hooks/use-toast";

interface LeadSearchByPhoneProps {
  onSelectLead: (lead: BitrixLead) => void;
}

export default function LeadSearchByPhone({ onSelectLead }: LeadSearchByPhoneProps) {
  const [phone, setPhone] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<BitrixLead[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  // Detailed form data (keeps the richer create form from the feature branch)
  const [newLeadData, setNewLeadData] = useState({
    nome: "",
    nome_do_modelo: "",
    idade: "",
    telefone1: "",
    telefone2: "",
    telefone3: "",
    telefone4: "",
  });

  const handleSearch = async () => {
    if (!phone.trim()) {
      toast({
        title: "Erro",
        description: "Digite um número de telefone",
        variant: "destructive",
      });
      return;
    }

    setIsSearching(true);
    setSearchResults([]);
    setShowCreateForm(false);

    try {
      const leads = await findLeadsByPhone(phone);
      setSearchResults(leads || []);

      if (!leads || leads.length === 0) {
        // prefill telefone1 in create form and show it
        setNewLeadData((prev) => ({ ...prev, telefone1: phone }));
        setShowCreateForm(true);
        toast({
          title: "Nenhum lead encontrado",
          description: "Você pode criar um novo lead com este telefone",
        });
      } else {
        toast({
          title: "Leads encontrados",
          description: `Encontrados ${leads.length} lead(s) com este telefone`,
        });
      }
    } catch (error) {
      console.error("Error searching leads:", error);
      toast({
        title: "Erro na busca",
        description: error instanceof Error ? error.message : "Erro ao buscar leads",
        variant: "destructive",
      });
    } finally {
      setIsSearching(false);
    }
  };

  const handleCreateLead = async () => {
    if (!newLeadData.nome.trim()) {
      toast({
        title: "Erro",
        description: "O nome é obrigatório",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      // call createLead with the detailed payload (compatible with the feature branch)
      const response = await createLead(newLeadData);

      // Support both shapes: { result: id } or direct id return
      const createdId =
        response && typeof response === "object" && "result" in response
          ? response.result
          : response;

      toast({
        title: "Lead criado com sucesso",
        description: `O novo lead foi criado no Bitrix24 (ID: ${createdId})`,
      });

      // Build a BitrixLead object to keep the same contract for onSelectLead
      const createdLead: BitrixLead = {
        ID: String(createdId),
        NAME: newLeadData.nome,
        TITLE: "NOVO LEAD",
        ...(newLeadData.nome_do_modelo && { UF_CRM_1739563541: newLeadData.nome_do_modelo }),
      };

      // keep the existing binding: notify parent that a lead was selected/created
      onSelectLead(createdLead);

      // reset form + hide
      setNewLeadData({
        nome: "",
        nome_do_modelo: "",
        idade: "",
        telefone1: "",
        telefone2: "",
        telefone3: "",
        telefone4: "",
      });
      setShowCreateForm(false);
      setPhone("");
      setSearchResults([]);
    } catch (error) {
      console.error("Error creating lead:", error);
      toast({
        title: "Erro ao criar lead",
        description: error instanceof Error ? error.message : "Erro ao criar lead",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleSelectLead = (lead: BitrixLead) => {
    onSelectLead(lead);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !isSearching) {
      handleSearch();
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Buscar Lead por Telefone
          </CardTitle>
          <CardDescription>
            Digite o telefone com DDD para buscar leads existentes
          </CardDescription>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="phone">Telefone com DDD</Label>
              <Input
                id="phone"
                type="tel"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={isSearching || isCreating}
              />
            </div>

            <div className="flex items-end">
              <Button onClick={handleSearch} disabled={isSearching || isCreating}>
                {isSearching ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Buscar
                  </>
                )}
              </Button>
            </div>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              <Label>Resultados da busca:</Label>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {searchResults.map((lead) => (
                  <Card
                    key={lead.ID}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleSelectLead(lead)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{lead.NAME || "Sem nome"}</p>
                          <p className="text-sm text-muted-foreground">
                            {lead.TITLE || "Sem título"}
                          </p>
                          {Array.isArray((lead as any).PHONE) &&
                            (lead as any).PHONE.length > 0 && (
                              <p className="text-sm text-muted-foreground">
                                📞 {(lead as any).PHONE[0].VALUE}
                              </p>
                            )}
                        </div>
                        <Button variant="outline" size="sm" onClick={() => handleSelectLead(lead)}>
                          Selecionar
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Criar Novo Lead
            </CardTitle>
            <CardDescription>Preencha os dados do novo lead</CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                placeholder="Nome do lead"
                value={newLeadData.nome}
                onChange={(e) => setNewLeadData({ ...newLeadData, nome: e.target.value })}
                disabled={isCreating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="nome_do_modelo">Nome do Modelo</Label>
              <Input
                id="nome_do_modelo"
                placeholder="Nome do modelo"
                value={newLeadData.nome_do_modelo}
                onChange={(e) =>
                  setNewLeadData({ ...newLeadData, nome_do_modelo: e.target.value })
                }
                disabled={isCreating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="idade">Idade</Label>
              <Input
                id="idade"
                type="number"
                placeholder="Idade"
                value={newLeadData.idade}
                onChange={(e) => setNewLeadData({ ...newLeadData, idade: e.target.value })}
                disabled={isCreating}
              />
            </div>

            <div className="space-y-2">
              <Label>Telefones</Label>
              <div className="space-y-2">
                <Input
                  placeholder="Telefone 1"
                  value={newLeadData.telefone1}
                  onChange={(e) => setNewLeadData({ ...newLeadData, telefone1: e.target.value })}
                  disabled={isCreating}
                />
                <Input
                  placeholder="Telefone 2 (opcional)"
                  value={newLeadData.telefone2}
                  onChange={(e) => setNewLeadData({ ...newLeadData, telefone2: e.target.value })}
                  disabled={isCreating}
                />
                <Input
                  placeholder="Telefone 3 (opcional)"
                  value={newLeadData.telefone3}
                  onChange={(e) => setNewLeadData({ ...newLeadData, telefone3: e.target.value })}
                  disabled={isCreating}
                />
                <Input
                  placeholder="Telefone 4 (opcional)"
                  value={newLeadData.telefone4}
                  onChange={(e) => setNewLeadData({ ...newLeadData, telefone4: e.target.value })}
                  disabled={isCreating}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button onClick={handleCreateLead} disabled={isCreating} className="flex-1">
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Criando...
                  </>
                ) : (
                  <>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Criar Lead
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowCreateForm(false)}
                disabled={isCreating}
              >
                Cancelar
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}