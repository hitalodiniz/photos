import { test, expect } from '@playwright/test';
import { GalleryPage } from '../pages/GalleryPage';
import { GoogleDrivePage } from '../pages/GoogleDrivePage';
import { cleanupAndResetTrialState, injectTestGalleries } from '../utils/db-cleanup';

const USER_EMAIL = 'hitalodiniz80@gmail.com';

test.describe('Integração Google Drive: Testes de Tolerância a Falhas (Resiliência)', () => {
  let galleryPage: GalleryPage;
  let drivePage: GoogleDrivePage;

  test.beforeEach(async ({ page }) => {
    galleryPage = new GalleryPage(page);
    drivePage = new GoogleDrivePage(page);

    await test.step('Acessar Dashboard como usuário PRO Limpo', async () => {
      await cleanupAndResetTrialState(USER_EMAIL, {
        plan_key: 'PRO',
        is_trial: false,
      });
      await galleryPage.gotoList();
    });
  });

  test('Fluxo Feliz: Criação de Pasta Transparente via Google Drive API', async ({ page }) => {
    await test.step('Mockar 200 na criação de pasta remota', async () => {
      await page.route('**/api/drive/create-folder', async (route) => {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ 
            success: true, 
            folderId: 'e2e-folder-mock-999',
            folderName: 'E2E Casamento Drive'
          }),
        });
      });
    });

    await test.step('Preencher formulário completo da galeria', async () => {
      await galleryPage.gotoCreate();
      await galleryPage.fillForm({
        title: 'Galeria Integrada',
        clientName: 'Google Fan',
        date: '2026-10-10'
      });
    });

    await test.step('Apertar botão "Criar nova pasta no Drive" e validar sucesso', async () => {
      const createDriveFolderBtn = page.locator('button:has-text("Criar nova pasta no Drive")');
      if (await createDriveFolderBtn.isVisible()) {
        await createDriveFolderBtn.click();
        
        // Deve exibir que a pasta foi criada e atrelada em tempo real na interface
        await expect(page.locator('text=Pasta vinculada: E2E Casamento Drive')).toBeVisible();
      }
    });

    await test.step('Salvar Galeria com a ref do FolderId gravada', async () => {
      await galleryPage.save();
      await expect(page).toHaveURL(/.*\/dashboard/);
    });
  });

  test('Resiliência: Erro de Permissão 403 ao renderizar visualização do cliente', async ({ page }) => {
    await test.step('Injetar Galeria Teste no Banco', async () => {
      await injectTestGalleries(USER_EMAIL, 1);
      await page.reload({ waitUntil: 'networkidle' });
    });

    await test.step('Mockar erro 403 (Permission denied) via API do Drive na leitura', async () => {
      // Método mapeado no POM para a rota /api/galeria/[slug]/photos
      await drivePage.mockDriveErrorResponse(403);
    });

    await test.step('Abrir Galeria Pública', async () => {
      // Simula abrir visualização pública (ou página interna de fotos)
      const firstGallery = page.locator('text=Galeria Injetada 1').locator('..').locator('..');
      await firstGallery.locator('a, button:has-text("Ver fotos"), button:has-text("Visualizar")').first().click();
    });

    await test.step('UI mostra Fallback de "Acesso Negado"', async () => {
      // O app deve exibir o placeholder customizado e nunca quebrar em White Screen of Death
      await expect(page.locator('text=Permission denied, text=Sem permissão, text=Erro ao acessar as fotos, text=pasta privada')).toBeVisible();
    });
  });

  test('Resiliência: Erro 401 (Refresh Token Expirado/Revogado) exige ação de "Reconectar"', async ({ page }) => {
    await test.step('Injetar Galeria Teste no Banco', async () => {
      await injectTestGalleries(USER_EMAIL, 1);
      await page.reload({ waitUntil: 'networkidle' });
    });

    await test.step('Mockar erro 401 (Unauthorized)', async () => {
      await drivePage.mockDriveErrorResponse(401);
    });

    await test.step('Acessar fotos', async () => {
      const firstGallery = page.locator('text=Galeria Injetada 1').locator('..').locator('..');
      await firstGallery.locator('a, button:has-text("Ver fotos"), button:has-text("Visualizar")').first().click();
    });

    await test.step('UI solicita Botão de reconectar Google', async () => {
      // Valida o mapeamento feito pelo QA (Reconectar / Sessão Expirada / Auth Expirado)
      await expect(page.locator('text=reconectar, text=sessão expirada, text=Unauthorized, text=Conecte')).toBeVisible();
    });
  });
});
