# Security

Office Image Extractor is intentionally local-first. Selected files are read in browser memory and are not uploaded by the application.

## Reporting a vulnerability

Please avoid posting sensitive Office documents in a public issue. Report the smallest reproducible description possible, including browser and file type. If sample content is required, create a synthetic document with no confidential data.

## Security invariants

- Runtime networking is blocked by CSP.
- No analytics or telemetry is included.
- Third-party browser code is version-pinned and embedded in the generated HTML.
- The app does not execute macros contained in Office files; it treats the package as ZIP/XML/media data.
