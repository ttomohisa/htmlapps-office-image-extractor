param(
  [string]$OutputDirectory = ""
)

$ErrorActionPreference = "Stop"
Set-StrictMode -Version Latest

$Root = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$Config = Get-Content -LiteralPath (Join-Path $Root "app.config.json") -Raw -Encoding UTF8 | ConvertFrom-Json
$Version = [string]$Config.version
if ($Version -notmatch '^[0-9]+\.[0-9]+\.[0-9]+$') {
  throw "app.config.json must contain a stable X.Y.Z version."
}

$NotesPath = Join-Path $Root (".github/release-notes/v" + $Version + ".md")
if (-not (Test-Path -LiteralPath $NotesPath -PathType Leaf)) {
  throw "Release notes are required before publishing: $NotesPath"
}
$Notes = [System.IO.File]::ReadAllText($NotesPath, [System.Text.Encoding]::UTF8)
if (-not $Notes.Contains("Office Image Extractor v$Version")) {
  throw "Release notes do not match app.config.json version $Version."
}

$ReadablePath = Join-Path $Root "dist/index.html"
$CompactPath = Join-Path $Root "dist/index.self-extract.html"
$ManifestPath = Join-Path $Root "dist/dependency-manifest.json"
$SelfManifestPath = Join-Path $Root "dist/self-extract-manifest.json"

foreach ($required in @($ReadablePath, $CompactPath, $ManifestPath, $SelfManifestPath)) {
  if (-not (Test-Path -LiteralPath $required -PathType Leaf)) {
    throw "Build and verify both standalone files before packaging. Missing: $required"
  }
}
$ReadableHtml = [System.IO.File]::ReadAllText($ReadablePath, [System.Text.Encoding]::UTF8)
if (-not $ReadableHtml.Contains('"version":"' + $Version + '"') -or
    -not $ReadableHtml.Contains('id="versionBadge">v' + $Version + '</span>')) {
  throw "Readable standalone HTML does not contain the expected version $Version."
}

$Manifest = Get-Content -LiteralPath $ManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
$SelfManifest = Get-Content -LiteralPath $SelfManifestPath -Raw -Encoding UTF8 | ConvertFrom-Json
if ([string]$Manifest.app.version -ne $Version) {
  throw "The dependency manifest does not match version $Version."
}
if ($null -eq $SelfManifest) {
  throw "The self-extract manifest is not valid."
}

if ([string]::IsNullOrWhiteSpace($OutputDirectory)) {
  $OutputDirectory = Join-Path $Root "dist/release"
} elseif (-not [System.IO.Path]::IsPathRooted($OutputDirectory)) {
  $OutputDirectory = Join-Path $Root $OutputDirectory
}

$PackageName = "htmlapps-office-image-extractor-v$Version"
$ReadableName = "$PackageName.html"
$CompactName = "$PackageName.self-extract.html"
$ZipName = "$PackageName.zip"
$ChecksumName = "SHA256SUMS.txt"
$StagingDirectory = Join-Path $Root "dist/.release-staging"

if (Test-Path -LiteralPath $OutputDirectory) { Remove-Item -LiteralPath $OutputDirectory -Recurse -Force }
if (Test-Path -LiteralPath $StagingDirectory) { Remove-Item -LiteralPath $StagingDirectory -Recurse -Force }
New-Item -ItemType Directory -Force -Path $OutputDirectory, $StagingDirectory | Out-Null

$PackageContents = @(
  @{ Source = $ReadablePath; Name = $ReadableName },
  @{ Source = $CompactPath; Name = $CompactName },
  @{ Source = $ManifestPath; Name = "dependency-manifest.json" },
  @{ Source = $SelfManifestPath; Name = "self-extract-manifest.json" },
  @{ Source = (Join-Path $Root "README.md"); Name = "README.md" },
  @{ Source = (Join-Path $Root "README.ja.md"); Name = "README.ja.md" },
  @{ Source = (Join-Path $Root "CHANGELOG.md"); Name = "CHANGELOG.md" },
  @{ Source = (Join-Path $Root "VERIFY_OFFLINE.md"); Name = "VERIFY_OFFLINE.md" },
  @{ Source = (Join-Path $Root "THIRD_PARTY_NOTICES.md"); Name = "THIRD_PARTY_NOTICES.md" },
  @{ Source = (Join-Path $Root "LICENSE"); Name = "LICENSE" },
  @{ Source = $NotesPath; Name = "RELEASE_NOTES.md" }
)

try {
  foreach ($entry in $PackageContents) {
    if (-not (Test-Path -LiteralPath $entry.Source -PathType Leaf)) {
      throw "Missing release package input: $($entry.Source)"
    }
    Copy-Item -LiteralPath $entry.Source -Destination (Join-Path $StagingDirectory $entry.Name)
  }

  $ReleaseHtml = Join-Path $OutputDirectory $ReadableName
  $ReleaseCompact = Join-Path $OutputDirectory $CompactName
  Copy-Item -LiteralPath $ReadablePath -Destination $ReleaseHtml
  Copy-Item -LiteralPath $CompactPath -Destination $ReleaseCompact

  $ReleaseZip = Join-Path $OutputDirectory $ZipName
  Compress-Archive -Path (Join-Path $StagingDirectory "*") -DestinationPath $ReleaseZip -CompressionLevel Optimal -Force

  $archive = [System.IO.Compression.ZipFile]::OpenRead($ReleaseZip)
  try {
    $actualNames = @($archive.Entries | ForEach-Object { $_.FullName })
    $expectedNames = @($PackageContents | ForEach-Object { $_.Name })
    foreach ($name in $expectedNames) {
      if ($actualNames -notcontains $name) { throw "ZIP is missing $name." }
    }
    if ($actualNames.Count -ne $expectedNames.Count) {
      throw "Release ZIP contains unexpected entries."
    }
  } finally {
    $archive.Dispose()
  }

  foreach ($candidate in @(
    @{ Source = $ReadablePath; Copy = $ReleaseHtml },
    @{ Source = $CompactPath; Copy = $ReleaseCompact }
  )) {
    $originalHash = (Get-FileHash -LiteralPath $candidate.Source -Algorithm SHA256).Hash
    $releaseHash = (Get-FileHash -LiteralPath $candidate.Copy -Algorithm SHA256).Hash
    if ($originalHash -ne $releaseHash) { throw "Release HTML differs from the validated build." }
  }

  $checksums = foreach ($name in @($ReadableName, $CompactName, $ZipName)) {
    $hash = (Get-FileHash -LiteralPath (Join-Path $OutputDirectory $name) -Algorithm SHA256).Hash.ToLowerInvariant()
    "$hash  $name"
  }
  $utf8NoBom = [System.Text.UTF8Encoding]::new($false)
  [System.IO.File]::WriteAllText(
    (Join-Path $OutputDirectory $ChecksumName),
    ($checksums -join [Environment]::NewLine) + [Environment]::NewLine,
    $utf8NoBom
  )
  [System.IO.File]::WriteAllText((Join-Path $OutputDirectory "RELEASE_NOTES.md"), $Notes, $utf8NoBom)
  Write-Host "[OK] Prepared verified release bundle: $OutputDirectory"
} finally {
  if (Test-Path -LiteralPath $StagingDirectory) {
    Remove-Item -LiteralPath $StagingDirectory -Recurse -Force
  }
}
