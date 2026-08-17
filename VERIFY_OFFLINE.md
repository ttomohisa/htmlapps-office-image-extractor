# Offline verification

1. Run `./scripts/check-repository.ps1` once while build dependencies are available.
2. Disconnect the machine or block browser networking.
3. Open `dist/index.html` directly with `file://`.
4. Select representative `.xlsx`, `.pptx`, and `.docx` files.
5. Confirm image counts and ZIP download work.
6. Open `dist/index.self-extract.html` and repeat a basic extraction.
7. Confirm the browser network panel shows no runtime requests from the app.
