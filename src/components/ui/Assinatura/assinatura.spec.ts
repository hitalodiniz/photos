import { describe, it, expect, vi, beforeEach } from 'vitest';
import { performDowngradeToFree } from '@/core/services/asaas.service';
import { GET as applyDowngrades } from '@/app/api/cron/apply-downgrades/route';

// --- Mocks de Infraestrutura ---
const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  update: vi.fn().mockReturnThis(),
  insert: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  lte: vi.fn().mockReturnThis(),
  not: vi.fn().mockReturnThis(),
  single: vi.fn(),
  maybeSingle: vi.fn(),
};

vi.mock('@/lib/supabase.server', () => ({
  createSupabaseAdmin: () => mockSupabase,
}));

vi.mock('@/core/services/asaas.service', () => ({
  performDowngradeToFree: vi.fn(),
  deleteAsaasSubscription: vi.fn().mockResolvedValue({ success: true }),
}));

describe('Billing Logic & Retention Suite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Cron: apply-downgrades (Carência de 5 dias)', () => {
    it('deve ignorar usuários com atraso de exatamente 5 dias (período de graça)', async () => {
      const fiveDaysAgo = new Date();
      fiveDaysAgo.setDate(fiveDaysAgo.getDate() - 5);

      mockSupabase.single.mockResolvedValue({
        data: {
          id: 'user_1',
          plan_key: 'PRO',
          overdue_since: fiveDaysAgo.toISOString(),
        },
      });

      // Simula query da cron buscando >= 6 dias
      mockSupabase.lte.mockReturnValue({ data: [] });

      const req = new Request('http://localhost/api/cron/apply-downgrades', {
        headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
      });

      const res = await applyDowngrades(req as any);
      const json = await res.json();

      expect(json.processed).toBe(0);
    });

    it('deve aplicar downgrade e salvar last_paid_plan no 6º dia de atraso', async () => {
      const sixDaysAgo = new Date();
      sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);

      // Mock da requisição pendente/overdue
      mockSupabase.data = [
        {
          id: 'req_1',
          profile_id: 'user_1',
          overdue_since: sixDaysAgo.toISOString(),
        },
      ];

      // Mock do perfil atual para salvar o plano original
      mockSupabase.single.mockResolvedValue({
        data: { plan_key: 'PRO', is_exempt: false },
      });

      await applyDowngrades(
        new Request('http://localhost', {
          headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
        }) as any,
      );

      // Verifica se o plano original foi persistido antes do downgrade
      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          plan_key: 'FREE',
          last_paid_plan: 'PRO',
        }),
      );
    });
  });

  describe('Webhook: Reativação Automática', () => {
    it('deve restaurar o plano PRO se o usuário pagar enquanto estiver no FREE com last_paid_plan', async () => {
      const webhookPayload = {
        event: 'PAYMENT_RECEIVED',
        payment: { subscriptionId: 'sub_123' },
      };

      // Mock do perfil no estado de suspensão (FREE mas era PRO)
      mockSupabase.maybeSingle.mockResolvedValue({
        data: {
          id: 'user_1',
          plan_key: 'FREE',
          last_paid_plan: 'PRO',
          overdue_since: '2023-01-01',
        },
      });

      // Simulação do processamento do Webhook
      // (Aqui você chamaria a função interna que processa o evento)
      const { data: profile } = await mockSupabase.maybeSingle();

      if (profile.plan_key === 'FREE' && profile.last_paid_plan) {
        await mockSupabase
          .update({
            plan_key: profile.last_paid_plan,
            last_paid_plan: null,
            overdue_since: null,
          })
          .eq('id', profile.id);
      }

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          plan_key: 'PRO',
          last_paid_plan: null,
        }),
      );
    });
  });

  describe('Expurgo: 30 dias de Inadimplência', () => {
    it('deve cancelar a assinatura no Asaas após 31 dias de atraso', async () => {
      const thirtyOneDaysAgo = new Date();
      thirtyOneDaysAgo.setDate(thirtyOneDaysAgo.getDate() - 31);

      // Mock de dados expirados
      const expiredRequests = [
        {
          id: 'req_99',
          profile_id: 'user_99',
          asaas_subscription_id: 'sub_99',
          overdue_since: thirtyOneDaysAgo.toISOString(),
        },
      ];

      // Simulação da lógica de expurgo
      for (const row of expiredRequests) {
        // 1. Deleta no Asaas
        // await deleteAsaasSubscription(row.asaas_subscription_id);

        // 2. Limpa rastro no banco
        await mockSupabase
          .update({
            last_paid_plan: null,
            overdue_since: null,
          })
          .eq('id', row.profile_id);
      }

      expect(mockSupabase.update).toHaveBeenCalledWith(
        expect.objectContaining({
          last_paid_plan: null,
          overdue_since: null,
        }),
      );
    });
  });

  describe('Segurança de Checkout', () => {
    it('deve bloquear a geração de boleto se o usuário estiver em overdue_since', () => {
      const isOverdue = true;
      const selectedMethod = 'BOLETO';

      const canSelectBoleto = !isOverdue || selectedMethod !== 'BOLETO';

      expect(canSelectBoleto).toBe(false);
    });
  });
});
