param(
  [switch]$ForceDownload,
  [switch]$SkipSelfExtract,
  [string]$OutputPath = ""
)

$ErrorActionPreference = "Stop"
$ProgressPreference = "SilentlyContinue"
Set-StrictMode -Version Latest
[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12

$Root = Split-Path -Parent $MyInvocation.MyCommand.Path
$TemplatePath = Join-Path $Root "src\index.template.html"
$AppConfigPath = Join-Path $Root "app.config.json"
$DependenciesPath = Join-Path $Root "dependencies.json"
$VerifyPath = Join-Path $Root "scripts\verify-standalone.ps1"
$SelfExtractBuilderPath = Join-Path $Root "scripts\build-self-extract.ps1"
$CacheRoot = Join-Path $Root ".cache"
$DistRoot = Join-Path $Root "dist"
$OutputPathWasSpecified = -not [string]::IsNullOrWhiteSpace($OutputPath)
if ($OutputPathWasSpecified -and -not [System.IO.Path]::IsPathRooted($OutputPath)) { $OutputPath = Join-Path $Root $OutputPath }
New-Item -ItemType Directory -Force -Path $CacheRoot, $DistRoot | Out-Null

function Write-Step([string]$Message) { Write-Host "[Single HTML] $Message" -ForegroundColor Cyan }
function Get-Json([string]$Path) { if (-not (Test-Path $Path)) { throw "Required file not found: $Path" }; Get-Content -Raw -Encoding UTF8 $Path | ConvertFrom-Json }
function Get-SafeId([string]$Value) { if ($Value -notmatch '^[a-z0-9][a-z0-9._-]*$') { throw "Invalid dependency/asset id: $Value" }; $Value }
function Get-MimeType([string]$Path) {
  switch ([System.IO.Path]::GetExtension($Path).ToLowerInvariant()) { ".js" {"text/javascript"}; ".mjs" {"text/javascript"}; ".css" {"text/css"}; ".wasm" {"application/wasm"}; ".json" {"application/json"}; default {"application/octet-stream"} }
}
function Get-Bytes([string]$Path, [bool]$Strip) {
  if (-not (Test-Path $Path)) { throw "Dependency asset not found: $Path" }
  if ($Strip -and [System.IO.Path]::GetExtension($Path) -in @(".js", ".mjs", ".css")) {
    $text = [System.IO.File]::ReadAllText($Path, [System.Text.Encoding]::UTF8)
    $text = [regex]::Replace($text, "(?m)^\s*//# sourceMappingURL=.*$", "")
    $text = [regex]::Replace($text, "(?m)^\s*/\*# sourceMappingURL=.*?\*/\s*$", "")
    return [System.Text.Encoding]::UTF8.GetBytes($text)
  }
  return [System.IO.File]::ReadAllBytes($Path)
}
function ConvertTo-SafeJson([object]$Value, [int]$Depth=30) { ($Value | ConvertTo-Json -Compress -Depth $Depth).Replace("<","\u003c").Replace(">","\u003e").Replace("&","\u0026") }

if (-not (Get-Command tar.exe -ErrorAction SilentlyContinue)) { throw "tar.exe was not found. Use a current Windows 10/11 environment." }
$appConfig = Get-Json $AppConfigPath
$dependencyConfig = Get-Json $DependenciesPath
if (-not $OutputPathWasSpecified) {
  $configuredOutput = [string]$appConfig.build.output
  if ([string]::IsNullOrWhiteSpace($configuredOutput)) { $configuredOutput = "dist/index.html" }
  $OutputPath = Join-Path $Root $configuredOutput
}
$dependencies = if ($dependencyConfig.dependencies) { @($dependencyConfig.dependencies) } else { @() }
$assetBundle = [ordered]@{ schemaVersion=1; dependencies=[ordered]@{} }
$manifestDependencies = @()

foreach ($dependency in $dependencies) {
  $id = Get-SafeId ([string]$dependency.id)
  $packageName = [string]$dependency.package
  $version = [string]$dependency.version
  $cacheKey = (($packageName -replace '[^A-Za-z0-9._-]','-') + '-' + $version)
  $packageRoot = Join-Path $CacheRoot $cacheKey
  $archivePath = Join-Path $packageRoot "package.tgz"
  $extractRoot = Join-Path $packageRoot "extracted"
  $packageDir = Join-Path $extractRoot "package"
  if ($ForceDownload -and (Test-Path $packageRoot)) { Remove-Item -Recurse -Force $packageRoot }
  New-Item -ItemType Directory -Force -Path $packageRoot | Out-Null
  if (-not (Test-Path $archivePath)) {
    Write-Step "Resolving $packageName@$version"
    $encodedPackage = [Uri]::EscapeDataString($packageName)
    $metadata = Invoke-RestMethod -Uri "https://registry.npmjs.org/$encodedPackage/$version" -UseBasicParsing -Headers @{"User-Agent"="htmlapps-office-image-extractor/1.0"}
    if (-not $metadata.dist.tarball) { throw "npm metadata did not include a tarball URL for $packageName@$version" }
    $partial = "$archivePath.part"
    Invoke-WebRequest -Uri ([string]$metadata.dist.tarball) -OutFile $partial -UseBasicParsing -Headers @{"User-Agent"="htmlapps-office-image-extractor/1.0"}
    Move-Item -Force $partial $archivePath
  }
  if (-not (Test-Path $packageDir)) {
    Remove-Item -Recurse -Force -ErrorAction SilentlyContinue $extractRoot
    New-Item -ItemType Directory -Force -Path $extractRoot | Out-Null
    & tar.exe -xzf $archivePath -C $extractRoot
    if ($LASTEXITCODE -ne 0) { throw "tar.exe failed while extracting $archivePath" }
  }
  $actualVersion = [string]((Get-Content -Raw -Encoding UTF8 (Join-Path $packageDir "package.json") | ConvertFrom-Json).version)
  if ($actualVersion -ne $version) { throw "Expected $packageName@$version but archive contains $actualVersion" }
  $assets = [ordered]@{}
  $manifestAssets = @()
  foreach ($asset in @($dependency.assets)) {
    $key = Get-SafeId ([string]$asset.key)
    $path = [System.IO.Path]::GetFullPath((Join-Path $packageDir ([string]$asset.path)))
    $strip = $asset.PSObject.Properties.Name -contains "stripSourceMapComment" -and [bool]$asset.stripSourceMapComment
    $bytes = Get-Bytes $path $strip
    $mime = if ($asset.PSObject.Properties.Name -contains "mime" -and -not [string]::IsNullOrWhiteSpace([string]$asset.mime)) { [string]$asset.mime } else { Get-MimeType $path }
    $shaAlgorithm = [System.Security.Cryptography.SHA256]::Create()
    try {
      $hashBytes = $shaAlgorithm.ComputeHash($bytes)
    } finally {
      $shaAlgorithm.Dispose()
    }
    $sha = ($hashBytes | ForEach-Object { $_.ToString("x2") }) -join ""
    $assets[$key] = [ordered]@{ mime=$mime; base64=[Convert]::ToBase64String($bytes) }
    $manifestAssets += [ordered]@{ key=$key; path=[string]$asset.path; mime=$mime; bytes=$bytes.Length; sha256=$sha }
  }
  $assetBundle.dependencies[$id] = [ordered]@{ package=$packageName; version=$version; assets=$assets }
  $license = if ($dependency.PSObject.Properties.Name -contains "license") {[string]$dependency.license} else {""}
  $homepage = if ($dependency.PSObject.Properties.Name -contains "homepage") {[string]$dependency.homepage} else {""}
  $manifestDependencies += [ordered]@{ id=$id; package=$packageName; version=$version; license=$license; homepage=$homepage; tarballSha256=(Get-FileHash -Algorithm SHA256 -Path $archivePath).Hash.ToLowerInvariant(); assets=$manifestAssets }
}

$manifest = [ordered]@{
  schemaVersion=1; builder="single-html-app-template/1.0"; generatedAtUtc=[DateTime]::UtcNow.ToString("o")
  app=[ordered]@{ name=[string]$appConfig.name; slug=[string]$appConfig.slug; version=[string]$appConfig.version }
  dependencies=$manifestDependencies
}
$template = [System.IO.File]::ReadAllText($TemplatePath, [System.Text.Encoding]::UTF8)
$assetBundleJson = ConvertTo-SafeJson $assetBundle 50
$replacements = [ordered]@{
  "__APP_CONFIG_JSON__" = ConvertTo-SafeJson $appConfig 20
  "__BUILD_MANIFEST_JSON__" = ConvertTo-SafeJson $manifest 40
  "__EMBEDDED_ASSET_BUNDLE_BASE64__" = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes($assetBundleJson))
}
foreach ($entry in $replacements.GetEnumerator()) {
  $count = ([regex]::Matches($template, [regex]::Escape($entry.Key))).Count
  if ($count -ne 1) { throw "Template placeholder $($entry.Key) must occur exactly once; found $count." }
  $template = $template.Replace($entry.Key, [string]$entry.Value)
}
$outputDirectory = Split-Path -Parent $OutputPath
New-Item -ItemType Directory -Force -Path $outputDirectory | Out-Null
[System.IO.File]::WriteAllText($OutputPath, $template, (New-Object System.Text.UTF8Encoding($false)))
[System.IO.File]::WriteAllText((Join-Path $outputDirectory "dependency-manifest.json"), ($manifest | ConvertTo-Json -Depth 40), (New-Object System.Text.UTF8Encoding($false)))
[System.IO.File]::WriteAllText((Join-Path $outputDirectory ".nojekyll"), "", (New-Object System.Text.UTF8Encoding($false)))
& $VerifyPath -Path $OutputPath -RequireNetworkBlock ([bool]$appConfig.build.blockRuntimeNetwork)

if (-not $OutputPathWasSpecified) {
  Copy-Item -Force $OutputPath (Join-Path $Root "index.html")
  Copy-Item -Force $OutputPath (Join-Path $Root "office-image-extractor.html")
  Copy-Item -Force $OutputPath (Join-Path $outputDirectory "office-image-extractor.html")
}

$selfExtractEnabled = -not $SkipSelfExtract -and $appConfig.build.selfExtract -and [bool]$appConfig.build.selfExtract.enabled
if ($selfExtractEnabled) {
  $selfExtractOutputPath = if ($OutputPathWasSpecified) { Join-Path (Split-Path -Parent $OutputPath) (([System.IO.Path]::GetFileNameWithoutExtension($OutputPath)) + ".self-extract.html") } else { Join-Path $Root ([string]$appConfig.build.selfExtract.output) }
  & $SelfExtractBuilderPath -InputPath $OutputPath -OutputPath $selfExtractOutputPath -AppName ([string]$appConfig.name) -AppNameJa ([string]$appConfig.nameJa)
}

Write-Host "[OK] Standalone HTML: $OutputPath" -ForegroundColor Green
Write-Host "[OK] SHA-256: $((Get-FileHash -Algorithm SHA256 -Path $OutputPath).Hash.ToLowerInvariant())"
