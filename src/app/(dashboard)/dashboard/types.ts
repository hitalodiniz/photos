import type { Galeria } from '@/core/types/galeria';
import type { Profile } from '@/core/types/profile';

export interface DashboardProps {
  initialGalerias: Galeria[];
  initialProfile: Profile;
  /** Quando preenchido, o dashboard está em modo suporte (galerias do usuário alvo). */
  impersonateUserId?: string;
}
