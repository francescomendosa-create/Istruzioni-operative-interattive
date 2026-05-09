# Apre DOCUMENTAZIONE-AZIENDALE-IT.html nel primo browser disponibile (Edge / Chrome / Firefox)
$ErrorActionPreference = 'Stop'
$dir = Split-Path -Parent $MyInvocation.MyCommand.Path
$html = Join-Path $dir 'DOCUMENTAZIONE-AZIENDALE-IT.html'
if (-not (Test-Path -LiteralPath $html)) {
    Write-Host "File non trovato: $html" -ForegroundColor Red
    exit 1
}

$candidates = @(
    "${env:ProgramFiles}\Microsoft\Edge\Application\msedge.exe",
    "${env:ProgramFiles(x86)}\Microsoft\Edge\Application\msedge.exe",
    "$env:LocalAppData\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
    "${env:ProgramFiles}\Mozilla Firefox\firefox.exe"
)

foreach ($exe in $candidates) {
    if (Test-Path -LiteralPath $exe) {
        Start-Process -FilePath $exe -ArgumentList "`"$html`""
        exit 0
    }
}

Invoke-Item -LiteralPath $html
