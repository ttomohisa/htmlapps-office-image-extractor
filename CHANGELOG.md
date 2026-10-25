# Changelog

## 1.1.0 - 2026-10-25

- Add bounded raster previews, enlargement, dimensions, byte sizes and relationship-based Office provenance.
- Add filters/sorting, optional exact-image grouping and explicit unique-copy ZIP manifests without losing selections.
- Move package processing and export into terminable Workers with generous resource budgets, CRC/path validation and explicit partial-save recovery.
- Explain uncropped originals, stabilize bilingual titles, move complete licenses into Help and replace the drop icon.
- Preserve offline standalone/self-extract HTML and strict document-byte deduplication. Add unit, worker lifecycle and real-browser regression coverage.


## Unreleased — mobile Help layout

- Hide the informational footer at 520px and below; move existing build information to the end of Help without changing functional bottom controls.
- Preserve localized build values, keyboard access, and existing visibility policies; standardize the exact local-processing label.

## Unreleased

- Clarify Japanese and English help by removing internal layout, implementation, and audit commentary while preserving usage guidance and cautions.

## 1.0.4 - 2026-10-10

- Keep the page stationary behind modal dialogs and make Clear confirmation content scrollable on short screens.
- Wrap the compact title/version without shrinking language and Help controls.
- Return keyboard focus to Choose files after confirmed clearing; preserve cancellation and extraction behavior.
- Add responsive dialog and actual Clear-handler regression coverage.

## 1.0.3 - 2026-10-09

- Add a genuine English screenshot for the app catalog and documentation.

## 1.0.2 - 2026-10-09

- Apply the supplied redesigned icon to the canonical SVG asset, app header, and embedded favicons across standalone releases.
- Preserve the original SVG artwork and viewBox; add regression checks for asset and release icon parity.

## 1.0.1 - 2026-10-06

- Standardize the local-processing badge and compact EN / JA target-language control, including localized accessible names, titles, and Help.
- Keep application processing, data formats, privacy boundaries, dependencies, and layouts unchanged.
- Add source and generated-artifact header regressions. Real-browser verification is tracked separately.


## 1.0.0 - 2026-08-17

- Align repository structure with `ttomohisa/htmlapps-template`.
- Add `src/index.template.html`, `app.config.json`, pinned dependency configuration, PowerShell build/verification scripts, and GitHub Actions workflows.
- Add gzip self-extracting HTML output.
- Add in-app confirmation before clearing selected files.
- Add build metadata display and template-style bilingual documentation.
- Keep root `index.html` and `office-image-extractor.html` as direct-access generated copies.
