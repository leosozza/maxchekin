import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Loader2, Search, UserPlus } from "lucide-react";
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
  const [newLeadName, setNewLeadName] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

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
      setSearchResults(leads);

      if (leads.length === 0) {
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
    if (!newLeadName.trim()) {
      toast({
        title: "Erro",
        description: "Digite o nome do lead",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);

    try {
      const leadId = await createLead({
        name: newLeadName,
        phone: phone,
      });

      toast({
        title: "Lead criado!",
        description: `Lead criado com sucesso. ID: ${leadId}`,
      });

      // Create a BitrixLead object to return
      const newLead: BitrixLead = {
        ID: leadId.toString(),
        TITLE: newLeadName,
        NAME: newLeadName,
      };

      onSelectLead(newLead);
    } catch (error) {
      toast({
        title: "Erro ao criar lead",
        description: error instanceof Error ? error.message : "Erro ao criar lead",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isSearching) {
      handleSearch();
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Section */}
      <Card className="p-4 bg-black/20 border-gold/20">
        <div className="space-y-4">
          <div>
            <Label htmlFor="phone" className="text-white/80">
              Telefone (com DDD)
            </Label>
            <div className="flex gap-2 mt-2">
              <Input
                id="phone"
                type="tel"
                placeholder="(11) 99999-9999"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isSearching}
                className="bg-black/20 border-gold/20 text-white placeholder:text-white/40"
              />
              <Button
                onClick={handleSearch}
                disabled={isSearching}
                className="bg-gold hover:bg-gold/90 text-black"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Buscando...
                  </>
                ) : (
                  <>
                    <Search className="w-4 h-4 mr-2" />
                    Buscar
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </Card>

      {/* Search Results */}
      {searchResults.length > 0 && (
        <Card className="p-4 bg-black/20 border-gold/20">
          <h3 className="text-white font-semibold mb-3">Leads Encontrados:</h3>
          <div className="space-y-2">
            {searchResults.map((lead) => (
              <div
                key={lead.ID}
                className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-white/10"
              >
                <div className="flex-1">
                  <div className="text-white font-medium">
                    {lead.TITLE || lead.NAME || "Sem título"}
                  </div>
                  <div className="text-white/60 text-sm">
                    ID: {lead.ID}
                    {lead.NAME && lead.NAME !== lead.TITLE && ` • Nome: ${lead.NAME}`}
                  </div>
                </div>
                <Button
                  onClick={() => onSelectLead(lead)}
                  size="sm"
                  className="bg-gold hover:bg-gold/90 text-black"
                >
                  Selecionar
                </Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Create New Lead Form */}
      {showCreateForm && (
        <Card className="p-4 bg-black/20 border-gold/20">
          <h3 className="text-white font-semibold mb-3">Criar Novo Lead</h3>
          <div className="space-y-4">
            <div>
              <Label htmlFor="leadName" className="text-white/80">
                Nome do Lead
              </Label>
              <Input
                id="leadName"
                type="text"
                placeholder="Digite o nome completo"
                value={newLeadName}
                onChange={(e) => setNewLeadName(e.target.value)}
                disabled={isCreating}
                className="bg-black/20 border-gold/20 text-white placeholder:text-white/40 mt-2"
              />
            </div>
            <Button
              onClick={handleCreateLead}
              disabled={isCreating}
              className="bg-gold hover:bg-gold/90 text-black w-full"
            >
              {isCreating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Criando...
                </>
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Criar Lead
                </>
              )}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
