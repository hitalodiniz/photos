import { Page, expect } from '@playwright/test';

export class AuthPage {
  constructor(public readonly page: Page) {}

  async gotoLogin() {
    await this.page.goto('/');
  }

  async gotoDashboard() {
    await this.page.goto('/dashboard');
  }

  async clearSession() {
    // Clear cookies/local storage to simulate expired session
    await this.page.context().clearCookies();
    await this.page.evaluate(() => localStorage.clear());
  }

  async expectRedirectToLogin() {
    await expect(this.page).toHaveURL('/');
  }

  async expectRedirectToOnboarding() {
    await expect(this.page).toHaveURL(/.*\/onboarding/);
  }
}
