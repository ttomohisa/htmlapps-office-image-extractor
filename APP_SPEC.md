# APP_SPEC.md

## 1. Product identity

- **Name:** Office Image Extractor
- **Purpose:** Extract original embedded images from modern Excel, PowerPoint, and Word files without uploading the documents.
- **Primary users:** People who need screenshots, photos, diagrams, or other original media stored inside Office documents.
- **Release artifacts:** `dist/index.html` and `dist/index.self-extract.html`

## 2. Core user flow

1. Open the app locally or through GitHub Pages.
2. Select or drop one or more supported Office Open XML files.
3. Wait for local inspection to complete.
4. Review per-file image counts and any errors.
5. Download all extracted images in one ZIP archive.
6. Clear the session through the in-app confirmation dialog.

## 3. Functional requirements

- Support `.xlsx`, `.xlsm`, `.xltx`, `.xltm`, `.pptx`, `.pptm`, `.potx`, `.potm`, `.ppsx`, `.ppsm`, `.docx`, `.docm`, `.dotx`, and `.dotm`.
- Read only embedded media entries under `xl/media/`, `ppt/media/`, and `word/media/`.
- Preserve original image bytes and extensions without recompression or conversion.
- Support multiple documents and prevent duplicate output paths.
- Limit simultaneous Office package inspection to reduce peak memory use.
- Disable ZIP download until inspection has finished.
- Keep Japanese and English UI switchable without reload.
- Use reusable in-app confirmation for destructive clearing.
- Expose build version, generation time, and embedded dependency count.

## 4. Data and privacy

All processing happens in the browser. The app has no upload, account, analytics, telemetry, or runtime network request. CSP must include `connect-src 'none'`.

## 5. Non-goals

- Legacy binary `.xls`, `.ppt`, `.doc` support.
- Password-protected Office package decryption.
- Rendering document pages or slide appearance.
- Downloading externally linked images.
- Cloud storage or collaboration.

## 6. UX and accessibility

- Mobile-first from 320px upward.
- Visible keyboard focus.
- `prefers-reduced-motion` respected.
- Help dialog documents the real workflow and limitations.
- Confirmation dialog is centered on desktop and becomes a safe-area-aware bottom sheet on smartphones.
- Status updates use `aria-live` regions.

## 7. Acceptance criteria

- `build-standalone.ps1` generates readable and self-extracting HTML outputs.
- `scripts/verify-standalone.ps1` and `scripts/verify-self-extract.ps1` pass.
- No build placeholders remain in generated HTML.
- No external runtime scripts, stylesheets, frames, or module imports remain.
- Both generated HTML files open directly without a server.
- JSZip 3.10.1 is pinned and embedded at build time.
- The clear action requires explicit confirmation and cancel / Esc / close / backdrop tap leave the session intact.
- Japanese and English UI fit at 360px width.
