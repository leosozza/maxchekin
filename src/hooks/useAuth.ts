import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { User, Session } from '@supabase/supabase-js';
import { useToast } from '@/hooks/use-toast';

export type UserRole = 'admin' | 'operator' | 'viewer';

export const useAuth = () => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState<UserRole | null>(null);
  const { toast } = useToast();

  const fetchUserRole = async (userId: string): Promise<boolean> => {
    try {
      console.log('[useAuth] Fetching role for user:', userId);
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', userId)
        .maybeSingle();
      
      console.log('[useAuth] Role query result:', { data, error });

      if (error) {
        console.error('Error fetching user role:', error);
        setRole(null);
        return false;
      }
      
      if (data) {
        console.log('[useAuth] Setting role:', data.role);
        setRole(data.role as UserRole);
        return true;
      } else {
        console.warn('[useAuth] No role found for user');
        setRole(null);
        return false;
      }
    } catch (error) {
      console.error('Error in fetchUserRole:', error);
      setRole(null);
      return false;
    }
  };

  useEffect(() => {
    let retryCount = 0;
    const MAX_RETRIES = 3;

    const fetchRoleWithRetry = async (userId: string) => {
      const success = await fetchUserRole(userId);
      
      if (!success && retryCount < MAX_RETRIES) {
        retryCount++;
        console.log(`[useAuth] Retrying role fetch (${retryCount}/${MAX_RETRIES})...`);
        setTimeout(() => fetchRoleWithRetry(userId), 1000);
      }
    };

    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('[useAuth] Auth state changed:', event);
        setSession(session);
        setUser(session?.user ?? null);
        
        if (session?.user) {
          retryCount = 0;
          setTimeout(() => {
            fetchRoleWithRetry(session.user.id);
          }, 0);
        } else {
          setRole(null);
        }
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('[useAuth] Initial session check');
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchRoleWithRetry(session.user.id);
      }
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      toast({
        title: "Login realizado com sucesso",
        description: "Bem-vindo de volta!",
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Erro ao fazer login",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const signUp = async (email: string, password: string) => {
    try {
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/dashboard`,
      },
    });

      if (error) throw error;

      toast({
        title: "Cadastro realizado",
        description: "Verifique seu email para confirmar o cadastro.",
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Erro ao cadastrar",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const signOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;

      toast({
        title: "Logout realizado",
        description: "Até logo!",
      });

      return { error: null };
    } catch (error: any) {
      toast({
        title: "Erro ao fazer logout",
        description: error.message,
        variant: "destructive",
      });
      return { error };
    }
  };

  const isAdmin = role === 'admin';
  const isOperator = role === 'operator';
  const isViewer = role === 'viewer';

  return {
    user,
    session,
    loading,
    role,
    isAdmin,
    isOperator,
    isViewer,
    signIn,
    signUp,
    signOut,
  };
};
