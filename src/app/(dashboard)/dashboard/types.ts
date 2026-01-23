import type { Galeria } from '@/core/types/galeria';

export interface PhotographerProfile {
  id: string;
  username: string;
  full_name: string;
  google_refresh_token?: string | null;
  sidebar_collapsed?: boolean;
  mini_bio?: string | null;
  roles?: string[];
}

export interface DashboardProps {
  initialGalerias: Galeria[];
  initialProfile: PhotographerProfile | null;
}
