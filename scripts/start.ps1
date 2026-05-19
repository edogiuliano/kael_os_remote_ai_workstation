param(
  [switch]$Dev
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
Set-Location $Root

if (-not (Test-Path ".env")) {
  throw ".env is missing. Run scripts/setup.ps1 first."
}

if ($Dev) {
  npm run dev
} else {
  if (-not (Test-Path "dist/backend/src/server.js")) {
    npm run build
  }
  npm run start
}

