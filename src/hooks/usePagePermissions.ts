import { useAuth } from './useAuth';
import { useUserPermissions } from './useUserPermissions';

export function usePagePermissions() {
  const { user, isAdmin } = useAuth();
  const { data: permissions } = useUserPermissions(user?.id);

  const canAccessPage = (page: string): boolean => {
    // Admin tem acesso a tudo
    if (isAdmin) return true;
    
    // Sem permissões carregadas = sem acesso
    if (!permissions) return false;

    // Dashboard é acessível para todos usuários autenticados
    if (page === 'dashboard') return true;

    // Check-in precisa de permissão específica
    if (page === 'checkin') {
      return permissions.some(p => p.resource_type === 'checkin');
    }

    // Páginas admin precisam de permissão específica
    if (page.startsWith('admin.')) {
      return permissions.some(p => p.resource_type === page);
    }

    return false;
  };

  const canAccessPanel = (panelId: string): boolean => {
    if (isAdmin) return true;
    if (!permissions) return false;
    return permissions.some(
      p => p.resource_type === 'panel' && p.resource_id === panelId
    );
  };

  return { canAccessPage, canAccessPanel, permissions };
}
