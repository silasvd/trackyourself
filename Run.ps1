<#
.SYNOPSIS
  Baut TrackYourself und startet die Vorschau im lokalen Netzwerk (z. B. zum Testen auf dem iPhone).
.DESCRIPTION
  Installiert bei Bedarf die Abhängigkeiten, erstellt den Produktionsbuild und startet
  `vite preview` auf allen Netzwerkschnittstellen. Die Adressen für das Smartphone werden angezeigt.
  Beenden mit Strg+C.
.PARAMETER Port
  Port der Vorschau (Standard 4173).
.PARAMETER SkipBuild
  Vorhandenen Build in dist/ verwenden, statt neu zu bauen.
#>
param(
  [int]$Port = 4173,
  [switch]$SkipBuild
)

$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

function Invoke-Step([string]$Title, [scriptblock]$Command) {
  Write-Host "`n==> $Title" -ForegroundColor Cyan
  & $Command
  if ($LASTEXITCODE -ne 0) { throw "$Title fehlgeschlagen (Exit-Code $LASTEXITCODE)." }
}

if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw 'Node.js wurde nicht gefunden. Bitte Node.js 22.12+ installieren: https://nodejs.org'
}

if (-not (Test-Path -LiteralPath 'node_modules')) {
  Invoke-Step 'Abhängigkeiten installieren (npm ci)' { npm ci }
}

if ($SkipBuild -and (Test-Path -LiteralPath 'dist/index.html')) {
  Write-Host "`n==> Build übersprungen, verwende dist/" -ForegroundColor Cyan
} else {
  Invoke-Step 'Produktionsbuild erstellen (npm run build)' { npm run build }
}

$addresses = [System.Net.NetworkInformation.NetworkInterface]::GetAllNetworkInterfaces() |
  Where-Object {
    $_.OperationalStatus -eq 'Up' -and
    $_.NetworkInterfaceType -ne [System.Net.NetworkInformation.NetworkInterfaceType]::Loopback
  } |
  ForEach-Object { $_.GetIPProperties().UnicastAddresses } |
  Where-Object {
    $_.Address.AddressFamily -eq [System.Net.Sockets.AddressFamily]::InterNetwork -and
    -not $_.Address.ToString().StartsWith('169.254.')
  } |
  ForEach-Object { $_.Address.ToString() } |
  Sort-Object -Unique

Write-Host "`n==> TrackYourself startet" -ForegroundColor Green
Write-Host "    Auf diesem Rechner:  http://localhost:$Port"
if ($addresses) {
  foreach ($address in $addresses) {
    Write-Host "    Im WLAN (Smartphone): http://${address}:$Port" -ForegroundColor Yellow
  }
} else {
  Write-Host '    Keine Netzwerkadresse gefunden – ist der Rechner mit dem WLAN verbunden?' -ForegroundColor Red
}
Write-Host '    Hinweis: Über http:// im WLAN läuft die App ohne Offline-Modus (dafür ist HTTPS nötig).'
Write-Host '    Beenden mit Strg+C.'

npx vite preview --host 0.0.0.0 --port $Port --strictPort
