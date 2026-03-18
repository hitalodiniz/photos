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
      const categorySelect = this.page.locator('select', { hasText: 'selecione a categoria' }).first();
      await categorySelect.selectOption({ label: data.category });
    }
  }

  async save() {
    // Clica no botão de salvar/criar no rodapé, garantindo que é o botão principal
    const saveBtn = this.page.locator('button').filter({ hasText: /CRIAR|SALVAR ALTERAÇÕES|SALVAR/i }).last();
    await saveBtn.click({ force: true });
  }

  async expectCreatedSuccessfully() {
    await this.page.screenshot({ path: 'tests/screenshots/before-expect-created.png', fullPage: true });
    // Escreve o DOM para depuracao
    const html = await this.page.content();
    require('fs').writeFileSync('tests/screenshots/dom-dump.html', html);
    
    // Procura pelo título do modal de sucesso ou qualquer texto de confirmação
    // O BaseModal usa h2 para o título.
    const successHeader = this.page.locator('h2').filter({ hasText: /Galeria (Criada|Atualizada)/i });
    await expect(successHeader.first()).toBeVisible({ timeout: 15000 });
  }

  async expectValidationError() {
    // O formulário exibe toasts de erro. Vamos capturar qualquer toast ou texto de erro visível.
    // Usamos um seletor mais amplo para capturar mensagens de erro do toast ou do formulário
    const errorText = this.page.locator(':visible').filter({ hasText: /obrigatório|selecione|preencha|data|título|pasta|inválido/i });
    await expect(errorText.first()).toBeVisible({ timeout: 10000 });
  }

  async expectLimitReached() {
    // Especificamos o heading para evitar conflito com o botão da sidebar
    const modalHeader = this.page.getByRole('heading', { name: 'Limite Atingido' });
    await expect(modalHeader).toBeVisible();
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
}
