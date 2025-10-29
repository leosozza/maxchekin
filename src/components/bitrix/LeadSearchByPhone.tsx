/**
 * LeadSearchByPhone Component
 * Allows searching for leads by phone number and creating new leads if none found
 */

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { findLeadsByPhone, createLead, BitrixLead } from '@/hooks/useBitrixLead';
import { Loader2, Search, UserPlus, Phone } from 'lucide-react';

interface LeadSearchByPhoneProps {
  onSelectLead: (lead: BitrixLead) => void;
}

export function LeadSearchByPhone({ onSelectLead }: LeadSearchByPhoneProps) {
  const [phone, setPhone] = useState('');
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<BitrixLead[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const { toast } = useToast();

  // Form state for creating new lead
  const [newLeadData, setNewLeadData] = useState({
    nome: '',
    nome_do_modelo: '',
    idade: '',
    telefone1: '',
    telefone2: '',
    telefone3: '',
    telefone4: '',
  });

  const handleSearch = async () => {
    if (!phone.trim()) {
      toast({
        title: 'Erro',
        description: 'Por favor, digite um telefone para buscar',
        variant: 'destructive',
      });
      return;
    }

    setSearching(true);
    setResults([]);
    setShowCreateForm(false);

    try {
      const leads = await findLeadsByPhone(phone);
      
      if (leads.length === 0) {
        toast({
          title: 'Nenhum lead encontrado',
          description: 'Nenhum lead foi encontrado com este telefone. Você pode criar um novo lead.',
        });
        setShowCreateForm(true);
        // Pre-fill phone in create form
        setNewLeadData(prev => ({ ...prev, telefone1: phone }));
      } else {
        setResults(leads);
        toast({
          title: 'Leads encontrados',
          description: `${leads.length} lead(s) encontrado(s)`,
        });
      }
    } catch (error) {
      console.error('Error searching leads:', error);
      toast({
        title: 'Erro ao buscar leads',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setSearching(false);
    }
  };

  const handleCreateLead = async () => {
    if (!newLeadData.nome.trim()) {
      toast({
        title: 'Erro',
        description: 'O nome é obrigatório',
        variant: 'destructive',
      });
      return;
    }

    setCreating(true);

    try {
      const response = await createLead(newLeadData);
      
      toast({
        title: 'Lead criado com sucesso',
        description: 'O novo lead foi criado no Bitrix24',
      });

      // Create a BitrixLead object from the response
      const createdLead: BitrixLead = {
        ID: response.result.toString(),
        NAME: newLeadData.nome,
        TITLE: `NOVO LEAD`,
        ...(newLeadData.nome_do_modelo && { UF_CRM_MODEL_NAME: newLeadData.nome_do_modelo }),
      };

      // Call onSelectLead with the created lead
      onSelectLead(createdLead);
      
      // Reset form
      setNewLeadData({
        nome: '',
        nome_do_modelo: '',
        idade: '',
        telefone1: '',
        telefone2: '',
        telefone3: '',
        telefone4: '',
      });
      setShowCreateForm(false);
      setPhone('');
    } catch (error) {
      console.error('Error creating lead:', error);
      toast({
        title: 'Erro ao criar lead',
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: 'destructive',
      });
    } finally {
      setCreating(false);
    }
  };

  const handleSelectLead = (lead: BitrixLead) => {
    onSelectLead(lead);
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
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSearch();
                  }
                }}
                disabled={searching}
              />
            </div>
            <div className="flex items-end">
              <Button onClick={handleSearch} disabled={searching}>
                {searching ? (
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

          {results.length > 0 && (
            <div className="space-y-2">
              <Label>Resultados da busca:</Label>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {results.map((lead) => (
                  <Card
                    key={lead.ID}
                    className="cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => handleSelectLead(lead)}
                  >
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <p className="font-semibold">{lead.NAME || 'Sem nome'}</p>
                          <p className="text-sm text-muted-foreground">
                            {lead.TITLE || 'Sem título'}
                          </p>
                          {lead.PHONE && lead.PHONE.length > 0 && (
                            <p className="text-sm text-muted-foreground">
                              📞 {lead.PHONE[0].VALUE}
                            </p>
                          )}
                        </div>
                        <Button variant="outline" size="sm">
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
            <CardDescription>
              Preencha os dados do novo lead
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="nome">Nome *</Label>
              <Input
                id="nome"
                placeholder="Nome do lead"
                value={newLeadData.nome}
                onChange={(e) =>
                  setNewLeadData({ ...newLeadData, nome: e.target.value })
                }
                disabled={creating}
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
                disabled={creating}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="idade">Idade</Label>
              <Input
                id="idade"
                type="number"
                placeholder="Idade"
                value={newLeadData.idade}
                onChange={(e) =>
                  setNewLeadData({ ...newLeadData, idade: e.target.value })
                }
                disabled={creating}
              />
            </div>

            <div className="space-y-2">
              <Label>Telefones</Label>
              <div className="space-y-2">
                <Input
                  placeholder="Telefone 1"
                  value={newLeadData.telefone1}
                  onChange={(e) =>
                    setNewLeadData({ ...newLeadData, telefone1: e.target.value })
                  }
                  disabled={creating}
                />
                <Input
                  placeholder="Telefone 2 (opcional)"
                  value={newLeadData.telefone2}
                  onChange={(e) =>
                    setNewLeadData({ ...newLeadData, telefone2: e.target.value })
                  }
                  disabled={creating}
                />
                <Input
                  placeholder="Telefone 3 (opcional)"
                  value={newLeadData.telefone3}
                  onChange={(e) =>
                    setNewLeadData({ ...newLeadData, telefone3: e.target.value })
                  }
                  disabled={creating}
                />
                <Input
                  placeholder="Telefone 4 (opcional)"
                  value={newLeadData.telefone4}
                  onChange={(e) =>
                    setNewLeadData({ ...newLeadData, telefone4: e.target.value })
                  }
                  disabled={creating}
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCreateLead}
                disabled={creating}
                className="flex-1"
              >
                {creating ? (
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
                disabled={creating}
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
