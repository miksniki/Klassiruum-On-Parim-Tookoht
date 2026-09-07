// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Nikita Mikson and contributors
import { removeBackground } from '@imgly/background-removal';
self.onmessage = async (event: MessageEvent<Blob>) => {
  try {
    const downloads = new Map<string, { current: number; total: number }>();
    const blob = await removeBackground(event.data, {
      model: 'isnet_fp16', device: 'cpu', proxyToWorker: false,
      output: { format: 'image/png' }, fetchArgs: { signal: AbortSignal.timeout(180000) },
      progress: (key, current, total) => {
        if (!key.startsWith('fetch:')) return;
        downloads.set(key, { current, total });
        let loaded = 0, size = 0;
        downloads.forEach(item => { loaded += item.current; size += item.total; });
        self.postMessage({ type: 'progress', loaded, total: size });
      },
    });
    self.postMessage({ type: 'done', blob });
  } catch (error) {
    self.postMessage({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  }
};
