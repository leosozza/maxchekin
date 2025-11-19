import { useAuth } from '@/hooks/useAuth';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requireRole?: 'admin' | 'operator' | 'viewer';
}

export const AuthGuard = ({ children, requireRole }: AuthGuardProps) => {
  const { user, loading, role } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-studio-dark">
        <Loader2 className="w-8 h-8 animate-spin text-gold" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/admin/login" replace />;
  }

  // Se não há role no banco mas está autenticado, mostrar mensagem
  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-studio-dark">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gold mb-2">Configurando Permissões</h1>
          <p className="text-white/60">Seu acesso está sendo configurado. Por favor, atualize a página em alguns segundos.</p>
        </div>
      </div>
    );
  }

  // Se requireRole foi especificado, verificar permissão
  if (requireRole && role !== requireRole && role !== 'admin') {
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
