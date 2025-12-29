import { PlanKey } from "@/config/plans";

export interface Subscription {
  id: string;
  userId: string;
  plan: PlanKey;
  status: 'active' | 'past_due' | 'canceled' | 'incomplete';
  currentPeriodEnd: Date;
  cancelAtPeriodEnd: boolean;
}

export interface CheckoutSessionResponse {
  sessionId: string;
  url: string;
}