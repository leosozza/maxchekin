import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export interface UserPermission {
  resource_type: 'panel' | 'checkin' | 'admin';
  resource_id: string | null;
}

export function useUserPermissions(userId?: string) {
  return useQuery({
    queryKey: ['user-permissions', userId],
    enabled: !!userId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('user_permissions')
        .select('resource_type, resource_id')
        .eq('user_id', userId!);

      if (error) throw error;
      return data as UserPermission[];
    },
  });
}

export function hasPermission(
  permissions: UserPermission[] | undefined,
  type: 'panel' | 'checkin' | 'admin',
  resourceId?: string
): boolean {
  if (!permissions) return false;
  
  if (type === 'checkin' || type === 'admin') {
    return permissions.some(p => p.resource_type === type);
  }
  
  return permissions.some(
    p => p.resource_type === type && p.resource_id === resourceId
  );
}
