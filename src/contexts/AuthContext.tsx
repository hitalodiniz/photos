'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from 'react';
import { authService } from '@/core/services/auth.service';
import { getAvatarUrl } from '@/core/services/profile.service';

interface AuthContextType {
  user: any;
  avatarUrl: string | null;
  logout: () => Promise<void>;
  isLoading: boolean; //Padronizado para 'isLoading' para evitar conflitos comuns
  protectRoute: (redirectTo?: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true); // 🎯 Nome sincronizado

  const loadProfile = async (userId: string) => {
    try {
      const url = await getAvatarUrl(userId);
      setAvatarUrl(url);
    } catch (error) {
      console.error('[AuthContext] Erro ao carregar avatar:', error);
    }
  };

  const protectRoute = (redirectTo: string = '/login') => {
    if (!isLoading && !user) {
      window.location.href = redirectTo;
    }
  };

  useEffect(() => {
    // 🎯 DEBUG: Log inicial
    console.log('[AuthContext] Inicializando autenticação...');

    // 🎯 TIMEOUT DE SEGURANÇA: Força isLoading = false após 5 segundos
    let isLoadingStillTrue = true;
    const timeoutId = setTimeout(() => {
      if (isLoadingStillTrue) {
        console.warn('[AuthContext] Timeout: Forçando isLoading = false após 5s');
        setIsLoading(false);
      }
    }, 5000);

    authService.getSession().then((session) => {
      console.log('[AuthContext] Sessão inicial:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
      });

      if (session?.user) {
        const userData = {
          id: session.user.id,
          email: session.user.email,
          name:
            session.user.user_metadata?.full_name ||
            session.user.email?.split('@')[0],
        };
        setUser(userData);
        loadProfile(session.user.id);
        console.log('[AuthContext] Usuário definido:', userData);
      } else {
        console.log('[AuthContext] Nenhuma sessão encontrada - usuário não autenticado');
        // 🎯 LIMPA ESTADO: Garante que não há usuário quando não há sessão
        setUser(null);
        setAvatarUrl(null);
      }
      isLoadingStillTrue = false;
      setIsLoading(false);
      clearTimeout(timeoutId);
    }).catch((error) => {
      console.error('[AuthContext] Erro ao buscar sessão:', error);
      // 🎯 ERRO: Limpa estado e força logout em caso de erro crítico
      setUser(null);
      setAvatarUrl(null);
      isLoadingStillTrue = false;
      setIsLoading(false);
      clearTimeout(timeoutId);
      
      // Se estiver em rota protegida, redireciona
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/dashboard') || currentPath.startsWith('/onboarding')) {
          console.log('[AuthContext] Erro crítico - redirecionando para login');
          window.location.href = '/auth/login?error=session_error';
        }
      }
    });

    const subscription = authService.onAuthStateChange((event, session) => {
      console.log('[AuthContext] Mudança de autenticação:', {
        event,
        hasSession: !!session,
        hasUser: !!session?.user,
      });

      // 🎯 TRATAMENTO: Eventos que indicam sessão inválida
      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        console.log('[AuthContext] Sessão invalidada, limpando estado. Event:', event);
        setUser(null);
        setAvatarUrl(null);
        isLoadingStillTrue = false;
        setIsLoading(false);
        clearTimeout(timeoutId);
        
        // Se estiver em rota protegida, redireciona para login
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          if (currentPath.startsWith('/dashboard') || currentPath.startsWith('/onboarding')) {
            console.log('[AuthContext] Redirecionando para login...');
            window.location.href = '/auth/login?error=session_expired';
          }
        }
        return;
      }

      if (session?.user) {
        const userData = {
          id: session.user.id,
          email: session.user.email,
          name:
            session.user.user_metadata?.full_name ||
            session.user.email?.split('@')[0],
        };
        setUser(userData);
        loadProfile(session.user.id);
        console.log('[AuthContext] Usuário atualizado:', userData);
      } else {
        setUser(null);
        setAvatarUrl(null);
        console.log('[AuthContext] Usuário removido');
      }
      isLoadingStillTrue = false;
      setIsLoading(false);
      clearTimeout(timeoutId);
    });

    return () => {
      clearTimeout(timeoutId);
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, []);

  const logout = async () => {
    await authService.signOut();
    window.location.href = process.env.NEXT_PUBLIC_BASE_URL || '/';
  };

  return (
    // O value agora contém exatamente o que a interface descreve
    <AuthContext.Provider
      value={{ user, avatarUrl, logout, isLoading, protectRoute }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context)
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  return context;
};
