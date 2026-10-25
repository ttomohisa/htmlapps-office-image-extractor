# Office Image Extractor v1.1.0 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver all requested image discovery, provenance, selection, grouping, cancellation, recovery and UI improvements as a tested review-ready v1.1.0 PR.
**Architecture:** Retain JSZip and the existing app shell; move package work into one terminable embedded Worker and keep immutable Files plus stable selection/provenance in the UI. A separate worker source is embedded by the official build; release remains one offline HTML file. Use byte-preserving exports and bounded on-demand preview resources.
**Tech Stack:** Vanilla browser JavaScript/CSS, JSZip 3.10.1, pinned build-time embedded namespace-aware XML parser, PowerShell build, Node regression tests and real-browser QA.
**Spec:** ../specs/2026-10-25-office-image-v110-design.md

## Global Constraints

- Base main d1d4c2bbfd176904f44ad9b268ab7274d789c559. Isolate from old dirty checkouts. Do not use user PC.
- Preserve exact original bytes/extensions, strict 256 KiB-chunk document duplicate comparison, existing selection/download semantics, JA/EN and local single-HTML/direct-file operation.
- No runtime networking, CDN, uploads, Office rendering, page guessing, permission/auth changes, main updates, merge, release or production deployment.
- Warning 256 MiB/document; hard input 1 GiB/document and 2 GiB/session; selected/output ZIP 1 GiB. GiB/MiB are binary and labelled consistently.
- Other exact ceilings: 100,000 ZIP entries; 2 GiB inflated/document; 512 MiB/image; XML 32 MiB/part and 128 MiB total; 32 MP bitmap decode; 32 MiB thumbnail cache; 100 rendered rows/page.
- Actual cancellation terminates work. No silent partial ZIP, lossy preview replacing originals, or byte-deduplication without equality verification.

## Review Focus

- Same metadata but different Office bytes, overlapping imports and remove/retry races must never drop a valid document (Task 1).
- Malicious path, namespace alias, cycles, external target and presentation order must never yield false provenance or network activity (Task 2).
- Tiny compressed image with huge dimensions, hostile SVG and cancellation during decode must not allocate an unbounded bitmap or retain URLs (Task 3).
- Grouped duplicate with selected/hidden/unselected members must not silently export extra data or lose selection (Task 4).
- Cancellation or one corrupt image during export must not trigger a late or partial download without explicit consent (Task 5).

## File structure and common interfaces

Modify src/index.template.html for UI/state/worker client; create src/office-worker.js for pure worker package logic. Modify build-standalone.ps1 to embed this worker plus pinned parser, dependencies.json and THIRD_PARTY_NOTICES.md. Do not hand-edit generated variants. Extend existing tests/app-harness.cjs without presenting mock DOM results as browser verification. Create focused tests/worker.test.cjs, tests/provenance.test.cjs, tests/previews.test.cjs, tests/selection-v110.test.cjs and tests/export-recovery.test.cjs. Add deterministic OOXML builder tests/office-fixtures.cjs. Wire all suites into scripts/check-repository.ps1 and existing CI.

Common contract: DocumentRecord={id,file,state,images,warnings,error}; ImageOccurrence={id,documentId,path,name,contentType,bytes,width:null|number,height:null|number,usages:Usage[],selected,previewState}; Usage={kind,label,part,order:null|number}. Worker client run(operation,payload,{affectedDocumentIds: string[]}) returns Promise; cancel(scope) terminates current matching task and rejects with code CANCELLED. Worker requests/events carry sessionId/jobId; queued/active snapshots are invalidated if any affected document is removed. inspect(File)->metadata; readImage(File,path)->verified Uint8Array; identifyDuplicates(candidates)->groups of occurrence IDs; export(snapshot,options)->Blob and manifest or structured failed-image result. Stable IDs, not rendered array positions, identify actions.

### Task 1: Cancellable, bounded package engine

Files: worker/build/dependency files above; tests/worker.test.cjs; tests/office-fixtures.cjs; tests/app-harness.cjs; existing extraction tests.
Produces: worker protocol, central-directory preflight, bounded readImage(), terminal cancellation, unchanged strict document admission behavior.

- [ ] Add failing tests: `inputLimits` asserts exact 1,073,741,824/document and 2,147,483,648/session boundaries; `actualInflationBudget` stops false declared sizes; `duplicateZipNamesDifferentBytes` and `centralLocalIdentityConflict` reject ambiguous packages before JSZip load; `terminateDuringParse` proves real Worker dies; `retryAfterCancel` preserves completed records; `matchingMetadataDifferentBytes` retains both documents; `overlappingAdmission` maintains exact comparison and 262,144-byte maximum reads.
- [ ] Run `node --test tests/worker.test.cjs tests/extraction.test.cjs`; record expected new-feature failures without weakening existing tests.
- [ ] Implement worker source and bootstrap/client, embed dependencies through the official build, preflight before JSZip allocation, check actual chunks/CRC, queue one heavy job, dispose on remove/clear/pagehide, preserve strict document comparisons. Verify official parser version/license before pinning.
- [ ] Rerun suites and an actual browser Worker boot/terminate/retry fixture; require no post-cancel download and zero live worker after cleanup.
- [ ] Commit engine and focused tests on feature branch.

### Task 2: Accurate source mapping and original metadata

Files: src/office-worker.js; tests/provenance.test.cjs; tests/office-fixtures.cjs.
Consumes: inspect/readImage and bounded ZIP handling. Produces: ImageOccurrence metadata and Usage records; warnings instead of guessed mapping.

- [ ] Add failing tests: `slideOrderNotFilename` asserts ordered presentation IDs; `sheetDrawingVmlShared` asserts both named sheets; `wordSectionHeaderFooter` asserts section/story labels and no page number; `externalAndEscapingTargets` never resolve, while `validRelativeMediaTarget` resolves ../media correctly; `dtdAndEntitiesRejected` refuses entity declarations; `namespaceAliasesAndCycles` parses valid namespace variations without loops; `metadataLimitFallback` retains extractable originals with warning; `deepOrHighNodeMetadata` checks 256-depth/1,000,000-element/1 MiB-token/200,000-usage guards without blocking otherwise safe originals.
- [ ] Run `node --test tests/provenance.test.cjs` and confirm intended failures.
- [ ] Implement namespace-aware graph traversal, canonical OPC paths, bounded XML parts, content-type precedence, header-only dimension/byte metadata and safe unknown states.
- [ ] Rerun provenance plus existing extraction suites; compare expected maps and original byte arrays.
- [ ] Commit provenance and metadata tests.

### Task 3: Bounded previews and requested UI fixes

Files: src/index.template.html; tests/previews.test.cjs; existing header/dialog/help-copy/icon tests; notices/build files as needed.
Consumes: readImage and metadata. Produces: preview manager show(id), close(), dispose(documentId|null), cache accounting and safe raster-only thumbnails/modal.

- [ ] Add failing tests: `hugeRasterHeader` never decodes >32 MP; `svgIsNeverRendered` inserts no SVG/object/frame or resource reference; `previewCleanup` releases URLs/bitmaps after close/remove/pagehide; `languageTitleMetrics` keeps computed title size/line-height equal; `helpContainsCompleteLicenses` retains notices and fixed header.
- [ ] Run `node --test tests/previews.test.cjs` plus existing header/dialog tests; capture intended new-feature failures.
- [ ] Implement lazy visible raster previews, serial decode, 32 MiB LRU, accessible enlargement, unknown/unsupported placeholders, original/cropped-content warning, stable bilingual title, Help license move and document-to-image drop glyph. Preserve app/favicon artwork.
- [ ] Run suites, then real-browser JA/EN at 320/360px and desktop, keyboard/Escape/focus and full Help scrolling. Record screenshots and verify no runtime requests.
- [ ] Commit previews and UI changes.

### Task 4: Filters, sorting and lossless duplicate grouping

Files: src/index.template.html; src/office-worker.js; tests/selection-v110.test.cjs.
Consumes: occurrences/usages and worker engine. Produces: visibleOccurrences(query,sort), stable group membership and export selection snapshot.

- [ ] Add failing tests: `filterNeverChangesSelection`; `selectMatchingNotPage` applies to every matching occurrence across 100-row pages; `hiddenSelectedCount`; `mixedDuplicateGroup`; `hashCollisionNeedsByteComparison`; `newImportStartsSelected`; `unknownDimensionsSortLast`.
- [ ] Run `node --test tests/selection-v110.test.cjs` and confirm new-feature failures.
- [ ] Implement document/type/text/dimension/byte filters, stable sorts, 100-row pages, explicit global versus matching selection actions, optional worker hash+byte-confirm grouping preserving provenance and all member states. Do not hold all image bytes for grouping.
- [ ] Rerun selection/extraction suites and browser-test filters, group expansion, language changes and focused controls across pagination.
- [ ] Commit selection/grouping changes.

### Task 5: Safe exports and actionable recovery

Files: src/office-worker.js; src/index.template.html; tests/export-recovery.test.cjs; tests/office-fixtures.cjs.
Consumes: stable selected occurrence snapshot and readImage. Produces: byte-identical individual/ZIP downloads, optional unique-copy JSON provenance manifest and explicit partial-save decision.

- [ ] Add failing tests: `originalBytesExact`; `zipOccurrenceNamesCollisionSafe`; `uniqueExportSelectedOnly`; `partialExportRequiresConsent`; `cancelDuringInflateAndZip` has no late download; `actualOutputCeiling` stops >1 GiB; `retryDoesNotDuplicateDownload`; `removeDuringExportOrDedupe` invalidates every affected snapshot and prevents late downloads; `unknownErrorDoesNotClaimPassword`.
- [ ] Run `node --test tests/export-recovery.test.cjs` and confirm expected failures.
- [ ] Implement sequential bounded export, accurate stage progress, cancellation, verified error categories, successful/failed item summary, explicit partial-save confirmation and omission manifest. Benchmark STORE versus DEFLATE on compressed images; choose bounded, responsive output without changing image bytes. Individual Save remains original-only.
- [ ] Rerun export/extraction suites and browser download byte comparisons, explicit decline/accept partial-save paths, repeated clicks and cancel/retry.
- [ ] Commit exports and recovery.

### Task 6: Version, integration and review-ready PR

Files: app.config.json; APP_SPEC.md; README.md; README.ja.md; CHANGELOG.md; docs/ARCHITECTURE.md; VERIFY_OFFLINE.md; scripts/check-repository.ps1; build-generated official outputs.

- [ ] Add/update checks for version 1.1.0 consistency, worker/parser embedding, full regression inclusion, no runtime URLs/placeholders, provenance/limit wording and complete licenses.
- [ ] Run all `node --test tests/*.test.cjs`, source checks and official PowerShell repository/build/standalone/self-extract verification. This dot cloud currently lacks pwsh; use an allowed official installation or exact-commit Windows CI, never claim an unrun local Windows pass.
- [ ] Verify readable and self-extract variants via direct file, picker/drop/multi-file/save/ZIP, cancellation, JA/EN, narrow/short/desktop layouts and memory cleanup with synthetic files. Test a representative >256 MiB document and capture performance/peak-memory observations without asserting universal capacity.
- [ ] Commit docs/version/generated outputs, create Draft PR, verify remote head and current-commit CI/Cloudflare preview. Independent fresh whole-branch code review; resolve findings and rerun affected plus aggregate checks.
- [ ] Only after review/tests/CI/preview pass, mark PR ready for review. Report actual evidence and any verified platform limits. Stop: no merge, release or production deployment.

## Self-review and execution choice

Spec coverage: Tasks 1/5 cancellation/limits/recovery; 2 usage/dimensions; 3 thumbnails/original warning/title/licenses/icon; 4 filtering/grouping; 6 compatibility/version/acceptance. All five review-focus cases have named owning tests. Interface names and binary-unit limits agree with the spec.

Recommended execution: one implementation owner executes these tightly coupled tasks sequentially, then a fresh independent whole-branch reviewer. This avoids conflicting edits to the single app template and worker contract. Parent presents this plan and waits for the user's plan/method confirmation before product code.
