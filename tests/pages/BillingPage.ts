import { Page, expect, Locator } from '@playwright/test';

export class BillingPage {
  constructor(public readonly page: Page) {}

  async gotoBilling() {
    await this.page.goto('/dashboard/configuracoes/assinatura');
  }

  async requestUpgrade(planName: string) {
    const planCard = this.page.locator(`text=${planName}`).locator('xpath=ancestor::div[contains(@class, "card") or @class="relative"]');
    await planCard.locator('button:has-text("Escolher"), button:has-text("Assinar")').first().click();
  }

  async requestCancellation(reason: string, comment: string) {
    const cancelBtn = this.page.locator('button:has-text("Cancelar Assinatura"), text=Cancelar plano');
    await cancelBtn.click();
    
    // Selecionar o motivo caso seja um select/radio
    const reasonInput = this.page.locator(`input[value="${reason}"]`);
    if (await reasonInput.isVisible()) {
      await reasonInput.check();
    }

    // Preencher comentário
    const commentArea = this.page.locator('textarea');
    if (await commentArea.isVisible()) {
      await commentArea.fill(comment);
    }
    
    await this.page.locator('button:has-text("Confirmar Cancelamento"), button:has-text("Sim, quero cancelar")').click();
  }

  async fillCreditCard(data: { number: string; ccv: string; month: string; year: string }) {
    const cardModal = this.page.locator('text=Dados do Cartão');
    if (await cardModal.isVisible()) {
      await this.page.locator('input[name="cardNumber"]').fill(data.number);
      await this.page.locator('input[name="ccv"]').fill(data.ccv);
      await this.page.locator('input[name="expiryMonth"]').fill(data.month);
      await this.page.locator('input[name="expiryYear"]').fill(data.year);
    }
  }

  async submitPayment() {
    await this.page.locator('button:has-text("Confirmar Pagamento")').click();
  }

  async expectCardError(message: string = 'Transação negada') {
    await expect(this.page.locator(`text=${message}`)).toBeVisible();
  }

  async expectUpgradeSuccess(planName: string) {
    await expect(this.page.locator('text=sucesso, text=Plano Atualizado')).toBeVisible({ timeout: 10000 }).catch(() => null);
    await expect(this.page.locator(`text=PLANO ${planName}, text=PLANO: ${planName}`)).toBeVisible();
  }

  async expectDowngradeScheduled() {
    await expect(this.page.locator('text=Cancelamento agendado, text=expira em')).toBeVisible();
  }
}
