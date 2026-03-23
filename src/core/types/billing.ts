// src/core/types/billing.ts
// Tipos que espelham tb_billing_profiles, tb_upgrade_requests e payloads Asaas.

export type BillingPeriod = 'monthly' | 'semiannual' | 'annual';

// ─── tb_billing_profiles ─────────────────────────────────────────────────────
export interface BillingProfile {
  id: string;
  /** Nome completo para cobrança/NF-e (pode diferir do nome do perfil). */
  full_name?: string;
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
  | 'pending_cancellation'
  | 'pending_downgrade'
  | 'pending_change' // ← NOVO: intenção de downgrade agendada fora dos 7 dias
  | 'rejected'
  | 'cancelled';

export type BillingType = 'PIX' | 'BOLETO' | 'CREDIT_CARD';

export interface UpgradeRequest {
  id: string;
  profile_id: string;
  plan_key_current: string;
  plan_key_requested: string;
  billing_type: BillingType;
  billing_period: BillingPeriod;
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
  /** Preço base (effectiveMonthly × months), sem descontos. */
  amount_original: number;
  /** Desconto aplicado (ex: 10% PIX em períodos não-mensais). */
  amount_discount: number;
  /** Valor final cobrado (amount_original − amount_discount). */
  amount_final: number;
  /** Número de parcelas (1 para PIX/BOLETO ou mensal; 1-3 semestral CC; 1-6 anual CC). */
  installments: number;
  notes?: string;
  processed_at?: string;
  /** Data efetiva do cancelamento agendado (espelha endDate no Asaas). */
  scheduled_cancel_at?: string | null;
  processed_by?: string;
  created_at: string;
  updated_at: string;
}

// ─── Input do UpgradeSheet → server action ───────────────────────────────────
/** Dados do cartão (apenas para billing_type CREDIT_CARD). Nunca logar ou expor. */
export interface CreditCardPayload {
  credit_card_holder_name: string;
  credit_card_number: string;
  credit_card_expiry_month: string; // "01" a "12"
  credit_card_expiry_year: string; // "2025" ou "25"
  credit_card_ccv: string;
}

export interface UpgradeRequestPayload {
  plan_key_requested: string;
  /** Código do cupom opcional (tb_coupons.code). */
  coupon_code?: string;
  billing_type: BillingType;
  billing_period: BillingPeriod;
  /** Nome completo para cobrança/NF-e (pode diferir do nome do perfil). */
  full_name: string;
  /** Número de parcelas escolhido pelo usuário (1-6 para cartão, sempre 1 para PIX/BOLETO). */
  installments: number;
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
  /** Obrigatório quando billing_type === 'CREDIT_CARD' */
  credit_card?: CreditCardPayload;
  /** Quando true, reutiliza cartão já cadastrado no Asaas (não envia novo cartão). */
  use_saved_card?: boolean;
}

// ─── Retorno da server action para o UpgradeSheet ────────────────────────────
export interface UpgradeRequestResult {
  success: boolean;
  payment_url?: string;
  /** Base64 do QR Code PIX (apenas quando billing_type === 'PIX'). */
  pix_qr_code_base64?: string;
  /** Payload PIX copia e cola (apenas quando billing_type === 'PIX'). */
  pix_copy_paste?: string;
  billing_type?: BillingType;
  request_id?: string;
  /** Preenchido quando a solicitação é downgrade: data em que a mudança será efetivada. */
  downgrade_effective_at?: string;
  /** Data de vencimento da cobrança (YYYY-MM-DD), vinda do Asaas; usado na tela "Boleto gerado". */
  payment_due_date?: string;
  /** Aviso quando o pagamento anterior já estava RECEIVED/CONFIRMED (valor será crédito no novo plano). */
  warning?: string;
  error?: string;
  /**
   * NOVO: quando true, o downgrade foi agendado (fora da janela de arrependimento).
   * O usuário mantém o plano atual até current_plan_expires_at.
   */
  is_scheduled_change?: boolean;
  /** Data em que o plano atual expira e a mudança será aplicada. */
  scheduled_change_effective_at?: string;
}

// ─── Cálculo de upgrade/downgrade (pro-rata e preview) ──────────────────────
export interface UpgradePriceCalculation {
  type: 'upgrade' | 'downgrade' | 'current_plan';
  /** Preço base do novo plano (sem descontos). */
  amount_original: number;
  /** Crédito pro-rata + desconto PIX. */
  amount_discount: number;
  /** Valor líquido a pagar. Zero em downgrade ou upgrade gratuito. */
  amount_final: number;
  /** Crédito pelos dias restantes do plano atual. */
  residual_credit: number;
  /** Desconto PIX aplicado sobre a diferença (apenas upgrade). */
  pix_discount_amount?: number;
  /** Data em que o plano atual expira. */
  current_plan_expires_at: string;
  /** Para downgrade: data em que a mudança será efetivada. */
  downgrade_effective_at?: string;
  /** Upgrade gratuito: saldo residual cobre o valor total do novo plano. */
  is_free_upgrade?: boolean;
  /** Nova data de expiração calculada (upgrade gratuito ou ciclo normal). */
  new_expiry_date?: string;
  /** Mensalidades cobertas pelo saldo (upgrade gratuito). */
  free_upgrade_months_covered?: number;
  /** Dias cobertos pelo saldo. */
  free_upgrade_days_extended?: number;
  /** Downgrade dentro da janela de arrependimento (≤ 7 dias). */
  is_downgrade_withdrawal_window?: boolean;
  /** Dias desde a compra. */
  days_since_purchase?: number;
  /** Forma de pagamento vigente da assinatura atual (quando aplicável). */
  current_billing_type?: BillingType | null;
  /** Cupom aplicado no preview/cobrança. */
  coupon_code_applied?: string | null;
  /** Valor descontado via cupom na cobrança atual. */
  coupon_discount_amount?: number;
  /** Regra de persistência do cupom: somente 1ª cobrança ou recorrente. */
  coupon_apply_mode?: 'once' | 'forever';
}

export interface UpgradePreviewResult {
  success: boolean;
  has_active_plan: boolean;
  is_current_plan?: boolean;
  has_pending?: boolean;
  /**
   * NOVO: usuário já tem um pending_change ativo para este plano.
   * Usado para exibir banner "Mudança já agendada para X".
   */
  has_scheduled_change?: boolean;
  /** ISO string do vencimento atual quando há pending_change. */
  scheduled_change_effective_at?: string;
  /** Plano agendado quando há pending_change. */
  scheduled_change_plan_key?: string;
  calculation?: UpgradePriceCalculation;
  error?: string;
}

// ─── Retorno de handleSubscriptionCancellation ───────────────────────────────
export interface CancellationResult {
  success: boolean;
  type?: 'refund_immediate' | 'scheduled_cancellation';
  access_ends_at?: string;
  needs_adjustment?: boolean;
  excess_galleries?: Array<{ id: string; title: string }>;
  error?: string;
}

// ─── Retorno de checkAndApplyExpiredSubscriptions ────────────────────────────
export interface ExpiredSubscriptionCheck {
  applied: boolean;
  needs_adjustment: boolean;
  excess_galleries: Array<{ id: string; title: string }>;
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

// ─── Resumo do método de pagamento atual ─────────────────────────────────────
export interface PaymentMethodSummary {
  billing_type: BillingType | null;
  card_last4?: string;
  card_brand?: string;
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
  | 'SUBSCRIPTION_CANCELED'
  | 'SUBSCRIPTION_DELETED';

export interface AsaasWebhookPayload {
  event: AsaasWebhookEvent;
  payment: AsaasPayment;
}
