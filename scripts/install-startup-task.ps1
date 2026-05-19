param(
  [string]$TaskName = "KAEL OS"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $PSCommandPath)
$StartScript = Join-Path $Root "scripts/start.ps1"

if (-not (Test-Path $StartScript)) {
  throw "Start script was not found at $StartScript"
}

$Action = New-ScheduledTaskAction -Execute "powershell.exe" -Argument "-ExecutionPolicy Bypass -File `"$StartScript`""
$Trigger = New-ScheduledTaskTrigger -AtLogOn
$Settings = New-ScheduledTaskSettingsSet -RestartCount 3 -RestartInterval (New-TimeSpan -Minutes 1) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries

Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Settings $Settings -Description "Starts KAEL OS at login." -Force | Out-Null
Write-Host "Installed startup task: $TaskName"
