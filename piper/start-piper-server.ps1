$ErrorActionPreference = "SilentlyContinue"

$projectRoot = "C:\Users\franc\Downloads\chck lis funzionante"
$serverScript = Join-Path $projectRoot "piper\piper_server.py"
$pythonLauncher = "py"
$logDir = Join-Path $projectRoot "piper\logs"
$outLog = Join-Path $logDir "piper-out.log"
$errLog = Join-Path $logDir "piper-err.log"

if (!(Test-Path $logDir)) {
    New-Item -ItemType Directory -Path $logDir | Out-Null
}

while ($true) {
    Start-Process -FilePath $pythonLauncher `
        -ArgumentList "`"$serverScript`"" `
        -WorkingDirectory $projectRoot `
        -WindowStyle Hidden `
        -RedirectStandardOutput $outLog `
        -RedirectStandardError $errLog `
        -Wait

    Start-Sleep -Seconds 2
}
