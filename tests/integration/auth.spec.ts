import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/AuthPage';
import { cleanupAndResetTrialState } from '../utils/db-cleanup';

const USER_EMAIL = 'hitalodiniz80@gmail.com';

test.describe('Domínio: Autenticação e Middleware', () => {
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
    // Mandatory: Clean database before each scenario
    await cleanupAndResetTrialState(USER_EMAIL, { plan_key: 'FREE' });
  });

  test('Fluxo Feliz: Usuário logado deve acessar o Dashboard diretamente', async ({ page }) => {
    await test.step('Navegar para o Dashboard', async () => {
      await authPage.gotoDashboard();
    });

    await test.step('Validar permanência na rota protegida', async () => {
      await expect(page).toHaveURL(/.*\/dashboard/);
      await expect(page.locator('text=Galerias')).toBeVisible();
    });
  });

  test('Dados Inválidos: Redirecionar para Login ao acessar com sessão expirada', async ({ page }) => {
    await test.step('Simular expiração de sessão (limpar cookies e localStorage)', async () => {
      await authPage.clearSession();
    });

    await test.step('Tentar acessar Dashboard', async () => {
      await authPage.gotoDashboard();
    });

    await test.step('Validar redirecionamento para Home/Login', async () => {
      await authPage.expectRedirectToLogin();
    });
  });
});
