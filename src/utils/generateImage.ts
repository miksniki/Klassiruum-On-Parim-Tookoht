// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Nikita Mikson and contributors
import type { Photo, Settings } from "../types";
import { context, createCanvas } from "./canvas";
import { drawGlasses, enlargeEyes } from "./effects";
export const OUTPUT_WIDTH = 1536;
export const OUTPUT_HEIGHT = 1024;
const imageCache = new Map<string, Promise<HTMLImageElement>>();
export function loadImage(src: string) {
  if (!imageCache.has(src))
    imageCache.set(
      src,
      new Promise((resolve, reject) => {
        const image = new Image();
        image.onload = () => resolve(image);
        image.onerror = () => {
          imageCache.delete(src);
          reject(
            new Error("Taustapildi laadimine ebaõnnestus. Proovi uuesti.")
          );
        };
        image.src = src;
      })
    );
  return imageCache.get(src)!;
}
export function createPerson(photo: Photo, settings: Settings) {
  const person = enlargeEyes(photo.cutout, photo.faces, settings.eyes);
  drawGlasses(context(person), photo.faces, settings);
  return person;
}
export function composeImage(
  background: HTMLImageElement,
  photo: Photo | null,
  person: HTMLCanvasElement | null,
  settings: Settings
) {
  const canvas = createCanvas(OUTPUT_WIDTH, OUTPUT_HEIGHT);
  const ctx = context(canvas);
  const ratio = Math.max(
    OUTPUT_WIDTH / background.width,
    OUTPUT_HEIGHT / background.height
  );
  ctx.drawImage(
    background,
    (OUTPUT_WIDTH - background.width * ratio) / 2,
    (OUTPUT_HEIGHT - background.height * ratio) / 2,
    background.width * ratio,
    background.height * ratio
  );
  if (photo && person) {
    const b = photo.bounds;
    const scale =
      (Math.min(
        (OUTPUT_HEIGHT * 0.88) / b.height,
        (OUTPUT_WIDTH * 0.6) / b.width
      ) *
        settings.zoom) /
      100;
    const x =
      (OUTPUT_WIDTH - b.width * scale) / 2 +
      (settings.x / 100) * OUTPUT_WIDTH -
      b.x * scale;
    const y =
      OUTPUT_HEIGHT -
      b.height * scale +
      (settings.y / 100) * OUTPUT_HEIGHT -
      b.y * scale;
    ctx.save();
    ctx.shadowColor = "rgba(25, 29, 20, 0.22)";
    ctx.shadowBlur = 16;
    ctx.shadowOffsetX = 5;
    ctx.shadowOffsetY = 8;
    ctx.drawImage(person, x, y, person.width * scale, person.height * scale);
    ctx.restore();
  }
  return canvas;
}
