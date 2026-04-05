import { test, expect } from '@playwright/test';

test('dashboard displays user information', async ({ page }) => {
  await page.goto('/dashboard');

  // Verificar se o nome ou e-mail do usuário está visível na página.
  const userInfo = page.locator('text=Hitalo, hitalodiniz80@gmail.com');
  await expect(userInfo).toBeVisible();
});
