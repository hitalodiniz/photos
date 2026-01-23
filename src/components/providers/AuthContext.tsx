/**
 * ⚠️⚠️⚠️ ARQUIVO CRÍTICO DE SEGURANÇA ⚠️⚠️⚠️
 * 
 * Este arquivo gerencia:
 * - Contexto global de autenticação
 * - Estado do usuário em toda a aplicação
 * - Inicialização de sessão
 * - Listeners de mudança de autenticação
 * 
 * 🔴 IMPACTO DE MUDANÇAS:
 * - Qualquer bug pode quebrar autenticação em toda a aplicação
 * - Pode expor estado de usuário incorretamente
 * - Pode causar loops infinitos de renderização
 * 
 * ✅ ANTES DE ALTERAR:
 * 1. Leia CRITICAL_AUTH_FILES.md
 * 2. Leia AUTH_CONTRACT.md
 * 3. Entenda React Context e hooks
 * 4. Crie/atualize testes unitários
 * 5. Teste extensivamente localmente
 * 6. Solicite revisão de código
 * 
 * 📋 CHECKLIST OBRIGATÓRIO:
 * [ ] Testes unitários criados/atualizados
 * [ ] Testado inicialização de sessão
 * [ ] Testado listeners de auth state change
 * [ ] Testado timeout de segurança
 * [ ] Revisão de código aprovada
 * [ ] Documentação atualizada
 * 
 * 🚨 NÃO ALTERE SEM ENTENDER COMPLETAMENTE O IMPACTO!
 */

'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
  useCallback,
  useRef,
} from 'react';
import { authService } from '@photos/core-auth';
import LoadingScreen from '../ui/LoadingScreen';

interface AuthContextType {
  user: any;
  roles: string[];
  avatarUrl: string | null;
  logout: () => Promise<void>;
  isLoading: boolean;
  isLoggingOut: boolean;
  protectRoute: (redirectTo?: string) => void;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Refs para controle de busca do perfil e evitar loops
  const lastLoadedUserId = useRef<string | null>(null);
  const isFetchingProfile = useRef<boolean>(false);
  const isInitializingAuth = useRef<boolean>(false);

  const loadProfile = useCallback(async (userId: string) => {
    // 🛡️ MEMOIZAÇÃO: Só busca se o userId mudar ou se não tivermos os dados e não estiver buscando
    if (isFetchingProfile.current) return;
    if (lastLoadedUserId.current === userId && (avatarUrl || roles.length > 0)) return;

    try {
      isFetchingProfile.current = true;
      // console.log('[AuthContext] Buscando perfil para:', userId);
      const profile = await authService.getProfile(userId);

      if (!profile) {
        // console.warn('[AuthContext] Perfil não encontrado para userId:', userId);
        lastLoadedUserId.current = userId; // Marca como tentado para evitar loop
        return;
      }

      setAvatarUrl(profile.profile_picture_url || null);
      setRoles(profile.roles || []);
      lastLoadedUserId.current = userId;
    } catch (error) {
      console.error('[AuthContext] Erro inesperado ao carregar perfil:', error);
    } finally {
      isFetchingProfile.current = false;
    }
  }, [avatarUrl, roles.length]);

  const protectRoute = (redirectTo: string = '/login') => {
    if (!isLoading && !user) {
      window.location.href = redirectTo;
    }
  };

  useEffect(() => {
    // 🛡️ TRAVA: Evita inicializações duplicadas
    if (isInitializingAuth.current) return;
    isInitializingAuth.current = true;

    // 🎯 DEBUG: Log inicial
    // console.log('[AuthContext] Inicializando autenticação...');

    // 🎯 TIMEOUT DE SEGURANÇA: Força isLoading = false após 5 segundos
    let isLoadingStillTrue = true;
    const timeoutId = setTimeout(() => {
      if (isLoadingStillTrue) {
        console.warn('[AuthContext] Timeout: Forçando isLoading = false após 5s');
        setIsLoading(false);
        isInitializingAuth.current = false;
      }
    }, 5000);

    authService.getSession().then((session) => {
      /* console.log('[AuthContext] Sessão inicial:', {
        hasSession: !!session,
        hasUser: !!session?.user,
        userId: session?.user?.id,
      }); */

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
        // console.log('[AuthContext] Usuário definido:', userData);
      } else {
        // console.log('[AuthContext] Nenhuma sessão encontrada - usuário não autenticado');
        // 🎯 LIMPA ESTADO: Garante que não há usuário quando não há sessão
        setUser(null);
        setAvatarUrl(null);
        setRoles([]);
        lastLoadedUserId.current = null;
      }
      isLoadingStillTrue = false;
      setIsLoading(false);
      isInitializingAuth.current = false;
      clearTimeout(timeoutId);
    }).catch((error) => {
      console.error('[AuthContext] Erro ao buscar sessão:', error);
      // 🎯 ERRO: Limpa estado e força logout em caso de erro crítico
      setUser(null);
      setAvatarUrl(null);
      setRoles([]);
      lastLoadedUserId.current = null;
      isLoadingStillTrue = false;
      setIsLoading(false);
      isInitializingAuth.current = false;
      clearTimeout(timeoutId);
      
      // Se estiver em rota protegida, redireciona
      if (typeof window !== 'undefined') {
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/dashboard') || currentPath.startsWith('/onboarding')) {
          // console.log('[AuthContext] Erro crítico - redirecionando para home');
          window.location.href = '/';
        }
      }
    });

    const subscription = authService.onAuthStateChange((event, session) => {
      // 🛡️ TRAVA: Se já estivermos carregando o perfil ou validando a sessão inicial, ignora eventos redundantes
      // Exceto SIGNED_OUT, que deve ser processado imediatamente
      if ((isFetchingProfile.current || isLoadingStillTrue) && event !== 'SIGNED_OUT') {
        // console.log('[AuthContext] Ignorando evento redundante durante busca de perfil ou validação:', event);
        return;
      }

      // 🚀 LOG: Monitora qual evento de auth está sendo disparado
      // console.log(`[AuthContext] Mudança de autenticação (onAuthStateChange): ${event}`, { userId: session?.user?.id });

      // 🎯 TRATAMENTO: Eventos que indicam sessão inválida
      if (event === 'SIGNED_OUT' || (event === 'TOKEN_REFRESHED' && !session)) {
        // console.log('[AuthContext] Sessão invalidada, limpando estado. Event:', event);
        setUser(null);
        setAvatarUrl(null);
        setRoles([]);
        lastLoadedUserId.current = null;
        isLoadingStillTrue = false;
        setIsLoading(false);
        clearTimeout(timeoutId);
        
        // Se estiver em rota protegida, redireciona para home
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          if (currentPath.startsWith('/dashboard') || currentPath.startsWith('/onboarding')) {
            // console.log('[AuthContext] Redirecionando para home...');
            window.location.href = '/';
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
        
        // Só atualiza o estado se o usuário mudar ou os dados básicos mudarem
        setUser((prevUser: any) => {
          if (prevUser?.id === userData.id && prevUser?.email === userData.email) {
            return prevUser;
          }
          return userData;
        });

        loadProfile(session.user.id);
        // console.log('[AuthContext] Usuário atualizado:', userData);
      } else {
        setUser(null);
        setAvatarUrl(null);
        setRoles([]);
        lastLoadedUserId.current = null;
        // console.log('[AuthContext] Usuário removido');
      }
      isLoadingStillTrue = false;
      setIsLoading(false);
      clearTimeout(timeoutId);
    });

    return () => {
      clearTimeout(timeoutId);
      isInitializingAuth.current = false;
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, []); // 🎯 Estável: Não re-inscreve se o perfil mudar

  const logout = async () => {
    setIsLoggingOut(true);
    try {
      await authService.signOut();
      window.location.href = process.env.NEXT_PUBLIC_BASE_URL || '/';
    } catch (error) {
      console.error('[AuthContext] Erro ao deslogar:', error);
      setIsLoggingOut(false);
    }
  };

  return (
    // O value agora contém exatamente o que a interface descreve
    <AuthContext.Provider
      value={{ user, roles, avatarUrl, logout, isLoading, isLoggingOut, protectRoute }}
    >
      {isLoggingOut && (
        <LoadingScreen message="Encerrando sua sessão com segurança..." fadeOut={false} />
      )}
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
