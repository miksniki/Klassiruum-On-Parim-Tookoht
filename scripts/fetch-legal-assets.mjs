// SPDX-License-Identifier: AGPL-3.0-only
// Explicit maintenance command: downloads upstream legal texts, never user data.
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const sources = {
  'AGPL-3.0.txt': 'https://raw.githubusercontent.com/spdx/license-list-data/main/text/AGPL-3.0-only.txt',
  'ISC.txt': 'https://raw.githubusercontent.com/spdx/license-list-data/main/text/ISC.txt',
  'Apache-2.0.txt': 'https://www.apache.org/licenses/LICENSE-2.0.txt',
  'onnxruntime-LICENSE.txt': 'https://raw.githubusercontent.com/microsoft/onnxruntime/v1.21.0/LICENSE',
  'onnxruntime-ThirdPartyNotices.txt': 'https://raw.githubusercontent.com/microsoft/onnxruntime/v1.21.0/ThirdPartyNotices.txt',
  'mediapipe-LICENSE.txt': 'https://raw.githubusercontent.com/google-ai-edge/mediapipe/v0.10.32/LICENSE',
  'IS-Net-LICENSE.txt': 'https://raw.githubusercontent.com/xuebinqin/DIS/main/LICENSE.md',
  'DM-Sans-OFL.txt': 'https://raw.githubusercontent.com/google/fonts/main/ofl/dmsans/OFL.txt',
  'Manrope-OFL.txt': 'https://raw.githubusercontent.com/google/fonts/main/ofl/manrope/OFL.txt',
  'lodash-4.17.21-LICENSE.txt': 'https://raw.githubusercontent.com/lodash/lodash/4.17.21/LICENSE',
  'zod-3.24.2-LICENSE.txt': 'https://raw.githubusercontent.com/colinhacks/zod/v3.24.2/LICENSE',
  'UPNG-LICENSE.txt': 'https://raw.githubusercontent.com/photopea/UPNG.js/f6e5f93da01094b1ffb3cef364abce4d9e758cbf/LICENSE',
  'canvas-to-bmp-LICENSE.txt': 'https://raw.githubusercontent.com/marcosvega91/canvas-to-bmp/77aaf2221647a6533b1926cb637c7cd2bc432d9b/LICENSE-MIT.txt',
};
const directory = new URL('../legal/upstream/', import.meta.url);
await mkdir(directory, { recursive: true });
const records = await Promise.all(Object.entries(sources).map(async ([file, url]) => {
  let bytes;
  try { bytes = await readFile(new URL(file, directory)); } catch {
    const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
    if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
  }
  if (bytes.length < 500 || bytes.toString().includes('<!DOCTYPE html')) throw new Error(`Invalid license response: ${url}`);
  await writeFile(new URL(file, directory), bytes);
  console.log(`Saved ${file}`);
  return { file, url, sha256: createHash('sha256').update(bytes).digest('hex') };
}));
await writeFile(new URL('sources.json', directory), JSON.stringify(records, null, 2) + '\n');
