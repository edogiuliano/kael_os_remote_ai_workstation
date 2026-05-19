$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$DesktopDist = Join-Path $Root "dist/desktop"

New-Item -ItemType Directory -Force -Path $DesktopDist | Out-Null
Copy-Item -LiteralPath (Join-Path $Root "desktop/preload.cjs") -Destination (Join-Path $DesktopDist "preload.cjs") -Force
