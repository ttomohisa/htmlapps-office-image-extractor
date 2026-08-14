import fs from "node:fs";

const htmlPath = new URL("../office-image-extractor.html", import.meta.url);
const html = fs.readFileSync(htmlPath, "utf8");

const checks = [
    ["starts with an HTML doctype", /^<!doctype html>/i.test(html)],
    ["keeps JSZip v3.10.1 embedded", /JSZip v3\.10\.1/.test(html)],
    ["has no external script src", !/<script\b[^>]*\bsrc\s*=/i.test(html)],
    [
        "has no external stylesheet",
        !/<link\b[^>]*\brel\s*=\s*["']stylesheet["'][^>]*>/i.test(html)
    ],
    [
        "keeps the ZIP generation guard",
        /let isGeneratingZip = false;/.test(html)
    ],
    [
        "limits concurrent Office inspection",
        /const MAX_CONCURRENT_INSPECTIONS = 2;/.test(html)
    ],
    [
        "keeps the clear-all control",
        /id=["']clear-button["']/.test(html)
    ],
    [
        "keeps the selection status region",
        /id=["']selection-notice["'][^>]*aria-live=["']polite["']/.test(html)
    ]
];

const forbiddenRuntimeApis = [
    ["fetch", /\bfetch\s*\(/],
    ["XMLHttpRequest", /\bXMLHttpRequest\b/],
    ["WebSocket", /\bWebSocket\b/],
    ["EventSource", /\bEventSource\b/],
    ["sendBeacon", /\bsendBeacon\s*\(/]
];

for (const [name, pattern] of forbiddenRuntimeApis) {
    checks.push([`does not use runtime network API: ${name}`, !pattern.test(html)]);
}

let failed = false;

for (const [label, passed] of checks) {
    const marker = passed ? "OK" : "FAIL";
    console.log(`[${marker}] ${label}`);

    if (!passed) {
        failed = true;
    }
}

if (failed) {
    process.exitCode = 1;
} else {
    console.log("Source checks passed.");
}
