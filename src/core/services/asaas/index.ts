// src/core/services/asaas/index.ts

// ─── API ─────────────────────────────────────────────────────────────────────
export * from './api/client';
export * from './api/customers';
export * from './api/subscriptions';
export * from './api/payments';
export * from './api/pix';

// ─── Billing ─────────────────────────────────────────────────────────────────
export * from './billing/billing-profile';
export * from './billing/pro-rata';

// ─── Gallery ─────────────────────────────────────────────────────────────────
export * from './gallery/adjustments';

// ─── Utils ───────────────────────────────────────────────────────────────────
export * from './utils/constants';
export * from './utils/dates';
export * from './utils/formatters';

// ─── Types ───────────────────────────────────────────────────────────────────
export * from './types';

// ─── Nota ────────────────────────────────────────────────────────────────────
// As funções complexas de upgrade, downgrade e cancelamento ainda estão
// no arquivo original (asaas.service.ts) e serão migradas posteriormente.
// Por ora, continue importando do arquivo original para essas funções:
// - requestUpgrade
// - getUpgradePreview
// - handleSubscriptionCancellation
// - performDowngradeToFree
// - checkAndApplyExpiredSubscriptions
// - getCurrentPaymentMethodSummary
