// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Nikita Mikson and contributors
import type { Face, Settings } from '../types';
import { context, createCanvas } from './canvas';

// Inverse radial mapping magnifies the center while keeping the outer edge fixed.
// Bilinear sampling avoids the hard edges of a pasted, scaled eye crop.
export function enlargeEyes(source: HTMLCanvasElement, faces: Face[], amount: number) {
  const output = createCanvas(source.width, source.height);
  const ctx = context(output);
  ctx.drawImage(source, 0, 0);
  if (amount <= 0 || !faces.length) return output;
  const original = context(source).getImageData(0, 0, source.width, source.height);
  for (const face of faces) for (const eye of face.eyes) {
    const radius = Math.max(2, eye.radius * 1.5);
    const left = Math.max(0, Math.floor(eye.x - radius));
    const top = Math.max(0, Math.floor(eye.y - radius));
    const width = Math.min(source.width - left, Math.ceil(radius * 2 + 2));
    const height = Math.min(source.height - top, Math.ceil(radius * 2 + 2));
    if (width <= 0 || height <= 0) continue;
    const patch = ctx.getImageData(left, top, width, height);
    for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
      const dx = left + x - eye.x, dy = top + y - eye.y;
      const distance = Math.hypot(dx, dy) / radius;
      if (distance >= 1) continue;
      const scale = 1 + amount / 100 * 1.15 * (1 - distance * distance) ** 2;
      const sx = Math.max(0, Math.min(source.width - 1, eye.x + dx / scale));
      const sy = Math.max(0, Math.min(source.height - 1, eye.y + dy / scale));
      const x0 = Math.floor(sx), y0 = Math.floor(sy);
      const x1 = Math.min(x0 + 1, source.width - 1), y1 = Math.min(y0 + 1, source.height - 1);
      const fx = sx - x0, fy = sy - y0;
      for (let c = 0; c < 4; c++) {
        const sample = (xx: number, yy: number) => original.data[(yy * source.width + xx) * 4 + c];
        patch.data[(y * width + x) * 4 + c] =
          sample(x0, y0) * (1 - fx) * (1 - fy) + sample(x1, y0) * fx * (1 - fy)
          + sample(x0, y1) * (1 - fx) * fy + sample(x1, y1) * fx * fy;
      }
    }
    ctx.putImageData(patch, left, top);
  }
  return output;
}
export function drawGlasses(ctx: CanvasRenderingContext2D, faces: Face[], settings: Settings) {
  if (settings.glasses === 'none') return;
  for (const { eyes: [left, right] } of faces) {
    const distance = Math.hypot(right.x - left.x, right.y - left.y);
    ctx.save(); ctx.translate((left.x + right.x) / 2, (left.y + right.y) / 2);
    ctx.rotate(Math.atan2(right.y - left.y, right.x - left.x));
    const scale = distance * settings.glassesScale / 100;
    ctx.scale(scale, scale); ctx.translate(0, settings.glassesY / 100);
    ctx.strokeStyle = settings.glasses === 'round' ? '#6b3e22' : '#252723';
    ctx.lineWidth = 0.055; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    for (const x of [-0.5, 0.5]) {
      ctx.beginPath();
      if (settings.glasses === 'round') ctx.ellipse(x, 0, 0.405, 0.39, 0, 0, Math.PI * 2);
      else ctx.roundRect(x - 0.415, -0.30, 0.83, 0.63, settings.glasses === 'sun' ? 0.14 : 0.10);
      ctx.fillStyle = settings.glasses === 'sun' ? 'rgba(25, 35, 31, 0.9)' : 'rgba(229, 243, 237, 0.08)';
      ctx.fill(); ctx.stroke(); ctx.save(); ctx.clip();
      ctx.strokeStyle = settings.glasses === 'sun' ? 'rgba(255,255,255,.27)' : 'rgba(255,255,255,.5)';
      ctx.lineWidth = 0.025; ctx.beginPath(); ctx.moveTo(x - 0.25, -0.18); ctx.lineTo(x - 0.08, -0.25); ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath(); ctx.moveTo(-0.09, -0.06); ctx.quadraticCurveTo(0, -0.15, 0.09, -0.06);
    ctx.moveTo(-0.91, -0.08); ctx.lineTo(-1.04, -0.16);
    ctx.moveTo(0.91, -0.08); ctx.lineTo(1.04, -0.16);
    ctx.stroke(); ctx.restore();
  }
}
