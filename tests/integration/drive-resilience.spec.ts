import { test, expect } from '@playwright/test';
import { GoogleDrivePage } from '../pages/GoogleDrivePage';
import { cleanupAndResetTrialState, injectTestGalleries } from '../utils/db-cleanup';

const USER_EMAIL = 'hitalodiniz80@gmail.com';

test.describe('Domínio: Resiliência Google Drive', () => {
  let drivePage: GoogleDrivePage;

  test.beforeEach(async ({ page }) => {
    drivePage = new GoogleDrivePage(page);
    await cleanupAndResetTrialState(USER_EMAIL, { plan_key: 'PRO' });
  });

  test('Mocks: Tratar erro 403 (Permissão Negada) no carregamento de fotos', async ({ page }) => {
    await test.step('Mock de Erro 403 do Google', async () => {
      await injectTestGalleries(USER_EMAIL, 1);
      await drivePage.mockDriveErrorResponse(403);
    });

    await test.step('Acessar galeria e validar feedback de erro', async () => {
      await page.goto('/dashboard');
      await page.reload({ waitUntil: 'networkidle' });
      // Clica no card da galeria
      await page.locator('.group.relative').first().click();
      await drivePage.expectPermissionError();
    });
  });

  test('Mocks: Tratar erro 401 (Token Expirado) forçando reconexão', async ({ page }) => {
    await test.step('Mock de Erro 401 do Google', async () => {
      await injectTestGalleries(USER_EMAIL, 1);
      await drivePage.mockDriveErrorResponse(401);
    });

    await test.step('Validar exibição do botão de reconexão', async () => {
      await page.goto('/dashboard');
      await page.locator('.group.relative').first().click();
      await drivePage.expectAuthError();
    });
  });

  test('Fluxo Feliz: Listagem de fotos com sucesso via Mock', async ({ page }) => {
    await test.step('Mock de Sucesso (5 fotos)', async () => {
      await injectTestGalleries(USER_EMAIL, 1);
      await drivePage.mockDriveSuccessResponse(5);
    });

    await test.step('Acessar galeria e validar renderização das imagens', async () => {
      await page.goto('/dashboard');
      await page.locator('.group.relative').first().click();
      await drivePage.expectPhotosLoaded(5);
    });
  });
});
