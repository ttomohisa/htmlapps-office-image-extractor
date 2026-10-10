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
4. Review per-file image counts and skipped non-image media; select all/none across all documents beside the selected-image total, or expand a document to inspect filenames/formats and select images.
5. Download selected images in one ZIP archive, or save individual originals.
6. Clear the session through the in-app confirmation dialog.

## 3. Functional requirements

- Support `.xlsx`, `.xlsm`, `.xltx`, `.xltm`, `.pptx`, `.pptm`, `.potx`, `.potm`, `.ppsx`, `.ppsm`, `.docx`, `.docm`, `.dotx`, and `.dotm`.
- Read only embedded media entries under `xl/media/`, `ppt/media/`, and `word/media/`.
- Classify images from OOXML content types; when metadata is missing or malformed, use a conservative known-image extension fallback. Explicit non-image types are excluded.
- Start each imported document with all images selected; support global all/none across every currently imported document beside the selected-image total, per-document all/none, and individual selection. Preserve expansion and keyboard focus during selection, progress, and language updates. Selection exists only in the current session; global actions do not change the initial selection of later imports.
- Preserve original image bytes and extensions without recompression or conversion.
- Support multiple documents and prevent duplicate output paths.
- Use filename, byte size, and modification time only to find possible duplicate documents. Skip a candidate only after exact local byte equality with an earlier, still-present document is confirmed; retain different content even when all three metadata fields match. Different metadata does not trigger content-wide deduplication.
- Compare duplicate candidates in chunks of at most 256 KiB using the same queue as Office package inspection, with at most two active tasks. Serialize admission decisions within each matching-metadata group, including overlapping imports. A failed comparison keeps the document for normal inspection and displays a warning.
- Removing or clearing records invalidates their pending work; stale comparison or inspection results must not restore them or overwrite newer import status.
- Disable global selection and ZIP download while import, duplicate checking, or inspection is pending; also disable global selection during ZIP or individual-image export. Zero selected images cannot be exported as a ZIP.
- Bounded comparison reads and inspection concurrency do not provide streaming ZIP parsing or a total memory cap; JSZip and large documents or batches can still consume substantial browser memory.
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
- Visible keyboard focus. After confirmed clearing, focus returns to the visible, enabled Choose files control unless a newer modal owns focus.
- Open modal dialogs lock background page scrolling. The confirmation header stays visible while its body and actions scroll on short screens.
- Narrow headers wrap the title/version without shrinking language or Help controls.
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
- Global all/none updates every imported document and the selected total, preserves document expansion and keyboard focus, and leaves later imports initially selected. Per-document selection and individual original-image Save continue to work.
- Same-metadata documents with different bytes are both retained and export their original images under unique document folders; byte-identical copies with the same metadata are skipped.
- Regression coverage includes bounded multi-chunk comparison, overlapping imports, read failures, and removal/clear during pending work. Real-browser checks separately cover picker/drop, keyboard controls, downloads, and direct-file boot; test-only DOM/XML adapters are not evidence of browser verification.

## Header consistency (v1.0.1)

- Display the canonical three-part app version as `vX.Y.Z`.
- Show `完全ローカル処理` in Japanese and `Fully local processing` in English; preserve the more detailed privacy explanations.
- The language button shows the target language: `EN` in Japanese UI and `JA` in English UI. Its accessible name and title describe that target in the current UI language.
- Keep Help accessible names and titles localized, without resetting work when switching languages.
