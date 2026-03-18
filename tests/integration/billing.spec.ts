import { test, expect } from '@playwright/test';
import { BillingPage } from '../pages/BillingPage';
import { cleanupAndResetTrialState } from '../utils/db-cleanup';

const USER_EMAIL = 'hitalodiniz80@gmail.com';

test.describe('Domínio: Faturamento e Assinaturas (Asaas)', () => {
  let billingPage: BillingPage;

  test.beforeEach(async ({ page }) => {
    billingPage = new BillingPage(page);
    await cleanupAndResetTrialState(USER_EMAIL, { plan_key: 'FREE' });
    await billingPage.gotoBilling();
    await page.reload({ waitUntil: 'networkidle' });
  });

  test('Fluxo Feliz: Upgrade de plano com sucesso e revalidação de cache', async ({ page }) => {
    await test.step('Mock da API de Upgrade com Sucesso', async () => {
      await page.route('**/api/subscription/upgrade', async (route) => {
        await route.fulfill({ status: 200, body: JSON.stringify({ success: true }) });
      });
    });

    await test.step('Iniciar upgrade para PRO', async () => {
      await billingPage.requestUpgrade('PRO');
    });

    await test.step('Preencher formulário de pagamento', async () => {
      await billingPage.fillCreditCard({
        number: '4444 4444 4444 4444',
        ccv: '123',
        month: '12',
        year: '2030'
      });
      await billingPage.submitPayment();
    });

    await test.step('Validar sucesso e alteração de plano na UI', async () => {
      await billingPage.expectUpgradeSuccess('PRO');
    });
  });

  test('Dados Inválidos: Transação negada pelo cartão', async ({ page }) => {
    await test.step('Mock de Erro 400 (Cartão Negado)', async () => {
      await page.route('**/api/subscription/upgrade', async (route) => {
        await route.fulfill({ 
          status: 400, 
          body: JSON.stringify({ success: false, error: 'Transação negada' }) 
        });
      });
    });

    await test.step('Tentar upgrade com cartão inválido', async () => {
      await billingPage.requestUpgrade('PRO');
      await billingPage.fillCreditCard({ number: '1234', ccv: '000', month: '01', year: '2022' });
      await billingPage.submitPayment();
    });

    await test.step('Validar feedback de erro no modal', async () => {
      await billingPage.expectCardError('Transação negada');
    });
  });

  test('Resiliência: Cancelamento agendado deve mostrar status correto', async ({ page }) => {
    await test.step('Configurar usuário como PRO ativo', async () => {
      await cleanupAndResetTrialState(USER_EMAIL, { plan_key: 'PRO', is_trial: false });
      await page.reload({ waitUntil: 'networkidle' });
    });

    await test.step('Processar cancelamento', async () => {
      await page.route('**/api/subscription/cancel', async (route) => {
        await route.fulfill({ 
          status: 200, 
          body: JSON.stringify({ success: true, type: 'scheduled_cancellation' }) 
        });
      });
      await billingPage.requestCancellation('too_expensive', 'Ajuste de custos');
    });

    await test.step('Validar label de cancelamento agendado', async () => {
      await billingPage.expectDowngradeScheduled();
    });
  });
});
