// SPDX-License-Identifier: AGPL-3.0-only
// Copyright (C) 2026 Nikita Mikson and contributors
// Generate local notices and an allowlisted source release without network access.
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const out = join(root, 'public/legal');
const read = path => readFile(join(root, path), 'utf8');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const escape = value => String(value).replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
const slug = value => value.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-/, '');
const lock = JSON.parse(await read('package-lock.json'));
await mkdir(join(out, 'notices'), { recursive: true });

const fallbacks = {
  '@mediapipe/tasks-vision': ['mediapipe-LICENSE.txt'],
  'onnxruntime-web': ['onnxruntime-LICENSE.txt', 'onnxruntime-ThirdPartyNotices.txt'],
  'onnxruntime-common': ['onnxruntime-LICENSE.txt'],
  'guid-typescript': ['ISC.txt'],
};
const knownRepositories = {
  '@mediapipe/tasks-vision': 'https://github.com/google-ai-edge/mediapipe/tree/v0.10.32',
  'onnxruntime-web': 'https://github.com/microsoft/onnxruntime/tree/v1.21.0',
  'onnxruntime-common': 'https://github.com/microsoft/onnxruntime/tree/v1.21.0',
  'uzip': 'https://github.com/photopea/UZIP.js',
};
const inventory = [];
for (const [path, info] of Object.entries(lock.packages).sort(([a], [b]) => a.localeCompare(b))) {
  if (!path || info.dev) continue;
  const directory = join(root, path);
  const pkg = JSON.parse(await readFile(join(directory, 'package.json'), 'utf8'));
  if (pkg.version !== info.version) throw new Error(`Run npm ci: ${path} does not match the lockfile`);
  const names = (await readdir(directory)).filter(name => /^(licen[cs]e|notice|copying|copyright|thirdparty)/i.test(name));
  const texts = [];
  for (const name of names.sort()) {
    if ((await lstat(join(directory, name))).isFile()) texts.push(`${name}\n\n${await readFile(join(directory, name), 'utf8')}`);
  }
  for (const file of fallbacks[pkg.name] ?? []) texts.push(`${file}\n\n${await read(`legal/upstream/${file}`)}`);
  if (!texts.length) throw new Error(`Missing license text for ${pkg.name}@${pkg.version}; review it before building.`);
  let repository = knownRepositories[pkg.name] ?? pkg.repository?.url ?? pkg.repository ?? '';
  if (typeof repository !== 'string') repository = '';
  repository = repository.replace(/^git\+/, '').replace(/^git:\/\//, 'https://').replace(/\.git$/, '');
  if (repository && !repository.includes('://')) repository = `https://github.com/${repository}`;
  const entry = {
    name: pkg.name, version: pkg.version,
    license: pkg.name === '@imgly/background-removal' ? 'AGPL-3.0' : pkg.license,
    repository, package: info.resolved, integrity: info.integrity,
    notice: `notices/${slug(`${pkg.name}-${pkg.version}`)}.txt`,
  };
  const special = pkg.name === 'guid-typescript'
    ? '\nUpstream package.json declares ISC and author "nicolas". No separate upstream license/copyright file was supplied. The standard ISC text is reproduced without inventing an upstream copyright notice.\n'
    : '';
  await writeFile(join(out, entry.notice), `${pkg.name} ${pkg.version}\nLicense: ${entry.license}\nSource: ${repository}\nLocked package: ${info.resolved}\n${special}\n${texts.join('\n\n---\n\n')}`);
  inventory.push(entry);
}

// These copies are embedded in IMG.LY's published bundle, independent of npm resolution.
for (const [name, version, license, file, repository] of [
  ['lodash-es (IMG.LY bundle)', '4.17.21', 'MIT', 'lodash-4.17.21-LICENSE.txt', 'https://github.com/lodash/lodash/tree/4.17.21'],
  ['zod (IMG.LY bundle)', '3.24.2', 'MIT', 'zod-3.24.2-LICENSE.txt', 'https://github.com/colinhacks/zod/tree/v3.24.2'],
  ['UPNG.js (compression bundle)', 'f6e5f93', 'MIT', 'UPNG-LICENSE.txt', 'https://github.com/photopea/UPNG.js/tree/f6e5f93da01094b1ffb3cef364abce4d9e758cbf'],
  ['canvas-to-bmp (compression bundle)', '77aaf22', 'MIT', 'canvas-to-bmp-LICENSE.txt', 'https://github.com/marcosvega91/canvas-to-bmp/tree/77aaf2221647a6533b1926cb637c7cd2bc432d9b'],
  ['IS-Net model', 'IMG.LY 1.7.0 quantized model', 'MIT', 'IS-Net-LICENSE.txt', 'https://github.com/xuebinqin/DIS'],
  ['MediaPipe Face Mesh V2 model', 'float16/1', 'Apache-2.0', 'Apache-2.0.txt', 'https://storage.googleapis.com/mediapipe-assets/Model%20Card%20MediaPipe%20Face%20Mesh%20V2.pdf'],
  ['MediaPipe BlazeFace model', 'short range', 'Apache-2.0', 'Apache-2.0.txt', 'https://storage.googleapis.com/mediapipe-assets/MediaPipe%20BlazeFace%20Model%20Card%20(Short%20Range).pdf'],
  ['MediaPipe Blendshape V2 model', 'float16/1', 'Apache-2.0', 'Apache-2.0.txt', 'https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Blendshape%20V2.pdf'],
  ['DM Sans', 'Google Fonts', 'OFL-1.1', 'DM-Sans-OFL.txt', 'https://github.com/googlefonts/dm-fonts'],
  ['Manrope', 'Google Fonts', 'OFL-1.1', 'Manrope-OFL.txt', 'https://github.com/sharanda/manrope'],
]) {
  const notice = `notices/${slug(name)}.txt`;
  await writeFile(join(out, notice), `${name}\nVersion: ${version}\nLicense: ${license}\nSource: ${repository}\n\n${await read(`legal/upstream/${file}`)}`);
  inventory.push({ name, version, license, repository, notice });
}
await cp(join(root, 'LICENSE'), join(out, 'AGPL-3.0.txt'));
await cp(join(root, 'NOTICE'), join(out, 'NOTICE.txt'));
await cp(join(root, 'ASSETS.md'), join(out, 'ASSETS.md'));
await cp(join(root, 'legal/imgly-source.tgz'), join(out, 'imgly-source.tgz'));
await cp(join(root, 'legal/imgly-source.json'), join(out, 'imgly-source.json'));
await writeFile(join(out, 'dependencies.json'), JSON.stringify(inventory, null, 2) + '\n');
const allNotices = (await Promise.all(inventory.map(entry => readFile(join(out, entry.notice), 'utf8')))).join('\n\n==============================\n\n');
await writeFile(join(out, 'THIRD_PARTY_NOTICES.txt'), allNotices);

// Explicit public-source allowlist. Never walk the workspace wholesale: .git,
// .env files, installed packages, temporary uploads, and generated archives stay out.
const roots = [
  'src', 'scripts', 'tests', 'legal', 'LICENSE', 'NOTICE', 'ASSETS.md', 'THIRD_PARTY_NOTICES.md',
  'README.md', 'package.json', 'package-lock.json', 'index.html', 'vite.config.ts',
  'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json', 'eslint.config.js',
  'playwright.config.ts', '.gitignore', '.nvmrc', 'public/favicon.svg', 'public/_headers',
];
const files = [];
async function collect(path, explicit = false) {
  const name = basename(path);
  if (name === '.DS_Store' || /^\.env(?:\.|$)/.test(name) || (!explicit && name.startsWith('.'))) return;
  const stat = await lstat(join(root, path));
  if (stat.isSymbolicLink()) throw new Error(`Source release does not follow symlinks: ${path}`);
  if (stat.isDirectory()) {
    for (const child of (await readdir(join(root, path))).sort()) await collect(join(path, child));
  } else if (stat.isFile()) {
    if (!explicit && !/\.(tsx?|m?js|css|json|md|txt|html|svg|png|jpe?g|webp|gz|tgz|pdf)$/.test(name)) throw new Error(`Review source release file: ${path}`);
    files.push(path);
  }
}
for (const path of roots) await collect(path, true);
const entries = await Promise.all(files.sort().map(async path => ({ path, sha256: hash(await readFile(join(root, path))) })));
const buildId = hash(JSON.stringify(entries));
const manifest = { buildId, license: 'AGPL-3.0-only', files: entries, dependencies: inventory };
await writeFile(join(out, 'source-manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
const staging = await mkdtemp(join(tmpdir(), 'klassiruum-source-'));
try {
  for (const path of files) {
    await mkdir(join(staging, path, '..'), { recursive: true });
    await cp(join(root, path), join(staging, path));
  }
  await writeFile(join(staging, 'SOURCE_MANIFEST.json'), JSON.stringify(manifest, null, 2) + '\n');
  await mkdir(join(staging, 'third-party'), { recursive: true });
  await writeFile(join(staging, 'third-party/NOTICES.txt'), allNotices);
  // Retain exact preferred source content embedded in the AGPL library's npm release.
  const sourceMap = JSON.parse(await read('node_modules/@imgly/background-removal/dist/index.mjs.map'));
  for (let i = 0; i < sourceMap.sources.length; i++) {
    const source = sourceMap.sources[i];
    const content = sourceMap.sourcesContent[i];
    if (content == null) throw new Error(`Missing bundled source content: ${source}`);
    const safe = source.replace(/^(\.\.\/)+/, '');
    if (safe.split('/').includes('..') || safe.startsWith('/')) throw new Error(`Unsafe source-map path: ${source}`);
    const target = join(staging, 'third-party/imgly-bundled', safe);
    await mkdir(join(target, '..'), { recursive: true }); await writeFile(target, content);
  }
  await cp(join(root, 'node_modules/@imgly/background-removal/package.json'), join(staging, 'third-party/imgly-package.json'));
  execFileSync('tar', ['-czf', join(out, 'source.tgz'), '-C', staging, '.'], { env: { ...process.env, COPYFILE_DISABLE: '1' } });
} finally {
  // Only remove the fresh temporary directory created by this invocation.
  await rm(staging, { recursive: true, force: true });
}
await writeFile(join(out, 'source.tgz.sha256'), `${hash(await readFile(join(out, 'source.tgz')))}  source.tgz\n`);

const rows = inventory.map(entry => `<tr><th scope="row">${escape(entry.name)}<small>${escape(entry.version)}</small></th><td>${escape(entry.license)}</td><td><a href="legal/${escape(entry.notice)}">Litsents ja teated</a>${entry.repository.startsWith('https://') ? `<br><a href="${escape(entry.repository)}">Algallikas</a>` : ''}</td></tr>`).join('\n');
const html = `<!doctype html>
<html lang="et"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#28543d"><title>Litsentsid ja lähtekood · Klassiruum on parim töökoht</title><link rel="icon" href="favicon.svg"><style>
*{box-sizing:border-box}body{margin:0;background:#f7f7f0;color:#283d32;font:15px/1.75 system-ui,sans-serif}main{max-width:900px;padding:35px 24px 60px;margin:auto}a{color:#28543d;text-underline-offset:3px}a:focus-visible{outline:3px solid #c9942c;outline-offset:4px}h1{font-size:clamp(30px,5vw,44px);line-height:1.2;letter-spacing:-1.5px;margin:30px 0 20px}h2{font-size:22px;margin-top:32px}.eyebrow{font-size:10px;letter-spacing:1.5px;color:#827444}.source{background:#edf0e2;padding:22px;border:1px solid #dce3d2;border-radius:10px}.source h2{margin-top:0}.button{display:inline-block;padding:10px 16px;background:#28543d;color:white;border-radius:6px;text-decoration:none;margin:6px 12px 6px 0}.muted,small{color:#687460}small{display:block;font-size:12px}code{overflow-wrap:anywhere;font-size:12px}table{width:100%;border-collapse:collapse;font-size:12px}th,td{padding:12px 8px;border-bottom:1px solid #dfe3d8;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{font-weight:600;width:45%}footer{padding-top:30px;border-top:1px solid #dfe3d8;margin-top:35px;font-size:12px}p{overflow-wrap:anywhere}@media(max-width:500px){main{padding:24px 18px}th,td{padding:10px 4px}table{font-size:11px}.source{padding:17px}}
</style></head><body><main><a href="./">← Tagasi fotostuudiosse</a><p class="eyebrow">KLASSIRUUM ON PARIM TÖÖKOHT</p><h1>Litsentsid ja lähtekood</h1>
<p>© 2026 Nikita Mikson ja kaasautorid. Rakenduse algne lähtekood on avaldatud <a href="legal/AGPL-3.0.txt">GNU Affero General Public License, versioon 3</a> (AGPL-3.0-only) alusel. Selle litsentsi tingimustel võid tarkvara kasutada, uurida, muuta ja edasi levitada.</p>
<p>Tarkvara pakutakse kehtiva õigusega lubatud ulatuses <strong>ilma garantiita</strong>, sealhulgas ilma garantiita selle turustatavuse või kindlaks otstarbeks sobivuse kohta. Täielikud õigused, tingimused ja vastutuse piirangud on <a href="legal/AGPL-3.0.txt">litsentsitekstis</a>.</p>
<section class="source" id="source"><h2>Selle versiooni lähtekood</h2><p>Laadi alla selle väljaande rakenduse lähtekood, taustapildid, ehitusjuhised, sõltuvuste lukufail ja litsentsiteated. IMG.LY vastava versiooni lähtekood ja ehitusskriptid on samuti arhiivis. Teiste sõltuvuste täpsed paketid ja algallikad on loetletud manifestis.</p><a class="button" href="legal/source.tgz" download>Laadi lähtekood alla</a><a href="https://github.com/miksniki/Klassiruum-On-Parim-Tookoht">Projekti GitHub</a><small>Väljaande tunnus: <code>${buildId.slice(0, 16)}</code> · <a href="legal/source-manifest.json">Failide manifest</a> · <a href="legal/source.tgz.sha256">SHA-256</a></small></section>
<h2>Kolmandate osapoolte tarkvara</h2><p>Allolevad komponendid säilitavad oma autoriõigused ja litsentsid. Lisatud on ka sõltuvuste teated ning pakettidesse kaasatud komponentide teated. Kõik loetletud valikulised komponendid ei pruugi brauseris kasutusel olla.</p><p><a href="legal/THIRD_PARTY_NOTICES.txt">Kõik kolmandate osapoolte litsentsiteated</a> · <a href="legal/dependencies.json">Masinloetav nimekiri</a></p>
<table><thead><tr><th>Komponent</th><th>Litsents</th><th>Teated ja allikas</th></tr></thead><tbody>${rows}</tbody></table>
<h2>Mudelid, pildid ja kirjatüübid</h2><p>IS-Neti mudeli algallikad ja binaarfailide kontrollsummad on <a href="legal/imgly-source.json">IMG.LY allikate manifestis</a>. Näotuvastuse mudel pärineb <a href="https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker">Google MediaPipe'ist</a>. DM Sans ja Manrope kasutavad SIL Open Font License 1.1 litsentsi.</p><p>Taustapildid on loodud tehisintellekti abil (ChatGPT).</p><p>Tarkvara litsents ei muuda sinu üleslaaditud foto õigusi ega anna eraldi õigusi teiste isikute fotodele, koolide nimedele või kaubamärkidele. Taustapiltide päritolu on kirjeldatud <a href="legal/ASSETS.md">pildimaterjali ülevaates</a>.</p>
<footer><a href="legal/NOTICE.txt">Rakenduse autoriõiguse teade</a> · <a href="./">Tagasi avalehele</a></footer></main></body></html>`;
await writeFile(join(root, 'public/licenses.html'), html);
console.log(`Prepared ${inventory.length} component notices and ${entries.length} source files (${buildId.slice(0, 16)}).`);
