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
    const url = await getAvatarUrl(userId);
    setAvatarUrl(url);
  };

  const protectRoute = (redirectTo: string = '/login') => {
    if (!isLoading && !user) {
      window.location.href = redirectTo;
    }
  };

  useEffect(() => {
    authService.getSession().then((session) => {
      if (session?.user) {
        setUser({
          id: session.user.id,
          email: session.user.email,
          name:
            session.user.user_metadata?.full_name ||
            session.user.email?.split('@')[0],
        });
        loadProfile(session.user.id);
      }
      setIsLoading(false);
    });

    const subscription = authService.onAuthStateChange((event, session) => {
      if (session?.user) {
        setUser({ id: session.user.id, email: session.user.email });
        loadProfile(session.user.id);
      } else {
        setUser(null);
        setAvatarUrl(null);
      }
      setIsLoading(false);
    });

    return () => {
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
