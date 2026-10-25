# Offline verification

1. Run `./scripts/check-repository.ps1` once while build dependencies are available.
2. Disconnect the machine or block browser networking.
3. Open `dist/index.html` directly with `file://`.
4. Select representative `.xlsx`, `.pptx`, and `.docx` files.
5. Confirm image counts and ZIP download work.
6. Open `dist/index.self-extract.html` and repeat a basic extraction.
7. Confirm the browser network panel shows no runtime requests from the app.


## v1.1.0 regression additions

Run `node --test tests/*.test.cjs`, then the official repository check. The PR build workflow also downloads the official Windows-generated artifacts and runs pinned Chromium against both file:// variants via tests/browser-qa.cjs. Its screenshots and result.json are uploaded as a separate artifact. It checks previews, malicious SVG placeholder/no network, exact original ZIP bytes, grouping/provenance, filters/hidden selections, cancel/retry, Help and JA/EN 320/360/1100px layouts. A cloud browser that disallows file:// is not evidence of direct-file success; use the isolated test runner and distinguish its evidence from hosted preview QA.
