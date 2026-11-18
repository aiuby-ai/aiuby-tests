// Testes de exemplo contra a página de laboratório /lab/index.html do alvo.
import { expect, test } from '@playwright/test'

test.beforeEach(async ({ page }) => {
  await page.goto('/lab/index.html')
})

test('página tem o título da loja', async ({ page }) => {
  await expect(page).toHaveTitle('Loja Lab')
})

test('aceitar cookies fecha o aviso e a oferta aparece', async ({ page }) => {
  await page.getByRole('button', { name: 'Aceitar cookies' }).click()
  await expect(page.getByRole('dialog', { name: 'Aviso de cookies' })).toBeHidden()
  await page.getByRole('button', { name: 'Mostrar oferta' }).click()
  await expect(page.getByText('10% de desconto no plano Pro')).toBeVisible()
})

test('pedido carregado da API da página', async ({ page }) => {
  await expect(page.getByTestId('pedido')).toHaveText('PED-4821 cancelado')
})
