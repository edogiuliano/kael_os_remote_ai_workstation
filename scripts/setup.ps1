param(
  [switch]$SkipInstall,
  [switch]$SkipBuild
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
Set-Location $Root

function Require-Command($Name, $InstallHint) {
  if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
    throw "$Name was not found. $InstallHint"
  }
}

Require-Command "node" "Install Node.js LTS from https://nodejs.org/."
Require-Command "npm" "Install Node.js LTS from https://nodejs.org/."

$NodeMajor = [int]((node -v).TrimStart("v").Split(".")[0])
if ($NodeMajor -lt 20) {
  throw "Node.js 20 or newer is required. Current version: $(node -v)"
}

if (-not (Test-Path ".env")) {
  Copy-Item ".env.example" ".env"
  $Token = [Convert]::ToBase64String([Guid]::NewGuid().ToByteArray()).Replace("=", "").Replace("+", "").Replace("/", "")
  (Get-Content ".env") -replace "API_TOKEN=change-this-long-random-token", "API_TOKEN=$Token" | Set-Content ".env"
  Write-Host "Created .env with a generated API_TOKEN."
}

if (-not $SkipInstall) {
  npm install
}

if (-not $SkipBuild) {
  npm run build
}

Write-Host ""
Write-Host "Setup complete."
Write-Host "Start with: powershell -ExecutionPolicy Bypass -File scripts/start.ps1"

