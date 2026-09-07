// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Nikita Mikson and contributors
import { cp, mkdir } from 'node:fs/promises';
// Serve the exact installed MediaPipe WASM version from our own origin.
await mkdir(new URL('../public/vendor/mediapipe/', import.meta.url), { recursive: true });
await cp(new URL('../node_modules/@mediapipe/tasks-vision/wasm/', import.meta.url),
  new URL('../public/vendor/mediapipe/', import.meta.url), { recursive: true });
await cp(new URL('../node_modules/browser-image-compression/dist/browser-image-compression.js', import.meta.url),
  new URL('../public/vendor/browser-image-compression.js', import.meta.url));
