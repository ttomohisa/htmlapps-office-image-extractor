param(
  [Parameter(Mandatory = $true)][string]$InputPath,
  [Parameter(Mandatory = $true)][string]$OutputPath,
  [string]$AppName = "Standalone app",
  [string]$AppNameJa = "単一HTMLアプリ"
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
if (-not (Test-Path $InputPath)) { throw "Input HTML was not found: $InputPath" }
if (-not [System.IO.Path]::IsPathRooted($InputPath)) { $InputPath = [System.IO.Path]::GetFullPath($InputPath) }
if (-not [System.IO.Path]::IsPathRooted($OutputPath)) { $OutputPath = [System.IO.Path]::GetFullPath($OutputPath) }

$inputBytes = [System.IO.File]::ReadAllBytes($InputPath)
$compressedBuffer = New-Object System.IO.MemoryStream
try {
  $gzip = [System.IO.Compression.GZipStream]::new($compressedBuffer, [System.IO.Compression.CompressionMode]::Compress, $true)
  try { $gzip.Write($inputBytes, 0, $inputBytes.Length) } finally { $gzip.Dispose() }
  $compressedBytes = $compressedBuffer.ToArray()
} finally { $compressedBuffer.Dispose() }

function Get-Sha256Hex([byte[]]$Bytes) {
  $algorithm = [System.Security.Cryptography.SHA256]::Create()
  try { return (($algorithm.ComputeHash($Bytes) | ForEach-Object { $_.ToString("x2") }) -join "") } finally { $algorithm.Dispose() }
}
function ConvertTo-HtmlText([string]$Value) { [System.Net.WebUtility]::HtmlEncode($Value) }

$sourceSha256 = Get-Sha256Hex $inputBytes
$gzipSha256 = Get-Sha256Hex $compressedBytes
$payloadBase64 = [Convert]::ToBase64String($compressedBytes)
$encodedAppName = ConvertTo-HtmlText $AppName
$encodedAppNameJa = ConvertTo-HtmlText $AppNameJa
$sourceBytes = $inputBytes.Length
$gzipBytes = $compressedBytes.Length

$wrapper = @"
<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta http-equiv="Content-Security-Policy" content="default-src 'self' data: blob:; script-src 'self' 'unsafe-inline' blob:; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self' data: blob:; media-src 'self' data: blob:; worker-src 'self' blob:; connect-src 'none'; object-src 'none'; frame-src 'none'; base-uri 'none'; form-action 'none'">
  <meta name="robots" content="noindex,nofollow">
  <meta name="generator" content="single-html-app-template self-extract builder">
  <meta name="self-extract-source-sha256" content="$sourceSha256">
  <meta name="self-extract-gzip-sha256" content="$gzipSha256">
  <meta name="self-extract-source-bytes" content="$sourceBytes">
  <meta name="self-extract-gzip-bytes" content="$gzipBytes">
  <title>$encodedAppNameJa / $encodedAppName</title>
  <style>
    :root { color-scheme: light; font-family: system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
    body { margin:0;min-height:100vh;display:grid;place-items:center;color:#24342f;background:#f6f8f7; }
    main { width:min(32rem,calc(100% - 2rem));text-align:center; }
    .spinner { width:2rem;height:2rem;margin:0 auto 1rem;border:.2rem solid #d8dfdc;border-top-color:#47685d;border-radius:50%;animation:spin .8s linear infinite; }
    h1 { margin:0 0 .5rem;font-size:1rem; } p { margin:.35rem 0;font-size:.875rem;line-height:1.6;color:#66736e; }
    pre { display:none;margin-top:1rem;padding:.75rem;overflow:auto;text-align:left;white-space:pre-wrap;border:1px solid #d8dfdc;border-radius:.5rem;background:#fff;color:#9b2c2c; }
    body.failed .spinner { display:none; } body.failed pre { display:block; } @keyframes spin { to { transform:rotate(360deg); } }
  </style>
</head>
<body>
  <main><div class="spinner" aria-hidden="true"></div><h1>アプリを展開しています / Unpacking the app</h1><p>この処理は端末内で行われ、外部通信は発生しません。</p><p>The app is being restored locally without a network request.</p><pre id="error" role="alert"></pre></main>
  <script id="self-extract-payload" type="application/octet-stream">$payloadBase64</script>
  <script>
  (() => {
    "use strict";
    const fail = (error) => { document.body.classList.add("failed"); const detail = error instanceof Error ? error.name + ": " + error.message : String(error); document.getElementById("error").textContent = "展開に失敗しました。対応ブラウザーで開いてください。\nFailed to unpack the application. Open this file in a browser that supports DecompressionStream.\n\n" + detail; console.error(error); };
    const decodeBase64 = (base64) => { const clean = base64.replace(/\s+/g, ""); const chunks=[]; for(let offset=0;offset<clean.length;offset+=32768){ const binary=atob(clean.slice(offset,offset+32768)); const bytes=new Uint8Array(binary.length); for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i); chunks.push(bytes); } return new Blob(chunks,{type:"application/gzip"}); };
    const unpack = async () => { if (!("DecompressionStream" in window)) throw new Error("DecompressionStream is not supported by this browser."); const payload=document.getElementById("self-extract-payload").textContent; const stream=decodeBase64(payload).stream().pipeThrough(new DecompressionStream("gzip")); const html=await new Response(stream).text(); if(!/^\s*<!doctype html>/i.test(html)) throw new Error("The restored payload is not an HTML document."); document.open("text/html","replace");document.write(html);document.close(); };
    unpack().catch(fail);
  })();
  </script>
  <noscript>JavaScript is required to unpack this self-extracting HTML file.</noscript>
</body>
</html>
"@

$outputDirectory = Split-Path -Parent $OutputPath
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
[System.IO.File]::WriteAllText($OutputPath, $wrapper, (New-Object System.Text.UTF8Encoding($false)))
$manifestPath = Join-Path $outputDirectory "self-extract-manifest.json"
$manifest = [ordered]@{
  schemaVersion = 1; generatedAtUtc = [DateTime]::UtcNow.ToString("o")
  source = [ordered]@{ path=[System.IO.Path]::GetFileName($InputPath); bytes=$sourceBytes; sha256=$sourceSha256 }
  compressedPayload = [ordered]@{ format="gzip"; bytes=$gzipBytes; sha256=$gzipSha256; encoding="base64" }
  output = [ordered]@{ path=[System.IO.Path]::GetFileName($OutputPath); bytes=(Get-Item $OutputPath).Length; sha256=(Get-FileHash -Algorithm SHA256 -Path $OutputPath).Hash.ToLowerInvariant() }
  runtime = [ordered]@{ decompressor="DecompressionStream"; networkRequired=$false }
}
[System.IO.File]::WriteAllText($manifestPath, ($manifest | ConvertTo-Json -Depth 10), (New-Object System.Text.UTF8Encoding($false)))
& (Join-Path $PSScriptRoot "verify-self-extract.ps1") -Path $OutputPath -ExpectedSourcePath $InputPath
Write-Host "[OK] Self-extracting HTML: $OutputPath" -ForegroundColor Green
