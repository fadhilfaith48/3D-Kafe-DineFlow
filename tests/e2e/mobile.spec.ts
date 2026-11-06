import { expect, test } from '@playwright/test'

test.use({
  viewport: { width: 390, height: 844 },
  deviceScaleFactor: 2,
  isMobile: true,
  hasTouch: true,
})

test('kontrol HP diringkas ke panel pengaturan', async ({ page }) => {
  await page.goto('/')

  const settings = page.getByRole('button', { name: /pengaturan tampilan/i })
  await expect(settings).toBeVisible()
  await expect(page.getByRole('button', { name: /jeda animasi/i })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /jelajah kaki/i })).toBeVisible()

  await settings.click()
  await expect(page.getByRole('button', { name: /jeda animasi/i })).toBeVisible()
  await expect(page.getByRole('switch', { name: /bentuk kotak/i })).toBeVisible()

  await page.getByRole('button', { name: /mode malam/i }).click()
  await expect(page.getByRole('button', { name: /mode siang/i })).toBeVisible()
})

test('walk sentuh menampilkan joystick dan tombol gyro', async ({ page }) => {
  // Chromium headless tidak punya sensor; paksa izin agar jalur aktif teruji.
  await page.addInitScript(() => {
    const events = window.DeviceOrientationEvent as
      | (typeof DeviceOrientationEvent & {
          requestPermission?: () => Promise<'granted' | 'denied'>
        })
      | undefined
    if (events) {
      Object.defineProperty(events, 'requestPermission', {
        value: async () => 'granted',
        configurable: true,
      })
    }
  })
  await page.goto('/')
  await page.getByRole('button', { name: /jelajah kaki/i }).click()

  await expect(page.getByRole('group', { name: /joystick gerak/i })).toBeVisible()
  await expect(page.getByText(/geser layar untuk lihat/i).first()).toBeVisible()

  const gyro = page.getByRole('button', { name: /📱 gyro$/i })
  await expect(gyro).toBeVisible()
  await gyro.click()
  await expect(page.getByRole('button', { name: /gyro aktif/i })).toBeVisible()
})
