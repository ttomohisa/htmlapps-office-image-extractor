# Architecture

The source template contains the application shell and three build placeholders. `build-standalone.ps1` downloads the pinned JSZip package at build time, embeds `dist/jszip.min.js` as Base64, and replaces the placeholders with app configuration, a dependency manifest, and the asset bundle.

At runtime the app creates a temporary Blob URL for the embedded JSZip script. CSP allows Blob scripts but blocks all network connections. Office files are opened with JSZip and media entries from `xl/media/`, `ppt/media/`, or `word/media/` are copied into a new ZIP.

The second release artifact gzip-compresses the complete standalone HTML and wraps it in a small loader that restores it with `DecompressionStream`.
