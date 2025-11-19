import { useAuth } from '@/hooks/useAuth';
import { usePagePermissions } from '@/hooks/usePagePermissions';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface PermissionGuardProps {
  children: React.ReactNode;
  page: string;
}

export const PermissionGuard = ({ children, page }: PermissionGuardProps) => {
  const { user, loading, isAdmin } = useAuth();
  const { canAccessPage, permissions } = usePagePermissions();

  if (loading || (user && !permissions)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-studio-dark">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  // Admin bypassa verificação de permissão
  if (isAdmin) {
    return <>{children}</>;
  }

  // Verifica permissão específica
  if (!canAccessPage(page)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-studio-dark">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gold mb-2">Acesso Negado</h1>
          <p className="text-white/60">Você não tem permissão para acessar esta página.</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
