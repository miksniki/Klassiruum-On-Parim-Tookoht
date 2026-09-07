// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Nikita Mikson and contributors
export function createCanvas(width: number, height: number) {
  const canvas = document.createElement('canvas');
  canvas.width = width; canvas.height = height;
  return canvas;
}
export function context(canvas: HTMLCanvasElement) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) throw new Error('Sinu brauser ei toeta pilditöötlust. Proovi uuemat brauserit.');
  return ctx;
}
export function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => canvas.toBlob(
    blob => blob ? resolve(blob) : reject(new Error('Pildi salvestamine ebaõnnestus. Proovi uuesti.')), 'image/png',
  ));
}
export async function blobToCanvas(blob: Blob) {
  const bitmap = await createImageBitmap(blob);
  try {
    const canvas = createCanvas(bitmap.width, bitmap.height);
    context(canvas).drawImage(bitmap, 0, 0); return canvas;
  } finally { bitmap.close(); }
}
export function trimTransparentPixels(canvas: HTMLCanvasElement) {
  const { width, height } = canvas;
  const { data } = context(canvas).getImageData(0, 0, width, height);
  let left = width, top = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (data[(y * width + x) * 4 + 3] > 16) {
      left = Math.min(left, x); right = Math.max(right, x);
      top = Math.min(top, y); bottom = Math.max(bottom, y);
    }
  }
  if (right < left) throw new Error('Me ei leidnud pildilt inimest. Proovi selgemat portreefotot.');
  return { x: left, y: top, width: right - left + 1, height: bottom - top + 1 };
}
