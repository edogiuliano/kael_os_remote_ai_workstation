$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
Set-Location $Root

$env:CSC_IDENTITY_AUTO_DISCOVERY = "false"
npx electron-builder --win nsis --publish never
