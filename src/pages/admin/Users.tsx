import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Save, UserPlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface UserWithRole {
  id: string;
  email: string;
  role?: string;
}

interface Panel {
  id: string;
  name: string;
  slug: string;
}

interface Permission {
  resource_type: string;
  resource_id: string | null;
}

export default function Users() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'operator' | 'viewer'>('viewer');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Fetch all users with their roles
  const { data: users, isLoading: usersLoading } = useQuery({
    queryKey: ['users'],
    queryFn: async () => {
      const { data: rolesData } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const userMap = new Map<string, string>();
      rolesData?.forEach(r => userMap.set(r.user_id, r.role));

      // Get users from auth (admin only can do this via RPC or we show from user_roles)
      const { data: usersData } = await supabase
        .from('user_roles')
        .select('user_id')
        .limit(100);

      const uniqueUserIds = [...new Set(usersData?.map(u => u.user_id) || [])];
      
      return uniqueUserIds.map(id => ({
        id,
        email: `user-${id.slice(0, 8)}`, // Simplified - in production you'd need a profiles table
        role: userMap.get(id),
      }));
    },
  });

  // Fetch panels
  const { data: panels } = useQuery({
    queryKey: ['panels'],
    queryFn: async () => {
      const { data } = await supabase
        .from('panels')
        .select('id, name, slug')
        .eq('is_active', true)
        .order('name');
      return data as Panel[];
    },
  });

  // Fetch permissions for selected user
  const { data: permissions, isLoading: permissionsLoading } = useQuery({
    queryKey: ['user-permissions', selectedUser],
    enabled: !!selectedUser,
    queryFn: async () => {
      const { data } = await supabase
        .from('user_permissions')
        .select('resource_type, resource_id')
        .eq('user_id', selectedUser!);
      return data as Permission[];
    },
  });

  // Save permissions mutation
  const savePermissions = useMutation({
    mutationFn: async ({
      userId,
      permissions,
    }: {
      userId: string;
      permissions: { resource_type: string; resource_id: string | null }[];
    }) => {
      // Delete existing permissions
      await supabase.from('user_permissions').delete().eq('user_id', userId);

      // Insert new permissions
      if (permissions.length > 0) {
        const { error } = await supabase.from('user_permissions').insert(
          permissions.map(p => ({ user_id: userId, ...p }))
        );
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-permissions'] });
      toast({
        title: 'Permissões salvas com sucesso',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao salvar permissões',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSavePermissions = () => {
    if (!selectedUser || !permissions) return;

    const newPermissions: { resource_type: string; resource_id: string | null }[] = [];

    // Check checkin
    const checkinCheckbox = document.getElementById('perm-checkin') as HTMLInputElement;
    if (checkinCheckbox?.checked) {
      newPermissions.push({ resource_type: 'checkin', resource_id: null });
    }

    // Check admin pages
    const adminPages = [
      'admin.webhooks',
      'admin.media',
      'admin.kanban',
      'admin.logs',
      'admin.lead-search',
      'admin.checkin-settings',
      'admin.panels',
    ];
    
    adminPages.forEach(page => {
      const checkbox = document.getElementById(`perm-${page}`) as HTMLInputElement;
      if (checkbox?.checked) {
        newPermissions.push({ resource_type: page, resource_id: null });
      }
    });

    // Check panels
    panels?.forEach(panel => {
      const checkbox = document.getElementById(`perm-panel-${panel.id}`) as HTMLInputElement;
      if (checkbox?.checked) {
        newPermissions.push({ resource_type: 'panel', resource_id: panel.id });
      }
    });

    savePermissions.mutate({ userId: selectedUser, permissions: newPermissions });
  };

  const hasPermission = (type: string, id?: string) => {
    if (!permissions) return false;
    return permissions.some(
      p => p.resource_type === type && (type === 'checkin' || p.resource_id === id)
    );
  };

  if (usersLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gold mb-2">Gerenciar Usuários</h1>
          <p className="text-white/60">Configure permissões de acesso por usuário</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-gold hover:bg-gold/90 text-black">
              <UserPlus className="mr-2 h-4 w-4" />
              Novo Usuário
            </Button>
          </DialogTrigger>
          <DialogContent className="bg-studio-dark border-gold/20">
            <DialogHeader>
              <DialogTitle className="text-gold">Criar Novo Usuário</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email" className="text-white">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  className="bg-black/40 border-gold/20 text-white"
                />
              </div>
              <div>
                <Label htmlFor="password" className="text-white">Senha</Label>
                <Input
                  id="password"
                  type="password"
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="bg-black/40 border-gold/20 text-white"
                />
              </div>
              <div>
                <Label htmlFor="role" className="text-white">Função</Label>
                <Select value={newUserRole} onValueChange={(v: any) => setNewUserRole(v)}>
                  <SelectTrigger className="bg-black/40 border-gold/20 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-studio-dark border-gold/20">
                    <SelectItem value="admin">Admin</SelectItem>
                    <SelectItem value="operator">Operador</SelectItem>
                    <SelectItem value="viewer">Visualizador</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                onClick={() => {
                  toast({
                    title: 'Funcionalidade em desenvolvimento',
                    description: 'Use o Lovable Cloud para criar usuários',
                  });
                  setIsDialogOpen(false);
                }}
                className="w-full bg-gold hover:bg-gold/90 text-black"
              >
                Criar Usuário
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Users List */}
        <Card className="border-gold/20 bg-black/40 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-gold">Usuários</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {users?.map(user => (
              <Button
                key={user.id}
                variant={selectedUser === user.id ? 'default' : 'outline'}
                className={`w-full justify-start ${
                  selectedUser === user.id
                    ? 'bg-gold text-black'
                    : 'border-gold/20 text-white hover:bg-gold/10'
                }`}
                onClick={() => setSelectedUser(user.id)}
              >
                <div className="text-left">
                  <div className="font-medium">{user.email}</div>
                  <div className="text-xs opacity-60">{user.role || 'Sem função'}</div>
                </div>
              </Button>
            ))}
          </CardContent>
        </Card>

        {/* Permissions */}
        <Card className="border-gold/20 bg-black/40 backdrop-blur-sm md:col-span-2">
          <CardHeader>
            <CardTitle className="text-gold">Permissões de Acesso</CardTitle>
          </CardHeader>
          <CardContent>
            {!selectedUser ? (
              <p className="text-white/60 text-center py-8">
                Selecione um usuário para configurar permissões
              </p>
            ) : permissionsLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin text-gold" />
              </div>
            ) : (
              <div className="space-y-6">
                {/* Check-in Permission */}
                <div>
                  <h3 className="text-white font-medium mb-3">Acesso Básico</h3>
                  <div className="flex items-center space-x-3 p-4 rounded-lg bg-black/20 border border-gold/10">
                    <Checkbox
                      id="perm-checkin"
                      defaultChecked={hasPermission('checkin')}
                      className="border-gold/40"
                    />
                    <Label
                      htmlFor="perm-checkin"
                      className="text-white font-medium cursor-pointer flex-1"
                    >
                      Tela de Check-in
                    </Label>
                  </div>
                </div>

                {/* Admin Pages Permissions */}
                <div>
                  <h3 className="text-white font-medium mb-3">Páginas Administrativas</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-black/20 border border-gold/10">
                      <Checkbox
                        id="perm-admin.webhooks"
                        defaultChecked={hasPermission('admin.webhooks')}
                        className="border-gold/40"
                      />
                      <Label htmlFor="perm-admin.webhooks" className="text-white cursor-pointer text-sm">
                        Webhooks
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-black/20 border border-gold/10">
                      <Checkbox
                        id="perm-admin.media"
                        defaultChecked={hasPermission('admin.media')}
                        className="border-gold/40"
                      />
                      <Label htmlFor="perm-admin.media" className="text-white cursor-pointer text-sm">
                        Mídias
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-black/20 border border-gold/10">
                      <Checkbox
                        id="perm-admin.kanban"
                        defaultChecked={hasPermission('admin.kanban')}
                        className="border-gold/40"
                      />
                      <Label htmlFor="perm-admin.kanban" className="text-white cursor-pointer text-sm">
                        Kanban
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-black/20 border border-gold/10">
                      <Checkbox
                        id="perm-admin.logs"
                        defaultChecked={hasPermission('admin.logs')}
                        className="border-gold/40"
                      />
                      <Label htmlFor="perm-admin.logs" className="text-white cursor-pointer text-sm">
                        Logs
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-black/20 border border-gold/10">
                      <Checkbox
                        id="perm-admin.lead-search"
                        defaultChecked={hasPermission('admin.lead-search')}
                        className="border-gold/40"
                      />
                      <Label htmlFor="perm-admin.lead-search" className="text-white cursor-pointer text-sm">
                        Buscar Leads
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-black/20 border border-gold/10">
                      <Checkbox
                        id="perm-admin.checkin-settings"
                        defaultChecked={hasPermission('admin.checkin-settings')}
                        className="border-gold/40"
                      />
                      <Label htmlFor="perm-admin.checkin-settings" className="text-white cursor-pointer text-sm">
                        Config Check-in
                      </Label>
                    </div>
                    <div className="flex items-center space-x-3 p-3 rounded-lg bg-black/20 border border-gold/10">
                      <Checkbox
                        id="perm-admin.panels"
                        defaultChecked={hasPermission('admin.panels')}
                        className="border-gold/40"
                      />
                      <Label htmlFor="perm-admin.panels" className="text-white cursor-pointer text-sm">
                        Gerenciar Painéis
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Panel Permissions */}
                <div className="space-y-3">
                  <h3 className="text-white font-medium">Painéis Específicos</h3>
                  {panels?.map(panel => (
                    <div
                      key={panel.id}
                      className="flex items-center space-x-3 p-3 rounded-lg bg-black/20 border border-gold/10"
                    >
                      <Checkbox
                        id={`perm-panel-${panel.id}`}
                        defaultChecked={hasPermission('panel', panel.id)}
                        className="border-gold/40"
                      />
                      <Label
                        htmlFor={`perm-panel-${panel.id}`}
                        className="text-white cursor-pointer flex-1"
                      >
                        {panel.name}
                      </Label>
                    </div>
                  ))}
                </div>

                {/* Admin Only Note */}
                <div className="p-4 rounded-lg bg-black/20 border border-gold/10">
                  <h3 className="text-white/40 font-medium mb-2 text-sm">Acesso Exclusivo Admin</h3>
                  <p className="text-xs text-white/40">
                    Campos Customizados, Mapeamento, Usuários, Configurações e APK são acessíveis apenas por administradores.
                  </p>
                </div>

                <Button
                  onClick={handleSavePermissions}
                  disabled={savePermissions.isPending}
                  className="w-full bg-gold hover:bg-gold/90 text-black"
                >
                  {savePermissions.isPending ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Salvar Permissões
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
