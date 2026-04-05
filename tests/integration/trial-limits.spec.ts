import { test, expect } from '@playwright/test';
import {
  cleanupAndResetTrialState,
  injectTestGalleries,
} from '../utils/db-cleanup';
// Importamos a fonte de verdade para os limites
import { MAX_GALLERIES_HARD_CAP_BY_PLAN } from '../../src/core/config/plans';

const USER_EMAIL = 'hitalodiniz80@gmail.com';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// O limite do plano gratuito é o que nos importa para estourar
const FREE_LIMIT = MAX_GALLERIES_HARD_CAP_BY_PLAN.FREE; // ex: 3
const GALLERIES_TO_INJECT = FREE_LIMIT + 1; // Injeta apenas 4 para provar que excedeu o FREE

// Helper para limpar o cache do Next.js via API
async function forceRevalidate(playwright: any, userId: string) {
  const apiContext = await playwright.request.newContext();
  const response = await apiContext.post(`${APP_URL}/api/test/revalidate`, {
    data: { userId, secret: process.env.TEST_REVALIDATE_SECRET },
  });
  if (!response.ok()) throw new Error('Falha na revalidação de cache');
}

test.describe('Ciclo de Vida do Usuário: Trial PRO -> Expiração FREE', () => {
  let userId: string;

  // 1. SETUP INICIAL: Usuário entra no TRIAL PRO (14 dias)
  test.beforeAll(async ({ playwright }) => {
    console.log(`--- SETUP: Iniciando Trial PRO de 14 dias ---`);
    userId = await cleanupAndResetTrialState(USER_EMAIL, {
      plan_key: 'PRO',
      is_trial: true,
      expires_in_days: 14,
      keep_galleries: false, // Limpa tudo para começar do zero
    });
    
    // Injetamos as galerias no banco para ignorar o teste de interface de criacao
    // Injetamos apenas FREE_LIMIT + 1 para provar o bloqueio posterior
    await injectTestGalleries(USER_EMAIL, GALLERIES_TO_INJECT);
    await forceRevalidate(playwright, userId);
  });

  test(`Fase 1: Trial PRO deve permitir exceder o limite do FREE (${FREE_LIMIT} galerias)`, async ({
    page,
  }) => {
    // Evita o cache agressivo do router do Next (App Router)
    await page.goto('/dashboard');
    await page.reload({ waitUntil: 'networkidle' });

    // No PRO, o botão "Nova Galeria" deve estar livre (não deve haver o banner de limite)
    const limiteAtingidoBtn = page.locator('text=Limite atingido — Upgrade');
    await expect(limiteAtingidoBtn).not.toBeVisible();

    // Valida que as galerias injetadas estao na tela
    const count = await page.locator('text=Galeria Injetada').count();
    expect(count).toBeGreaterThanOrEqual(GALLERIES_TO_INJECT);
    
    console.log(`Fase 1 completa: ${GALLERIES_TO_INJECT} galerias exibidas no PRO sem bloqueios.`);
  });

  // 2. TRANSIÇÃO: Simulamos que o Trial expirou e o usuário caiu para o FREE
  test(`Fase 2: Após expiração, o plano FREE bloqueia a criação com ${GALLERIES_TO_INJECT} galerias ativas`, async ({
    page,
    playwright,
  }) => {
    console.log('--- MUDANÇA DE ESTADO: Simulando Expiração para FREE ---');

    // Atualizamos o banco: Downgrade para FREE, Fim do Trial, mas MANTÉM as galerias injetadas
    await cleanupAndResetTrialState(USER_EMAIL, {
      plan_key: 'FREE',
      is_trial: false,
      keep_galleries: true, // CRUCIAL: Mantém as galerias que criamos acima do limite
    });

    await forceRevalidate(playwright, userId);

    await page.goto('/dashboard');
    await page.reload({ waitUntil: 'networkidle' });

    // Agora o sistema deve mostrar que ele está no limite ou excedeu (pois 4 > 3)
    const limiteAtingidoBtn = page.locator('text=Limite atingido — Upgrade');
    await expect(limiteAtingidoBtn).toBeVisible();

    // Validar que o botão principal "Nova Galeria" está desabilitado
    const novaGaleriaBtn = page.locator('button:has-text("Nova Galeria")');
    await expect(novaGaleriaBtn).toBeDisabled();

    // Clicar no botão/badge de limite atingido na sidebar para forçar o Modal de Upsell
    await limiteAtingidoBtn.click();

    // O modal de bloqueio deve abrir
    const upgradeModal = page.locator('text=Limite Atingido');
    await expect(upgradeModal).toBeVisible();

    // Screenshot para provar o bloqueio por excesso de galerias no FREE
    await page.screenshot({
      path: 'tests/screenshots/lifecycle-blocked-free.png',
    });
    console.log(`Fase 2 completa: Bloqueio validado com sucesso no plano FREE.`);
  });
});
