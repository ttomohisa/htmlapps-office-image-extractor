# Changelog

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
