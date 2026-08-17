# Office Image Extractor

[![GitHub Pages](https://github.com/ttomohisa/htmlapps-office-image-extractor/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/ttomohisa/htmlapps-office-image-extractor/actions/workflows/deploy-pages.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Single HTML](https://img.shields.io/badge/distribution-single%20HTML-0ea5e9)](https://ttomohisa.github.io/htmlapps-office-image-extractor/)

[日本語版 README](README.ja.md)

A privacy-focused, single-HTML app for extracting original embedded images from modern Microsoft Excel, PowerPoint, and Word files without uploading the selected documents to a server.

## 🚀 Live demo

### [Open Office Image Extractor on GitHub Pages](https://ttomohisa.github.io/htmlapps-office-image-extractor/)

GitHub Pages delivers the initial HTML. After it loads, Office file inspection, image extraction, and ZIP creation are processed locally on your device. The files you select are not uploaded by the app.

[![Office Image Extractor demo](assets/demo.gif)](https://ttomohisa.github.io/htmlapps-office-image-extractor/)

## Features

- Extract original embedded images without recompression or conversion
- Support modern Excel, PowerPoint, and Word Open XML formats
- Add multiple Office files and inspect them together
- Show the detected image count for each source file
- Download all extracted images together as one ZIP
- Preserve uncommon image formats such as SVG, EMF, WMF, TIFF, and GIF as stored in the Office package
- Avoid filename collisions when multiple source documents contain the same media names
- Japanese and English UI in the same HTML
- Responsive layout for desktop and mobile
- Embedded SVG favicon
- Embedded JSZip runtime with a pinned version
- No runtime network connection after the HTML has loaded
- Generate both a readable standalone HTML and a gzip self-extracting HTML

## Supported formats

| Application | Extensions |
| --- | --- |
| Excel | `.xlsx`, `.xlsm`, `.xltx`, `.xltm` |
| PowerPoint | `.pptx`, `.pptm`, `.potx`, `.potm`, `.ppsx`, `.ppsm` |
| Word | `.docx`, `.docm`, `.dotx`, `.dotm` |

Legacy `.xls`, `.ppt`, and `.doc` files are not supported because they are not Office Open XML ZIP packages.

## Quick start

### Use the web demo

Just [open the demo](https://ttomohisa.github.io/htmlapps-office-image-extractor/). No installation or account is required.

### Use the downloaded HTML

1. Download [office-image-extractor.html](https://github.com/ttomohisa/htmlapps-office-image-extractor/blob/main/office-image-extractor.html) from this repository.
2. Open it in a current Chromium-based browser, Firefox, or Safari.
3. Add Office files and extract their embedded images locally.

### Build and use it fully offline (advanced)

1. Download or clone this repository.
2. Double-click `build-standalone.bat` on Windows.
3. The first build downloads the exact dependency version pinned in `dependencies.json`.
4. Copy the generated `dist/index.html` wherever you need it.
5. Open that single file later without an internet connection.

Python, Node.js, and a local web server are not required. The builder uses Windows PowerShell and the built-in `tar.exe`.

## Usage

1. Drop Excel, PowerPoint, or Word files onto the page, or choose them from your device.
2. Wait for each file to finish inspecting its embedded media.
3. Review the number of images found for each source document.
4. Add more Office files if needed.
5. Select **Download extracted images (.zip)** to save everything together.
6. Use **Clear all** when you want to remove the selected files and results from the current session.

The downloaded ZIP is grouped by source document. For example:

```text
extracted-office-images.zip
├── quarterly-report/
│   ├── image1.png
│   └── image2.jpeg
├── project-slides/
│   └── image1.png
└── proposal/
    └── image1.svg
```

If two source documents or media entries would create the same ZIP path, the app generates a unique name instead of overwriting a file.

## How it works

Modern Office Open XML documents are ZIP packages. The app reads those packages locally with JSZip and copies media entries from these locations:

| Source | Media path |
| --- | --- |
| Excel | `xl/media/` |
| PowerPoint | `ppt/media/` |
| Word | `word/media/` |

The app does not render pages or slides and then take screenshots. It extracts the media files stored inside the Office package, so the original embedded image bytes are retained whenever possible.

Macro-enabled files such as `.xlsm`, `.pptm`, and `.docm` can be inspected, but macros are never executed.

## Publish with GitHub Pages

The repository includes a workflow that builds the fully embedded HTML and deploys it to GitHub Pages automatically.

1. Push the repository to GitHub as `htmlapps-office-image-extractor`.
2. Open **Settings → Pages → Build and deployment → Source** and select **GitHub Actions**.
3. Push to `main`, or manually run **Deploy standalone app to GitHub Pages** from the Actions tab.
4. After a successful deployment, the demo is available at `https://ttomohisa.github.io/htmlapps-office-image-extractor/`.

Each push to `main` rebuilds `dist/index.html` from the pinned dependency, verifies the standalone artifact, generates the self-extracting variant, and then publishes the `dist` directory.

The legacy `/office-image-extractor.html` path is also generated as an alias for compatibility.

## Development and build layout

This repository follows [`ttomohisa/htmlapps-template`](https://github.com/ttomohisa/htmlapps-template).

```text
.
├─ src/index.template.html             # Application source template
├─ dependencies.json                   # Pinned JSZip version and embedded asset
├─ app.config.json                     # App metadata and build settings
├─ build-standalone.bat                # Windows build entry point
├─ build-standalone.ps1                # Standalone HTML builder
├─ scripts/
│  ├─ build-self-extract.ps1           # Self-extracting HTML builder
│  ├─ check-repository.ps1             # Full repository validation
│  ├─ verify-standalone.ps1            # Standalone HTML validation
│  └─ verify-self-extract.ps1          # Self-extract payload validation
├─ dist/index.html                     # Generated deployment artifact
├─ dist/index.self-extract.html        # Generated gzip self-extracting artifact
└─ .github/workflows/
   ├─ build-standalone.yml              # Pull request build validation
   └─ deploy-pages.yml                  # Automatic Pages deployment from main
```

`src/index.template.html` is the source of truth for the application UI and logic. Root-level `index.html` and `office-image-extractor.html` are generated convenience copies.

### Build and verify

Run:

```bat
build-standalone.bat
```

or run the complete repository check:

```powershell
.\scripts\check-repository.ps1
```

To discard the package cache and download the pinned dependency again:

```bat
build-standalone.bat -ForceDownload
```

The build process automatically:

- Downloads the pinned JSZip tarball from the official npm registry when needed
- Embeds the required JSZip asset into the standalone HTML
- Records dependency metadata and SHA-256 hashes
- Rejects unresolved build placeholders and external runtime script or stylesheet references
- Verifies that the Content Security Policy blocks runtime connections
- Generates `dist/dependency-manifest.json`
- Generates and verifies `dist/index.self-extract.html`

## Privacy and runtime network protection

The generated HTML includes:

- A Content Security Policy containing `connect-src 'none'`
- No external runtime script or stylesheet dependency
- JSZip embedded directly in the generated HTML
- Local-only Office package inspection and ZIP creation
- No account, analytics, telemetry, tracking, or remote logging

The GitHub Pages version requires an initial HTML request, but the Office files selected by the user are not transmitted by the app. For use with the network completely disconnected, open the generated `dist/index.html` locally.

## Limitations

- Password-protected or corrupted Office packages may not be readable.
- Externally linked images are not downloaded; only media embedded in the Office package is extracted.
- Legacy `.xls`, `.ppt`, and `.doc` files are not supported.
- The app extracts stored media rather than rendering documents, worksheets, or slides.
- Some documents contain EMF, WMF, TIFF, SVG, GIF, or other uncommon formats. They are preserved as-is, but preview support depends on your operating system and applications.
- Very large documents or large batches can consume substantial browser memory.

## Dependencies

| Library | Version | License | Purpose |
| --- | ---: | --- | --- |
| JSZip | 3.10.1 | MIT or GPL-3.0-or-later | Reading Office Open XML ZIP packages and generating the output ZIP |

This project uses JSZip under its MIT terms. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for details.

## Contributing

Bug reports and feature proposals are welcome through GitHub Issues. See [CONTRIBUTING.md](CONTRIBUTING.md) for development guidance.

## License

Copyright © 2026 ttomohisa

Licensed under the [MIT License](LICENSE).

Microsoft, Excel, PowerPoint, Word, and Office are trademarks of the Microsoft group of companies. This project is independent and is not affiliated with, endorsed by, or sponsored by Microsoft.
