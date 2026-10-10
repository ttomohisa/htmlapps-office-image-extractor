param([switch]$ForceDownload)
$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$required = @(
  "AGENTS.md","APP_SPEC.md","app.config.json","dependencies.json","src\index.template.html","build-standalone.ps1",
  "scripts\build-self-extract.ps1","scripts\verify-standalone.ps1","scripts\verify-self-extract.ps1","README.md","README.ja.md",
  "LICENSE","THIRD_PARTY_NOTICES.md","schemas\app-config.schema.json","schemas\dependencies.schema.json"
)
foreach ($relative in $required) { if (-not (Test-Path (Join-Path $Root $relative))) { throw "Required repository file is missing: $relative" } }
$app = Get-Content -Raw -Encoding UTF8 (Join-Path $Root "app.config.json") | ConvertFrom-Json
if ([string]::IsNullOrWhiteSpace([string]$app.name)) { throw "app.config.json: name is required" }
if ([string]::IsNullOrWhiteSpace([string]$app.slug)) { throw "app.config.json: slug is required" }
if ([string]::IsNullOrWhiteSpace([string]$app.version)) { throw "app.config.json: version is required" }
& node --test (Join-Path $Root "tests/header-consistency.test.cjs")
if ($LASTEXITCODE -ne 0) { throw "Header consistency regression tests failed." }

$buildArguments = @{}
if ($ForceDownload) { $buildArguments.ForceDownload = $true }
& (Join-Path $Root "build-standalone.ps1") @buildArguments
& node --test (Join-Path $Root "tests/extraction.test.cjs") (Join-Path $Root "tests/dialog-layout.test.cjs")
if ($LASTEXITCODE -ne 0) { throw "Office extraction regression tests failed." }
Write-Host "[OK] Repository check passed." -ForegroundColor Green

# Keep the supplied icon consistent across every release surface.
& node (Join-Path $Root "scripts/test-icon-parity.cjs")
if ($LASTEXITCODE -ne 0) { throw "Icon parity regression checks failed." }
