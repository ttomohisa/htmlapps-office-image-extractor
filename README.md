# Office Image Extractor

![Office Image Extractor Social Preview](assets/social-preview.png)

A local-first, self-contained browser utility for extracting original embedded images from modern Microsoft Excel, PowerPoint, and Word files.

Drop Office files into the page, inspect them entirely in the browser, and download the embedded media together as one ZIP. No upload, account, server, CDN, or runtime network connection is required.

[日本語 README](README.ja.md)

![Office Image Extractor demo](assets/demo.gif)

## Try it online

GitHub Pages: <https://ttomohisa.github.io/htmlapps-office-image-extractor/>

The legacy direct URL `office-image-extractor.html` is also kept as an alias. Your Office files stay in the browser and are never uploaded by this app.

## Highlights

- **Local-only processing** — Office files are read in browser memory.
- **One HTML release** — `dist/index.html` contains the app and its pinned runtime dependency.
- **Original image bytes** — embedded media is copied without recompression or conversion.
- **Excel / PowerPoint / Word** — supports modern Office Open XML formats and macro/template variants.
- **Batch extraction** — inspect multiple documents and save all extracted media as one ZIP.
- **Controlled memory use** — Office packages are inspected with limited concurrency.
- **Japanese / English UI** — switch languages without reloading.
- **Mobile-first UI** — follows the shared `htmlapps-template` visual and accessibility conventions.
- **Self-extracting build** — an optional gzip-based HTML wrapper is generated alongside the readable build.

## Supported formats

| Application | Extensions |
|---|---|
| Excel | `.xlsx`, `.xlsm`, `.xltx`, `.xltm` |
| PowerPoint | `.pptx`, `.pptm`, `.potx`, `.potm`, `.ppsx`, `.ppsm` |
| Word | `.docx`, `.docm`, `.dotx`, `.dotm` |

Legacy `.xls`, `.ppt`, and `.doc` files are not supported because they are not Office Open XML ZIP packages.

## How it works

Modern Office Open XML documents are ZIP packages. The app reads the package locally with JSZip and copies media entries from these locations:

| Source | Media path |
|---|---|
| Excel | `xl/media/` |
| PowerPoint | `ppt/media/` |
| Word | `word/media/` |

The output is organized by source document:

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

If two source documents or media entries would produce the same ZIP path, the app creates a unique name instead of overwriting data.

## Use locally

### Ready-built HTML

Open either of these files directly in a current browser:

- `index.html`
- `office-image-extractor.html`

Both are generated copies of the current standalone build. For release artifacts, use `dist/index.html`.

### Build from source

The repository follows [`ttomohisa/htmlapps-template`](https://github.com/ttomohisa/htmlapps-template).

Source of truth:

```text
src/index.template.html
```

Build on Windows:

```powershell
.\build-standalone.ps1
```

or:

```bat
build-standalone.bat
```

The build:

1. reads `app.config.json` and `dependencies.json`,
2. downloads the pinned JSZip package when it is not already cached,
3. embeds the required asset into the HTML,
4. writes dependency/build metadata,
5. verifies the standalone artifact,
6. creates `dist/index.self-extract.html`,
7. refreshes the root HTML copies and the legacy Pages alias.

Run the complete repository check with:

```powershell
.\scripts\check-repository.ps1
```

Use `-ForceDownload` to refresh the dependency cache.

## Repository layout

```text
.
├── src/
│   └── index.template.html
├── scripts/
│   ├── build-self-extract.ps1
│   ├── check-repository.ps1
│   ├── verify-self-extract.ps1
│   └── verify-standalone.ps1
├── schemas/
├── docs/
├── dist/                         # generated release artifacts
├── app.config.json
├── dependencies.json
├── build-standalone.ps1
├── build-standalone.bat
├── index.html                    # generated direct-access copy
└── office-image-extractor.html   # generated legacy/direct-access copy
```

`AGENTS.md` and `APP_SPEC.md` define the implementation constraints and acceptance criteria used for future changes.

## Privacy and security

- Files are processed entirely inside the browser.
- The app does not upload document contents.
- There is no account, analytics, telemetry, tracking, or remote logging.
- Runtime CSP includes `connect-src 'none'`.
- JSZip is version-pinned and embedded into the generated HTML at build time.
- Office macros are not executed; the package is treated only as ZIP/XML/media data.

See [SECURITY.md](SECURITY.md) and [VERIFY_OFFLINE.md](VERIFY_OFFLINE.md).

## Limitations

- Password-protected or corrupted Office packages may not be readable.
- Externally linked images are not downloaded; only embedded media is extracted.
- The app extracts stored media rather than rendering pages or slides.
- Some documents contain EMF, WMF, TIFF, SVG, GIF, or other uncommon image formats. These are preserved as-is; preview support depends on the operating system and applications.
- Very large documents can require substantial browser memory.

## Third-party software

The release embeds **JSZip 3.10.1**, which is dual-licensed under MIT or GPLv3. This project uses it under the MIT terms. JSZip includes/uses pako for DEFLATE support.

See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for notices retained with the project.

## License

MIT License. See [LICENSE](LICENSE).

Microsoft, Excel, PowerPoint, Word, and Office are trademarks of the Microsoft group of companies. This project is independent and is not affiliated with, endorsed by, or sponsored by Microsoft.
