import type { Galeria } from '@/core/types/galeria';
import type { Profile } from '@/core/types/profile';

export interface PendingPaymentRequest {
  id: string;
  payment_url: string;
  amount_final: number;
  due_date: string | null;
  billing_type?: string | null;
  status?: string | null;
  asaas_subscription_id?: string | null;
  asaas_raw_status?: string | null;
  plan_key_requested?: string | null;
  billing_period?: string | null;
}

export interface ScheduledCancellationInfo {
  request_id: string;
  access_ends_at: string | null;
}

export interface DashboardProps {
  initialGalerias: Galeria[];
  initialProfile: Profile;
  latestPendingRequest?: PendingPaymentRequest | null;
  scheduledCancellation?: ScheduledCancellationInfo | null;
  /** Quando preenchido, o dashboard está em modo suporte (galerias do usuário alvo). */
  impersonateUserId?: string;
}
