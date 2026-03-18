import { test as setup } from '@playwright/test';
import * as path from 'path';

const authFile = 'playwright/.auth/user.json';

setup('authenticate', async ({ page }) => {
  // 1. Remove o timeout global para este teste de setup manual
  setup.setTimeout(0);

  await page.goto('/dashboard');

  console.log('Esperando login manual e onboarding...');

  // 2. Aguarda a URL do dashboard sem limite de tempo (ou com timeout longo)
  // O script só continuará após você chegar no dashboard com sucesso.
  await page.waitForURL('**/dashboard', { timeout: 0 });

  // Salvar o estado de autenticação
  await page.context().storageState({ path: authFile });

  console.log('Sessão salva em:', path.resolve(authFile));
});
