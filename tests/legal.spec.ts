// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Nikita Mikson and contributors
import { test, expect } from '@playwright/test';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile } from 'node:fs/promises';

test('license links expose notices and source matching the build', async ({ page, request }, testInfo) => {
  await page.goto('/');
  await page.getByRole('navigation', { name: 'Litsentsid ja lähtekood' }).getByRole('link', { name: 'Litsentsid ja lähtekood', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Litsentsid ja lähtekood');
  await expect(page.getByText('ilma garantiita', { exact: true })).toBeVisible();
  const agpl = await request.get('/legal/AGPL-3.0.txt');
  expect(agpl.ok()).toBe(true);
  expect(await agpl.text()).toContain('GNU AFFERO GENERAL PUBLIC LICENSE');
  const inventory = await (await request.get('/legal/dependencies.json')).json();
  expect(inventory.some((entry: { name: string }) => entry.name === '@imgly/background-removal')).toBe(true);
  expect(inventory.some((entry: { name: string }) => entry.name === 'canvas-to-bmp (compression bundle)')).toBe(true);
  for (const entry of inventory) {
    const notice = await request.get(`/legal/${entry.notice}`);
    expect(notice.ok(), entry.name).toBe(true);
    expect((await notice.text()).length).toBeGreaterThan(500);
  }
  const manifest = await (await request.get('/legal/source-manifest.json')).json();
  const downloadEvent = page.waitForEvent('download');
  await page.getByRole('link', { name: 'Laadi lähtekood alla' }).click();
  const download = await downloadEvent;
  const path = testInfo.outputPath('source.tgz');
  await download.saveAs(path);
  const checksum = await (await request.get('/legal/source.tgz.sha256')).text();
  expect(createHash('sha256').update(await readFile(path)).digest('hex')).toBe(checksum.split(' ')[0]);
  const paths = execFileSync('tar', ['-tzf', path], { encoding: 'utf8' }).split('\n');
  expect(paths).toContain('./package-lock.json');
  expect(paths).toContain('./legal/imgly-source.tgz');
  expect(paths.some(entry => /^\.\/(\.git\/|\.env|node_modules\/|test-results\/|public\/legal\/)/.test(entry))).toBe(false);
  for (const file of manifest.files) {
    const contents = execFileSync('tar', ['-xOf', path, `./${file.path}`], { maxBuffer: 10 * 1024 * 1024 });
    expect(createHash('sha256').update(contents).digest('hex'), file.path).toBe(file.sha256);
  }
  const pkg = JSON.parse(execFileSync('tar', ['-xOf', path, './package.json'], { encoding: 'utf8' }));
  expect(pkg.license).toBe('AGPL-3.0-only');
  await page.setViewportSize({ width: 375, height: 667 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});
