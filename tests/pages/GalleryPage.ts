import { Page, expect, Locator } from '@playwright/test';

export class GalleryPage {
  readonly createBtn: Locator;
  readonly saveBtn: Locator;
  readonly titleInput: Locator;
  readonly dateInput: Locator;
  readonly clientNameInput: Locator;

  constructor(public readonly page: Page) {
    this.createBtn = page.locator('button:has-text("Nova Galeria")');
    this.saveBtn = page.locator('button[type="submit"]:has-text("Salvar"), button[type="submit"]:has-text("Criar")');
    this.titleInput = page.locator('input[name="title"]');
    this.dateInput = page.locator('input[name="date"]');
    this.clientNameInput = page.locator('input[name="client_name"]');
  }

  async gotoList() {
    await this.page.goto('/dashboard');
  }

  async gotoCreate() {
    await this.page.goto('/dashboard/galerias/new');
  }

  async gotoGallery(slug: string) {
    // A rota varia dependendo se é acesso de admin ou público, vamos usar uma url genérica
    // Supondo que o link público seja /$username/$slug
    // e o admin seja /dashboard/galerias/$slug
    await this.page.goto(`/dashboard/galerias/${slug}`);
  }

  async fillForm(data: { title?: string; clientName?: string; date?: string; category?: string }) {
    if (data.title !== undefined) await this.titleInput.fill(data.title);
    if (data.clientName !== undefined) await this.clientNameInput.fill(data.clientName);
    if (data.date !== undefined) await this.dateInput.fill(data.date);
    if (data.category !== undefined) {
      // O CategorySelect é um select nativo. Usamos evaluate para garantir que o React veja a mudança se necessário.
      const categorySelect = this.page.locator('select[name="category"], select').filter({ hasText: /selecione a categoria/i }).first();
      await categorySelect.selectOption({ label: data.category });
      await categorySelect.evaluate((el: HTMLSelectElement) => {
        el.dispatchEvent(new Event('change', { bubbles: true }));
      });
    }
  }

  async save() {
    // Clica no botão de salvar/criar no rodapé, garantindo que é o botão principal do footer
    const footer = this.page.locator('div.sticky.bottom-0');
    const saveBtn = footer.locator('button').filter({ hasText: /CRIAR|SALVAR ALTERAÇÕES|SALVAR/i }).first();
    await saveBtn.click({ force: true });
  }

  async expectCreatedSuccessfully() {
    // Procura pelo título do modal de sucesso ou qualquer texto de confirmação
    // O BaseModal usa h2 para o título. Aumentamos o timeout para lidar com o delay de 800ms + rede.
    const successHeader = this.page.locator('h2').filter({ hasText: /Galeria (Criada|Atualizada)/i });
    await expect(successHeader).toBeVisible({ timeout: 30000 });
  }

  async expectValidationError() {
    // O formulário exibe toasts de erro ou mensagens nativas.
    // Vamos procurar por elementos com role="alert" ou classes de erro específicas.
    const errorText = this.page.locator('[role="alert"], .text-red-500, .border-red-500').filter({ hasText: /obrigatório|selecione|preencha|inválido|falha|erro/i }).first();
    await expect(errorText).toBeVisible({ timeout: 10000 });
  }

  async expectLimitReached() {
    // Procura por qualquer elemento visível com "Limite Atingido" ou "Upgrade Necessário"
    // Pode ser um h2, h3 ou até um span dependendo do componente.
    const modal = this.page.locator(':visible').filter({ hasText: /Limite Atingido|Upgrade Necessário/i }).first();
    await expect(modal).toBeVisible({ timeout: 15000 });
  }

  async expectNotFound() {
    // Procura por textos comuns de página 404
    const notFoundText = this.page.getByText(/Não encontrada|404|não existe|Ops!/i);
    await expect(notFoundText.first()).toBeVisible({ timeout: 10000 });
  }

  async openGalleryOptions(title: string) {
    // Localiza o card pelo título e clica no botão de menu (três pontos)
    const galleryCard = this.page.locator('div').filter({ hasText: title }).locator('xpath=ancestor::div[contains(@class, "group")]').first();
    const optionsBtn = galleryCard.locator('button').filter({ has: this.page.locator('svg') }).last();
    await optionsBtn.click();
    await this.page.waitForTimeout(1000);
  }

  async togglePublicStatus() {
    // Procura por itens de menu que contenham o texto de alternar status ou exibir no perfil
    const toggleBtn = this.page.locator('[role="menuitem"], button, div').filter({ hasText: /Tornar|Pública|Privada|Exibir no Perfil/i }).locator('button, [role="switch"]').first();
    await toggleBtn.click();
  }

  async fillHiddenInput(name: string, value: string) {
    const input = this.page.locator(`input[type="hidden"][name="${name}"]`);
    await input.fill(value);
    // Dispara eventos para o React notar a mudança e o hook-form validar corretamente
    await input.dispatchEvent('input', { bubbles: true });
    await input.dispatchEvent('change', { bubbles: true });
  }
}
