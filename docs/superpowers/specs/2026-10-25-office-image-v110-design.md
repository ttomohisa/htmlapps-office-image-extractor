# Office Image Extractor v1.1.0 design

Status: User approved the approach and headline limits on 2026-10-25. Detailed engineering defaults below are implementation choices, not additional user requests.
Baseline: ttomohisa/htmlapps-office-image-extractor main d1d4c2bbfd176904f44ad9b268ab7274d789c559, version 1.0.4.

## Intent and boundaries

Make embedded originals easy to identify, locate, select and export, with usable cancellation and clear recovery. Implement all seven requested improvements and title, license placement and drop-icon corrections. Deliver tested, review-ready v1.1.0 PR; do not merge, release or deploy to production.

Preserve exact original bytes/extensions, multi-document workflows, global/document/image selection, individual downloads, collision-safe ZIP names, light/mobile design, Japanese/English, direct-file standalone and self-extracting HTML. Preserve strict document duplicate detection: matching name/size/modified-time only identifies candidates; skip only after exact byte comparison in chunks no larger than 256 KiB. Preserve overlapping-import and removal safety. Runtime network remains blocked; no user document upload.

No Office rendering, crop/rotation reconstruction, graph/shape rasterization, password decryption, legacy binary Office support, external-image fetching, permission/auth changes or new cloud service.

## Approaches

Chosen: keep embedded JSZip 3.10.1, move expensive ZIP/XML/hash work into a terminable embedded Worker. This retains the known ZIP behavior while making cancellation real.
Rejected: main-thread cancellation flags cannot stop a currently running parser/ZIP operation. Replacing the ZIP library is unnecessary compatibility risk for this upgrade.
Use a pinned, licensed, namespace-aware XML parser embedded at build time because browser DOMParser is unavailable in Workers. Select its exact package/version from official registry/vendor evidence before installation; no regex XML parser or runtime fetch. Keep worker source testable separately and embed it into the final HTML at build time.

## Runtime model and cancellation

Keep immutable original File references and stable document/image IDs in UI state. Workers own ZIP structures and transient inflated buffers, never DOM. A task envelope carries jobId, sessionId, operation and payload; events carry the same IDs and progress stage. Only the current session/job can update UI.

Use one heavy worker job at a time to bound resident ZIP/inflate memory; inspect documents sequentially and discard ZIP working state afterward. Reopen an original File on demand for preview/export. Worker tasks include inspect, read-image, identify-duplicates and export. Parse XML in the worker, not a hidden synchronous main-thread stage. Stream entry inflation into bounded chunks and verify actual byte count/CRC before offering an original.

Cancel terminates the active Worker, clears queued work belonging to the cancellation scope, rejects its pending promises and revokes its bootstrap URL. Completed document results remain. Interrupted documents become Cancelled with Retry; exports produce no download and retain selection. Remove terminates that document's work, Clear confirms then terminates all work, pagehide disposes workers and previews. Starting again creates a fresh worker. No noncancellable main-thread fallback; explain worker startup failure and offer retry or another supported browser.

## Resource defaults

Earlier user-facing GB/MB shorthand is implemented and labelled precisely as binary GiB/MiB: 1 GiB = 1,073,741,824 bytes; 1 MiB = 1,048,576 bytes.

| Resource | Warning | Hard safety ceiling |
|---|---:|---:|
| Input per document | 256 MiB | 1 GiB |
| Inputs retained per session | — | 2 GiB |
| ZIP entries per document | 5,000 | 100,000 |
| Declared and actual inflated data per document | ratio >200x and >64 MiB | 2 GiB |
| One original image | — | 512 MiB |
| Selected original output and resulting ZIP | — | 1 GiB each |
| One metadata XML part / metadata total | — | 32 MiB / 128 MiB |
| One bitmap decode | — | 32 megapixels |
| Thumbnail cache | — | 32 MiB |

Read and validate central-directory size/count/offsets before JSZip creates its object graph. Reject encrypted, malformed, unsupported ZIP64 and unsafe/traversing paths explicitly. Count observed output chunks as well as declared lengths; abort on excess or mismatches. Metadata-only limits produce a usage-mapping warning while permitting image extraction if its separate limits pass. Unknown allocation failure is recoverable, not proof of corruption. Safety ceilings are not a guarantee every phone can process those sizes. Measure representative large fixtures; seek approval before materially tighter user-facing ceilings.

## Images and previews

Each occurrence stores document ID, package path, original filename, content type, compressed/uncompressed sizes where known, dimensions or unknown, usage records, selected state and preview status. Inspect safe known raster headers before decoding. Lazy thumbnails only for visible results, one bitmap decode at a time; maintain bounded thumbnail LRU and revoke object URLs/close ImageBitmaps on eviction, removal, clear, preview close and pagehide. Do not keep decoded full originals in the thumbnail cache.

Known oversized dimensions, unknown unsafe raster formats, failed decoding and SVG/EMF/WMF use an explanatory placeholder; original save remains available. Never insert untrusted SVG into DOM, object, frame, CSS or active document. SVG original bytes are downloadable but not rendered in this release. Dimension display states unknown rather than zero. Accessible enlargement dialog restores focus, supports Escape and does not display stale previews after cancellation/removal.

## Usage provenance

Resolve internal OPC relationships relative to the referring part with canonical paths and namespace-aware attributes; reject escape paths and never follow External targets. Preserve one-to-many uses and distinguish missing/broken/incomplete mappings from confidently found references.

PowerPoint: presentation.xml ordered slide IDs -> relationship targets -> slide image references. Slide filenames are not presentation numbers. Include labelled layout/master/notes references when traversed, preventing graph cycles and duplicate usages.
Excel: workbook.xml ordered sheet names/IDs -> worksheet relationships -> drawings, VML and background references -> media. Shared images keep every sheet use; hidden sheets retain their names and status.
Word: body, header, footer, footnote/endnote and real section association when determinable. Never infer rendered page numbers. Unresolved media says reference not detected/unknown, never unused.

## Filtering, selection and duplicates

Filter by document, format, filename/usage text, minimum width/height and byte size. Sort by source order, filename, dimensions or bytes with stable ID tie-breakers. Unknown dimensions have a defined last position and do not satisfy numeric dimension filters. Page results in batches of 100 to bound DOM work.

Filtering and sorting never change selection. Keep explicit global all/none for all imported images; add clearly labelled select/clear matching results. Show total selected and hidden selected. Exports include all selected occurrences, not only the current page/filter. Later imports start selected as before.

Optional byte-identical grouping is off initially. Hash candidates in the worker, then compare bytes before merging; length/hash alone never proves equality. Keep per-occurrence document/path/usage/selection provenance, including mixed selection states. A group checkbox affects its members explicitly; matching-result actions affect only matching occurrences. Grouping changes presentation only. ZIP normally preserves selected occurrences. Separate explicit one-copy-per-identical-group setting emits one selected representative per group plus a JSON provenance manifest; no unselected bytes may enter export. Individual Save always saves that occurrence's untouched original.

## Errors and partial recovery

Distinguish unsupported/legacy, encrypted, malformed ZIP, unsafe limits, metadata warning, preview-only failure, individual original-read failure, export failure and cancellation based on verified evidence. Do not claim an exact cause where unknown. Offer concrete next action: modern OOXML copy, decrypted copy, retry, smaller selection, original save, or another browser.

Never silently save an incomplete ZIP. List failed originals with verified reasons and successful count. User must explicitly choose saving successful items; cancellation/decline produces no download. Partial archive manifest records omissions. Revalidate output limits after any choice. Complete/failed/cancelled state and progress stage remain localizable without resetting selection/focus.

## UI and documentation

Use one explicit title font-size/line-height per responsive breakpoint in JA/EN, stable title layout and no language-dependent autosizing; verify text-size adjustment and overflow on phones. Keep target-language labels and accessible Help names. Move complete third-party notices into Help, preserving notices in repository/build, fixed Help header and final build information. Replace folder/upload drop glyph with document-to-image motif, leaving supplied app/favicon artwork unchanged.

State beside results and in Help that originals may include regions cropped out in Office, and extraction does not reproduce slides/pages/overlays. Keep safe-area controls, visible focus, touch targets, live status and reduced-motion behavior. Set app/config, docs, generated variants and displayed badges to 1.1.0 consistently.

## Acceptance and delivery

Use deterministic synthetic OOXML archives for all formats, order-vs-filename mapping, shared drawings/VML, Word section/header/footer, namespace aliases, broken/external relationships, malformed ZIP/XML, corrupt media and resource boundaries. Byte-compare originals and ZIP entries. Test duplicate hash collisions, same-metadata differing documents, hidden/mixed selections and partial export consent.

Exercise actual Worker termination during ZIP load/inflate/XML/hash/export and immediate retry, not only stale-event suppression. Verify giant bitmap headers, malicious SVG, no external requests, worker/objectURL/bitmap cleanup, pagehide and export interrupt races. Run existing regression suites, source checks, official standalone/self-extract builds and repository aggregate verification; distinguish tool/platform blockers from passes. Browser-test direct-file and authorized Cloudflare PR preview, JA/EN at 320/360px and desktop, keyboard/modal focus, picker/drop, selection and downloads. Independent final code review and current-commit CI precede Draft removal. No merge/release/production deployment.
