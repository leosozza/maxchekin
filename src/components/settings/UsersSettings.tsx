import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
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

interface Permission {
  resource_type: string;
  resource_id: string | null;
}

export function UsersSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedUser, setSelectedUser] = useState<string | null>(null);
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'operator' | 'viewer'>('operator');
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

      const { data: usersData } = await supabase
        .from('user_roles')
        .select('user_id')
        .limit(100);

      const uniqueUserIds = [...new Set(usersData?.map(u => u.user_id) || [])];
      
      return uniqueUserIds.map(id => ({
        id,
        email: `user-${id.slice(0, 8)}`,
        role: userMap.get(id),
      }));
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
      await supabase.from('user_permissions').delete().eq('user_id', userId);

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
        title: 'Permissões salvas!',
        description: 'As permissões do usuário foram atualizadas',
      });
    },
  });

  // Create user mutation
  const createUser = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.auth.signUp({
        email: newUserEmail,
        password: newUserPassword,
      });

      if (error) throw error;
      if (!data.user) throw new Error('Falha ao criar usuário');

      const { error: roleError } = await supabase.from('user_roles').insert({
        user_id: data.user.id,
        role: newUserRole,
      });

      if (roleError) throw roleError;

      return data.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({
        title: 'Usuário criado!',
        description: 'O novo usuário foi criado com sucesso',
      });
      setIsDialogOpen(false);
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserRole('operator');
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar usuário',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const handleSavePermissions = () => {
    if (!selectedUser) return;

    const perms: Permission[] = [];
    
    // Check-in permission
    const checkinCheckbox = document.getElementById('perm-checkin') as HTMLInputElement;
    if (checkinCheckbox?.checked) {
      perms.push({ resource_type: 'checkin', resource_id: null });
    }

    savePermissions.mutate({ userId: selectedUser, permissions: perms });
  };

  const selectedUserData = users?.find(u => u.id === selectedUser);

  return (
    <Card>
      <div className="p-6 border-b">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold">Usuários</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Gerencie usuários e suas permissões
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <UserPlus className="w-4 h-4 mr-2" />
                Novo Usuário
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Criar Novo Usuário</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    placeholder="usuario@exemplo.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="role">Função</Label>
                  <Select value={newUserRole} onValueChange={(v: any) => setNewUserRole(v)}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Administrador</SelectItem>
                      <SelectItem value="operator">Operador</SelectItem>
                      <SelectItem value="viewer">Visualizador</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  onClick={() => createUser.mutate()}
                  disabled={createUser.isPending || !newUserEmail || !newUserPassword}
                  className="w-full"
                >
                  {createUser.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Criar Usuário
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <CardContent className="p-6">
        <div className="grid md:grid-cols-2 gap-6">
          {/* Lista de usuários */}
          <div>
            <h4 className="font-medium mb-4">Selecione um usuário</h4>
            {usersLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : (
              <div className="space-y-2">
                {users?.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUser(user.id)}
                    className={`w-full text-left p-3 rounded-lg border transition-colors ${
                      selectedUser === user.id
                        ? 'bg-primary/10 border-primary'
                        : 'hover:bg-accent/50'
                    }`}
                  >
                    <div className="font-medium">{user.email}</div>
                    <div className="text-sm text-muted-foreground capitalize">{user.role}</div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Permissões */}
          <div>
            {selectedUser ? (
              <>
                <h4 className="font-medium mb-4">
                  Permissões de {selectedUserData?.email}
                </h4>
                {permissionsLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-3 p-4 border rounded-lg">
                      <h5 className="font-medium text-sm">Acesso Básico</h5>
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id="perm-checkin"
                          defaultChecked={permissions?.some(p => p.resource_type === 'checkin')}
                        />
                        <Label htmlFor="perm-checkin" className="cursor-pointer">
                          Tela de Check-in
                        </Label>
                      </div>
                    </div>

                    <Button
                      onClick={handleSavePermissions}
                      disabled={savePermissions.isPending}
                      className="w-full"
                    >
                      {savePermissions.isPending && (
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      )}
                      <Save className="w-4 h-4 mr-2" />
                      Salvar Permissões
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Selecione um usuário para gerenciar permissões
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
