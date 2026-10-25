# Architecture

The PowerShell build embeds pinned JSZip 3.10.1 and sax 1.6.1 plus first-party office-worker.js, office-jobs.js and office-view.js in the standalone asset bundle. There are no runtime imports or network calls. Root/download aliases and the gzip self-extract wrapper are generated, not hand-edited.

The UI keeps immutable original File references, stable image occurrence IDs, selection, provenance and bounded preview resources. OfficeJobs serializes heavy jobs, creates a Blob Worker per job, and terminates/revokes it on success, error or cancellation. Job/session IDs and affected document IDs invalidate stale and multi-document results. Document candidate duplicate comparison remains exact in bounded 256 KiB chunks.

The worker validates ZIP central/local identities, names, budgets and CRCs, then uses namespace-aware bounded SAX events for usage mapping. It reads originals on demand, fingerprints and byte-compares duplicate candidates, and generates STORE ZIPs to avoid recompressing already-compressed image formats. Original bytes are never recompressed as images. Metadata failure is separate from image-read failure. Partial output is never downloaded until the UI obtains explicit consent.

Preview decoding only accepts recognized, budgeted raster headers. The UI renders small PNG thumbnails into a bounded LRU and closes bitmaps/revokes URLs. SVG and unsupported originals are not embedded as active content. Filters and grouping are views over occurrence selection, never destructive transforms.

See the approved v1.1.0 design for exact limits and acceptance cases.
