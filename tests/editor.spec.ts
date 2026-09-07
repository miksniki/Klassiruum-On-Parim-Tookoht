// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Nikita Mikson and contributors
import { test, expect } from '@playwright/test';

test('background selection, help, and mobile layout work before upload', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Klassiruum on parim töökoht');
  await expect(page.getByRole('link', { name: /Loo oma õpetajapilt/ })).toBeInViewport({ ratio: 1 });
  await page.getByRole('link', { name: /Loo oma õpetajapilt/ }).click();
  await expect(page).toHaveURL(/#fotostuudio$/);
  await expect(page.getByRole('heading', { name: /Alusta endast/ })).toBeInViewport();
  await expect(page.getByRole('button', { name: 'Laadi pilt alla' })).toBeDisabled();
  await expect(page.getByRole('slider', { name: 'Suuremad silmad' })).toBeDisabled();
  await page.getByRole('button', { name: /Õppimine läheb õue/ }).click();
  await expect(page.getByRole('button', { name: /Õppimine läheb õue/ })).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('.photo-caption')).toContainText('Õppimine läheb õue');
  await page.getByRole('button', { name: 'Kuidas see töötab?' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).not.toBeVisible();
  await page.locator('h1').click();
  await page.screenshot({ path: 'test-results/desktop.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 568 });
  await page.goto('/');
  await expect(page.getByRole('link', { name: /Loo oma õpetajapilt/ })).toBeInViewport({ ratio: 1 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/mobile.png', fullPage: true });
});

test('unsupported and corrupt uploads show recoverable errors', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Vali portreefoto').setInputFiles({ name: 'photo.heic', mimeType: 'image/heic', buffer: Buffer.from('invalid') });
  await expect(page.getByRole('alert')).toContainText('JPG');
  await expect(page.getByRole('button', { name: 'Vali foto', exact: true })).toBeEnabled();
  await page.getByLabel('Vali portreefoto').setInputFiles({ name: 'broken.png', mimeType: 'image/png', buffer: Buffer.from('not a real image') });
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Vali foto', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Laadi pilt alla' })).toBeDisabled();
});

test('canvas bounds and eye warping preserve unaffected pixels and enlarge eyes', async ({ page }) => {
  test.skip(process.env.TEST_PRODUCTION === '1', 'Direct source imports are tested on the development server.');
  await page.goto('/');
  const result = await page.evaluate(async () => {
    // Exercise production canvas code in the browser, where pixel APIs are real.
    // @ts-expect-error Vite serves source modules directly in development.
    const { createCanvas, context, trimTransparentPixels, toBlob } = await import('/src/utils/canvas.ts');
    // @ts-expect-error Vite source module.
    const { enlargeEyes, drawGlasses } = await import('/src/utils/effects.ts');
    const canvas = createCanvas(200, 120), ctx = context(canvas);
    ctx.fillStyle = '#eedac1'; ctx.fillRect(10, 10, 180, 100);
    ctx.fillStyle = '#111111';
    for (const x of [70, 130]) { ctx.beginPath(); ctx.arc(x, 55, 5, 0, Math.PI * 2); ctx.fill(); }
    const faces = [{ eyes: [{ x: 70, y: 55, radius: 20 }, { x: 130, y: 55, radius: 20 }] }];
    const bigger = enlargeEyes(canvas, faces, 100);
    const countDark = (c: HTMLCanvasElement) => {
      const p = c.getContext('2d')!.getImageData(50, 35, 40, 40).data;
      let n = 0; for (let i = 0; i < p.length; i += 4) if (p[i] < 50 && p[i + 3] > 200) n++;
      return n;
    };
    const bounds = trimTransparentPixels(canvas);
    const zero = enlargeEyes(canvas, faces, 0).toDataURL() === canvas.toDataURL();
    const untouched = context(bigger).getImageData(15, 15, 1, 1).data.join(',') === ctx.getImageData(15, 15, 1, 1).data.join(',');
    const before = bigger.toDataURL();
    drawGlasses(context(bigger), faces, { glasses: 'round', glassesScale: 100, glassesY: 0 });
    let rejectsEmpty = false; try { trimTransparentPixels(createCanvas(3, 3)); } catch { rejectsEmpty = true; }
    const blob = await toBlob(bigger);
    return { bounds, zero, untouched, increased: countDark(enlargeEyes(canvas, faces, 100)) > countDark(canvas) * 2,
      glassesChanged: before !== bigger.toDataURL(), rejectsEmpty, mime: blob.type };
  });
  expect(result).toEqual({ bounds: { x: 10, y: 10, width: 180, height: 100 }, zero: true, untouched: true,
    increased: true, glassesChanged: true, rejectsEmpty: true, mime: 'image/png' });
});

test('processing can be cancelled and failed model downloads allow retry', async ({ page }) => {
  await page.goto('/');
  const encoded = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = 64; c.height = 64;
    const ctx = c.getContext('2d')!; ctx.fillStyle = '#aa7755'; ctx.fillRect(0, 0, 64, 64);
    return c.toDataURL().split(',')[1];
  });
  let delay = true;
  await page.route('https://staticimgly.com/**', async route => {
    if (delay) await new Promise(resolve => setTimeout(resolve, 2000));
    await route.abort();
  });
  const upload = { name: 'test.png', mimeType: 'image/png', buffer: Buffer.from(encoded, 'base64') };
  await page.getByLabel('Vali portreefoto').setInputFiles(upload);
  await page.getByRole('button', { name: 'Katkesta' }).click();
  await expect(page.getByRole('button', { name: 'Vali foto', exact: true })).toBeEnabled();
  await expect(page.locator('.processing-overlay')).toHaveCount(0);
  delay = false;
  await page.getByLabel('Vali portreefoto').setInputFiles(upload);
  await expect(page.getByRole('alert')).toContainText('Tausta eemaldamine ebaõnnestus', { timeout: 15000 });
  await expect(page.getByRole('button', { name: 'Vali foto', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Laadi pilt alla' })).toBeDisabled();
});

test('real portrait: removal, face effects, positioning, export, and reset', async ({ page }) => {
  test.skip(!process.env.PORTRAIT_TEST_FILE, 'Set PORTRAIT_TEST_FILE to run real model inference.');
  test.setTimeout(300000);
  page.on('console', message => { if (message.type() === 'error') console.log('Browser:', message.text()); });
  page.on('pageerror', error => console.log('Page error:', error.message));
  page.on('requestfailed', request => console.log('Failed request:', request.url(), request.failure()?.errorText));
  await page.goto('/');
  // A Vite dependency-discovery reload used to silently discard the first upload.
  await page.evaluate(() => { document.documentElement.dataset.uploadDocument = 'original'; });
  await page.getByLabel('Vali portreefoto').setInputFiles(process.env.PORTRAIT_TEST_FILE!);
  const statusTimer = setInterval(() => {
    void page.locator('.processing-overlay').innerText({ timeout: 1000 }).then(text => console.log(text.split('\n')[0])).catch(() => {});
  }, 15000);
  await page.waitForFunction(() => document.documentElement.dataset.uploadDocument !== 'original' || document.querySelector('[role="alert"]') ||
    !(document.querySelector('.download-button') as HTMLButtonElement)?.disabled,
    { }, { timeout: 250000 }).finally(() => clearInterval(statusTimer));
  await expect(page.locator('html'), 'The first upload must not trigger a development-server reload').toHaveAttribute('data-upload-document', 'original');
  await expect(page.getByRole('alert')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Laadi pilt alla' })).toBeEnabled();
  await expect(page.getByRole('slider', { name: 'Suuremad silmad' })).toBeEnabled();
  const canvas = page.locator('canvas');
  const initial = await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL());
  await page.getByRole('slider', { name: 'Suuremad silmad' }).fill('100');
  await expect.poll(() => canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL())).not.toBe(initial);
  await page.getByRole('button', { name: 'Kandilised', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Kandilised', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await canvas.focus(); await page.keyboard.press('ArrowRight');
  await page.getByText('Täpsem paigutus').click();
  await expect(page.getByRole('slider', { name: 'Vasakule / paremale' })).toHaveValue('1');
  await page.getByRole('button', { name: /Õppimine läheb õue/ }).click();
  await expect(page.getByRole('button', { name: 'Laadi pilt alla' })).toBeEnabled();
  const expectedExport = await canvas.evaluate((c: HTMLCanvasElement) => c.toDataURL().split(',')[1]);
  await page.getByRole('button', { name: 'Vaata originaali' }).click();
  await expect(page.locator('.preview-tag')).toHaveText('ORIGINAAL');
  // Export must still be the finished composite while comparing the original.
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Laadi pilt alla' }).click();
  const download = await downloadEvent;
  expect(download.suggestedFilename()).toBe('klassiruum-on-parim-tookoht.png');
  await download.saveAs('test-results/real-portrait.png');
  const fs = await import('node:fs/promises');
  const bytes = await fs.readFile('test-results/real-portrait.png');
  expect(bytes.readUInt32BE(16)).toBe(1536); expect(bytes.readUInt32BE(20)).toBe(1024);
  expect(bytes.toString('base64')).toBe(expectedExport);
  await page.getByRole('button', { name: 'Näita tulemust' }).click();
  await page.screenshot({ path: 'test-results/real-editor.png', fullPage: true });
  await page.getByRole('button', { name: 'Alusta uuesti' }).click();
  await expect(page.getByRole('button', { name: 'Laadi pilt alla' })).toBeDisabled();
  await expect(page.getByRole('slider', { name: 'Suuremad silmad' })).toBeDisabled();
});
