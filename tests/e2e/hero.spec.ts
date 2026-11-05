import { expect, test } from '@playwright/test'

test('hero tampil dan CTA menuju menu', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.locator('#menu')).toBeAttached()

  await page.getByRole('link', { name: /lihat menu/i }).first().click()
  await expect(page.locator('#menu')).toBeInViewport()
})

test('fallback tampil saat 3D dimatikan', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'kopi-senja:hero',
      JSON.stringify({ state: { disable3D: true }, version: 0 }),
    )
  })
  await page.goto('/')
  await expect(page.getByRole('button', { name: /nyalakan 3d/i })).toBeVisible()
  await page.getByRole('button', { name: /nyalakan 3d/i }).click()
  await expect(page.getByRole('button', { name: /nyalakan 3d/i })).toBeHidden()
})

test('tombol kontrol 3D bisa diakses keyboard', async ({ page }) => {
  await page.goto('/')
  const pause = page.getByRole('button', { name: /jeda animasi/i })
  await expect(pause).toBeVisible()
  await pause.focus()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('button', { name: /lanjutkan animasi/i })).toBeVisible()
})

test('tombol area membuka kartu info lalu kembali ke tampak penuh', async ({ page }) => {
  await page.goto('/')

  const areaNav = page.getByRole('navigation', { name: /jelajahi area/i })
  await expect(areaNav).toBeVisible()
  await expect(areaNav.getByRole('button', { name: /bar kopi/i })).toBeVisible()

  await areaNav.getByRole('button', { name: /bar kopi/i }).click()

  const card = page.getByRole('dialog', { name: /bar kopi/i })
  await expect(card).toBeVisible()
  await expect(card.getByText('Rani', { exact: true })).toBeVisible()

  await card.getByRole('button', { name: /kembali ke tampak penuh/i }).last().click()
  await expect(card).toBeHidden()
})

test('pin label zona muncul saat tur dimulai dan bisa diklik', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await expect(page.getByRole('button', { name: /jelajahi dapur/i })).toHaveCount(0)

  await page.evaluate(() => {
    const hero = document.getElementById('hero')
    if (!hero) return
    const range = hero.offsetHeight - window.innerHeight
    window.scrollTo({ top: range * 0.32, behavior: 'instant' })
  })

  const pin = page.getByRole('button', { name: /jelajahi dapur/i })
  await expect(pin).toBeVisible({ timeout: 20_000 })

  await pin.click()
  await expect(page.getByRole('dialog', { name: /dapur/i })).toBeVisible()
})

test('keyboard 1–4 memilih area', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()

  await page.keyboard.press('2')
  await expect(page.getByRole('dialog', { name: /bar kopi/i })).toBeVisible()

  await page.keyboard.press('0')
  await expect(page.getByRole('dialog')).toBeHidden()
})
