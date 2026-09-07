# Third-party notices

Original application code: copyright (C) 2026 Nikita Mikson and contributors,
licensed under AGPL-3.0-only. Third-party code keeps its original license.

`npm run legal:prepare` generates the complete installed runtime dependency
inventory, license texts, and source download in `public/legal/`. The public
`licenses.html` page links to every notice, the application license, source
manifest and source archive. Development and production setup run this command
automatically. Deploy the entire generated `dist/` directory.

## Main components

| Component | License | Source |
| --- | --- | --- |
| IMG.LY background removal 1.7.0 | AGPL-3.0 | https://github.com/imgly/background-removal-js |
| MediaPipe Tasks Vision 0.10.32 | Apache-2.0 | https://github.com/google-ai-edge/mediapipe/tree/v0.10.32 |
| ONNX Runtime Web/Common 1.21.0 | MIT plus bundled upstream notices | https://github.com/microsoft/onnxruntime/tree/v1.21.0 |
| browser-image-compression 2.0.2 | MIT | https://github.com/Donaldcwl/browser-image-compression/tree/2.0.2 |
| React / React DOM 19.2.8 | MIT | https://github.com/facebook/react |
| IS-Net model | MIT | https://github.com/xuebinqin/DIS |
| MediaPipe face-landmarker model bundle, float16 version 1 (BlazeFace, Face Mesh V2, Blendshape V2) | Apache-2.0, per each linked Google model card | https://ai.google.dev/edge/mediapipe/solutions/vision/face_landmarker |
| DM Sans / Manrope | SIL OFL-1.1 | https://github.com/google/fonts |

The generated inventory also covers transitive runtime dependencies. IMG.LY's
published bundle embeds lodash-es 4.17.21 and zod 3.24.2 independently of the
versions resolved in the application's lockfile; their notices are retained
separately. browser-image-compression also embeds UPNG.js (f6e5f93) and
canvas-to-bmp (77aaf22); their MIT notices and pinned upstream source references
are included. Microsoft's full ThirdPartyNotices.txt is included unchanged; some
entries cover platforms or optional backends this browser application does not
use. Inclusion of a notice is not a claim that every optional component ships.

Legal texts absent from the relevant npm package are retained from upstream in
`legal/upstream/`, with retrieval URLs and SHA-256 checksums. `guid-typescript`
1.0.9 declares ISC and author "nicolas" in package.json but supplies no separate
copyright/license file. Its metadata, the standard ISC license text, and the
upstream source reference are preserved explicitly instead of inventing an
upstream copyright statement.

No installed upstream package is modified. Exact source-map contents shipped
by IMG.LY are included in the source archive, together with its source tree and
build scripts. Other dependencies can be obtained at the locked package URLs
and versioned upstream references in the generated inventory.
