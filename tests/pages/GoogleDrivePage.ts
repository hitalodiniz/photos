import { Page, expect } from '@playwright/test';

export class GoogleDrivePage {
  constructor(public readonly page: Page) {}

  async mockDriveErrorResponse(statusCode: number = 403) {
    await this.page.route('**/api/galeria/*/photos*', async (route) => {
      let message = 'Permission denied';
      if (statusCode === 401) message = 'Unauthorized';
      
      await route.fulfill({
        status: statusCode,
        contentType: 'application/json',
        body: JSON.stringify({ error: { message } })
      });
    });
  }

  async mockDriveCreateFolderSuccess() {
    await this.page.route('**/api/drive/create-folder', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ 
          success: true, 
          folderId: 'new-folder-id-123',
          folderName: 'Pasta E2E Drive'
        }),
      });
    });
  }

  async mockDriveSuccessResponse(photosCount: number = 5) {
    const mockPhotos = Array.from({ length: photosCount }).map((_, i) => ({
      id: `photo-${i}`,
      name: `IMG_${i}.jpg`,
      thumbnailUrl: `https://mock.url/photo-${i}.jpg`
    }));

    await this.page.route('**/api/galeria/*/photos*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ files: mockPhotos })
      });
    });
  }

  async expectPermissionError() {
    await expect(this.page.locator('text=Permission denied, text=Sem permissão, text=Erro ao acessar as fotos, text=pasta privada')).toBeVisible();
  }

  async expectAuthError() {
    await expect(this.page.locator('text=reconectar, text=sessão expirada, text=Unauthorized, text=Conectar Google Drive')).toBeVisible();
  }

  async expectPhotosLoaded(count: number) {
    // Exemplo: espera que a quantidade de imagens renderizadas com a classe ou alt apropriado seja o count
    // Isso depende fortemente da UI
    const images = this.page.locator('img[src*="mock.url"]');
    await expect(images).toHaveCount(count);
  }
}
