# AGENTS.md

## Start here

Read `APP_SPEC.md`, `app.config.json`, and `dependencies.json` before editing the app. This repository follows the conventions of `ttomohisa/htmlapps-template`.

## Non-negotiable constraints

- The release artifact must work as a self-contained HTML file opened through `file://`.
- User Office files must never be uploaded or sent to a server.
- Runtime networking stays blocked by CSP (`connect-src 'none'`).
- Do not add CDN links, analytics, telemetry, remote fonts, or remote logging.
- Keep Japanese and English UI in sync.
- Keep the light-only visual language and mobile-first responsive behavior.
- Destructive actions use the in-app confirmation dialog; do not use `window.confirm()`.
- Keep third-party versions pinned in `dependencies.json` and notices in `THIRD_PARTY_NOTICES.md`.

## Source and generated files

- Edit `src/index.template.html` for application changes.
- `build-standalone.ps1` embeds pinned dependencies and generates `dist/index.html`.
- The build also refreshes root `index.html` and `office-image-extractor.html` for direct repository access and backward compatibility.
- `scripts/build-self-extract.ps1` generates `dist/index.self-extract.html`.
- Do not hand-edit generated `dist` files as the source of truth.

## Before finishing

Run `./scripts/check-repository.ps1` on Windows. Manually test direct-file opening, file picker, drag and drop, multi-file processing, clear confirmation, ZIP download, Japanese/English switching, and the help dialog.
