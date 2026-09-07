# Klassiruum on parim töökoht

An Estonian photo booth built with React, TypeScript, Vite, and native Canvas. Upload a portrait, remove its background, enlarge the eyes, fit glasses automatically, choose one of the three supplied campaign backgrounds, and download a 1536 × 1024 PNG.

## Run

```sh
nvm use
npm ci
npm run dev
```

Use Node 22.14 or newer. Open the local URL printed by Vite. `npm ci` copies the installed MediaPipe WASM files and compression worker library into `public/vendor`; those generated files are ignored by Git and copied again before development and production builds.

```sh
npm run build
npm run preview
npm run lint
npm test
```

Tests use locally installed Google Chrome. They cover the interface, validation, mobile overflow, transparent bounds, eye magnification, glasses drawing, and PNG creation. To include real background removal and face detection, provide a portrait with a clearly visible face:

```sh
PORTRAIT_TEST_FILE=/absolute/path/to/portrait.jpg npm test
```

To test the compiled production app, run `npm run build`, then `TEST_PRODUCTION=1 PORTRAIT_TEST_FILE=/absolute/path/to/portrait.jpg npm test`. The source-module canvas test runs only against the development server; the production test checks the real exported PNG against the preview pixel-for-pixel.

To check the very first upload with freshly optimized dependencies, run `TEST_COLD_START=1 PORTRAIT_TEST_FILE=/absolute/path/to/portrait.jpg npm test -- --grep 'real portrait'`. This starts a separate Vite server on port 5174 with forced dependency optimization and asserts that processing completes without reloading the page. Worker-only image dependencies are explicitly included in `optimizeDeps` to prevent a dependency-discovery reload during the first upload.

The real-model test requires internet, can take several minutes, and writes the exported picture and an editor screenshot into `test-results/`. The default test run skips it to avoid repeatedly downloading large models. Test-only portraits are not bundled with the app.

## How it works

1. Validate JPG, PNG, or WebP files up to 30 MB. Compress and resize to at most 2000 px with `browser-image-compression` in a worker. Phone orientation is handled during preparation.
2. Run IMG.LY's quantized IS-Net model in a dedicated worker. Show asset-download progress and allow cancellation. The worker terminates after processing or cancellation to release model memory.
3. Run MediaPipe Face Landmarker on the prepared original. Detect up to five faces; locate each pair of eyes and account for the head's in-plane tilt.
4. Use a smooth inverse radial warp with bilinear sampling to enlarge eyes. Draw round, square, or sunglasses on Canvas. Eye strength, frame size, and vertical frame offset are adjustable.
5. Scan the cutout's alpha channel for the person's bounds, automatically fit the person, then compose with the chosen background. Position using drag, arrow keys, or sliders. Face effects are cached while positioning.
6. Export the same composite used by the preview as PNG. Viewing the original does not change the downloaded result.

Defaults apply enlarged eyes and round glasses automatically. A missed face or failed landmark model shows an explanation and leaves background composition and export available. Portraits with one clearly visible, front-facing person work best. This is a 2D face effect; extreme head turns, occlusion, and existing glasses can reduce alignment quality.

## Files

- `src/App.tsx`, `src/styles.css`: responsive editor and campaign design.
- `src/backgrounds.ts`, `src/assets/`: the three original background assets.
- `src/utils/processPhoto.ts`: preparation, cancellation, and processing orchestration.
- `src/workers/background.worker.ts`: background removal off the UI thread.
- `src/utils/face.ts`: facial landmarks.
- `src/utils/effects.ts`: eye warp and glasses rendering.
- `src/utils/canvas.ts`: transparent bounds and PNG helpers.
- `src/utils/generateImage.ts`: shared preview/export composition.

## Hosting and network

Deploy the generated `dist/` directory to a static HTTPS host. No backend, API key, or upload endpoint is required. Photos and face coordinates remain in browser memory; resetting or closing the page discards them. Downloaded files remain wherever the user saves them.

The first photo requires model downloads (tens of megabytes). IMG.LY model/runtime data comes from `staticimgly.com`, and the face model comes from Google's `storage.googleapis.com`. The browser can cache these downloads; offline use is not guaranteed. MediaPipe WASM and the compression library are served from the app itself. Google Fonts supplies optional fonts with local fallbacks. These requests download code, models, or fonts and do not contain the user's photo.

Configure these HTTP response headers for efficient multithreaded inference:

```text
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Embedder-Policy: require-corp
```

Vite development and preview include them. `public/_headers` supplies them on static hosts that support this convention, including Netlify and Cloudflare Pages; configure equivalent headers on other hosts. Serve `.wasm` as `application/wasm`. If your host sets a CSP, allow the documented model origins, `blob:` workers, and WebAssembly execution. Keep the `vendor/` folder in the deployment.

The installed IMG.LY 1.7.0 package declares `onnxruntime-web` **1.21.0** as its peer dependency, so this project pins that stable release rather than the older prerelease in the initial prototype.

## License and public source

Copyright (C) 2026 Nikita Mikson and contributors. Original application code is
licensed under **GNU AGPL version 3 only (AGPL-3.0-only)**. See [LICENSE](LICENSE)
and [NOTICE](NOTICE). You may use, study, modify and redistribute it under those
terms. The software is provided without warranty to the extent permitted by law.
Third-party components keep their own licenses; see
[THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) and [ASSETS.md](ASSETS.md).

Every `npm run build` prepares `/licenses.html`, the complete notice files, and
`/legal/source.tgz` before Vite builds the app. The footer links to this local
source download, so a missing or outdated GitHub commit does not prevent visitors
from obtaining the application source. The archive contains the current source,
backgrounds, build scripts, lockfile, notices, the matching IMG.LY source tree,
and the exact preferred source contents embedded in IMG.LY's published bundle.
`source-manifest.json` identifies the source files using SHA-256 checksums.
Runtime packages and external model resources are identified by version, locked
download URL/integrity, or upstream source references. To rebuild the app, extract
the archive and run `nvm use`, `npm ci`, and `npm run build`.

The archive is assembled from an explicit allowlist and excludes `.git`, `.env`
files, installed packages, generated archives, test output, and temporary photos.
Do not put secrets in application source files: those files are intentionally
public. The build fails if a runtime package lacks collected license text or its
installed version differs from the lockfile.

`npm run legal:prepare` refreshes the notices/source archive during development.
License texts downloaded from upstream are retained in `legal/upstream/` with
their source URLs and checksums; builds do not fetch them. To review updates,
use `npm run legal:fetch` and inspect the resulting files and inventory. The
IMG.LY upstream source revision, included paths, model URLs and checksums are in
`legal/imgly-source.json`. Its TypeScript source matches the installed 1.7.0
source map. This source selection omits unrelated example photos and identifies
the original binary model downloads separately.

Publish the entire `dist/` directory including legal files. Rebuild after each
source change. Retain matching source releases for any older app versions you
continue to distribute, and keep the public repository current. A different
deployment host must preserve access to the notice and source files. The
`private: true` npm field prevents accidental npm publication; it does not make
this project's source private or override its AGPL license.

## Dependency references

- [IMG.LY background removal documentation and licensing](https://github.com/imgly/background-removal-js/tree/main/packages/web): the installed library is AGPL-3.0; IMG.LY also offers other licensing arrangements. Account for that license when distributing or deploying this project.
- [MediaPipe Face Landmarker web documentation](https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker/web_js): landmark detection and model configuration.
- [Browser Image Compression](https://github.com/Donaldcwl/browser-image-compression): preparation, orientation, and worker support.

Background artwork is supplied by the project owner and preserved without modification.
