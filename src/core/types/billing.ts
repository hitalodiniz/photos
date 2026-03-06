// src/core/types/billing.ts
// Tipos que espelham tb_billing_profiles, tb_upgrade_requests e payloads Asaas.

// ─── tb_billing_profiles ─────────────────────────────────────────────────────
export interface BillingProfile {
  id: string;
  cpf_cnpj: string;
  cpf_cnpj_type: 'cpf' | 'cnpj';
  postal_code: string;
  address: string;
  address_number: string;
  complement?: string;
  province: string;
  city: string;
  state: string;
  asaas_customer_id?: string;
  created_at: string;
  updated_at: string;
}

// ─── tb_upgrade_requests ─────────────────────────────────────────────────────
export type UpgradeRequestStatus =
  | 'pending'
  | 'processing'
  | 'approved'
  | 'rejected'
  | 'cancelled';
export type BillingType = 'PIX' | 'BOLETO' | 'CREDIT_CARD';

export interface UpgradeRequest {
  id: string;
  profile_id: string;
  plan_key_current: string;
  plan_key_requested: string;
  billing_type: BillingType;
  snapshot_name: string;
  snapshot_cpf_cnpj: string;
  snapshot_email: string;
  snapshot_whatsapp: string;
  snapshot_address: string;
  asaas_customer_id?: string;
  asaas_subscription_id?: string;
  asaas_payment_id?: string;
  payment_url?: string;
  asaas_raw_status?: string;
  status: UpgradeRequestStatus;
  notes?: string;
  processed_at?: string;
  processed_by?: string;
  created_at: string;
  updated_at: string;
}

// ─── Input do UpgradeSheet → server action ───────────────────────────────────
export interface UpgradeRequestPayload {
  plan_key_requested: string;
  billing_type: BillingType;
  /** Segmento do site (PHOTOGRAPHER, EVENT, etc.) para buscar preço em PLANS_BY_SEGMENT */
  segment?: string;
  whatsapp: string;
  cpf_cnpj: string;
  postal_code: string;
  address: string;
  address_number: string;
  complement?: string;
  province: string;
  city: string;
  state: string;
}

// ─── Retorno da server action para o UpgradeSheet ────────────────────────────
export interface UpgradeRequestResult {
  success: boolean;
  payment_url?: string;
  billing_type?: BillingType;
  request_id?: string;
  error?: string;
}

// ─── Respostas da API Asaas ───────────────────────────────────────────────────
export interface AsaasCustomer {
  id: string;
  name: string;
  email: string;
  cpfCnpj: string;
}

export interface AsaasSubscription {
  id: string;
  customer: string;
  billingType: BillingType;
  status: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  value: number;
  nextDueDate: string;
}

export interface AsaasPayment {
  id: string;
  subscription?: string;
  status: string;
  billingType: BillingType;
  value: number;
  dueDate: string;
  invoiceUrl?: string;
  bankSlipUrl?: string;
  pixQrCodeUrl?: string;
}

// ─── Webhook Asaas ───────────────────────────────────────────────────────────
export type AsaasWebhookEvent =
  | 'PAYMENT_CREATED'
  | 'PAYMENT_AWAITING_RISK_ANALYSIS'
  | 'PAYMENT_CONFIRMED'
  | 'PAYMENT_RECEIVED'
  | 'PAYMENT_OVERDUE'
  | 'PAYMENT_DELETED'
  | 'PAYMENT_RESTORED'
  | 'PAYMENT_REFUNDED'
  | 'PAYMENT_CHARGEBACK_REQUESTED'
  | 'PAYMENT_CHARGEBACK_DISPUTE'
  | 'SUBSCRIPTION_CREATED'
  | 'SUBSCRIPTION_CANCELED';

export interface AsaasWebhookPayload {
  event: AsaasWebhookEvent;
  payment: AsaasPayment;
}
