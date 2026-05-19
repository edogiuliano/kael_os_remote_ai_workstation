$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
Set-Location $Root

if (-not (Test-Path "dist/backend/src/server.js")) {
  npm run build
}

$EnvFile = Join-Path $Root ".env"
$Token = ""
if (Test-Path $EnvFile) {
  $Line = Get-Content $EnvFile | Where-Object { $_ -match "^API_TOKEN=" } | Select-Object -First 1
  if ($Line) { $Token = $Line.Substring("API_TOKEN=".Length) }
}

$SmokePort = 18787
while (Get-NetTCPConnection -LocalPort $SmokePort -State Listen -ErrorAction SilentlyContinue) {
  $SmokePort++
}

$OldPort = $env:PORT
$env:PORT = "$SmokePort"
$Stdout = Join-Path $Root "logs/smoke-server.out.log"
$Stderr = Join-Path $Root "logs/smoke-server.err.log"
$Process = Start-Process -FilePath "node" -ArgumentList "dist/backend/src/server.js" -WorkingDirectory $Root -PassThru -WindowStyle Hidden -RedirectStandardOutput $Stdout -RedirectStandardError $Stderr

try {
  $Headers = @{}
  if ($Token) { $Headers["Authorization"] = "Bearer $Token" }

  $Healthy = $false
  for ($i = 0; $i -lt 20; $i++) {
    try {
      Invoke-RestMethod "http://127.0.0.1:$SmokePort/api/health" -Headers $Headers -TimeoutSec 2 | Out-Null
      $Healthy = $true
      break
    } catch {
      Start-Sleep -Milliseconds 500
    }
  }
  if (-not $Healthy) { throw "Server did not become healthy." }

  $Body = @{
    kind = "custom"
    name = "smoke"
    command = "powershell.exe"
    args = @("-NoProfile", "-Command", "Write-Output smoke-ok")
  } | ConvertTo-Json

  $Created = Invoke-RestMethod "http://127.0.0.1:$SmokePort/api/sessions" -Method Post -Headers $Headers -ContentType "application/json" -Body $Body
  Start-Sleep -Seconds 2
  $Logs = Invoke-RestMethod "http://127.0.0.1:$SmokePort/api/sessions/$($Created.session.id)/logs" -Headers $Headers
  if ($Logs -notmatch "smoke-ok") { throw "Smoke session log did not contain smoke-ok." }

  Write-Host "Smoke verification passed on port $SmokePort."
} finally {
  if ($Process -and -not $Process.HasExited) {
    Stop-Process -Id $Process.Id -Force
  }
  $env:PORT = $OldPort
}
