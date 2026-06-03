# Crea ZIP de roma-api listo para la otra PC (sin node_modules ni .next)
$ErrorActionPreference = 'Stop'
$root = Split-Path $PSScriptRoot -Parent
$parent = Split-Path $root -Parent
$zipName = 'roma-api-para-otra-pc.zip'
$zipPath = Join-Path $parent $zipName
$staging = Join-Path $env:TEMP ('roma-api-staging-' + [guid]::NewGuid().ToString('n'))

Write-Host "Origen: $root"
Write-Host "ZIP:    $zipPath"

if (Test-Path $staging) { Remove-Item -Recurse -Force $staging }
New-Item -ItemType Directory -Path $staging | Out-Null

$excludeDirs = @('node_modules', '.next', 'out', '.git', '.vercel')
$excludeFiles = @('*.zip', 'npm-debug.log*')

Get-ChildItem -Path $root -Force | ForEach-Object {
    if ($_.Name -in $excludeDirs) { return }
    if ($_.Name -eq 'roma-api-para-otra-pc.zip') { return }
    $dest = Join-Path $staging $_.Name
    if ($_.PSIsContainer) {
        Copy-Item -Path $_.FullName -Destination $dest -Recurse -Force
    } else {
        Copy-Item -Path $_.FullName -Destination $dest -Force
    }
}

# Asegurar plantilla de env
if (-not (Test-Path (Join-Path $staging 'env.local.plantilla'))) {
    Write-Warning 'Falta env.local.plantilla en el proyecto'
}

# Incluir .env.local del desarrollador si existe (no va en git)
$envLocal = Join-Path $root '.env.local'
if (Test-Path $envLocal) {
    Copy-Item $envLocal (Join-Path $staging '.env.local') -Force
    Write-Host 'Incluido .env.local (con tus credenciales)'
} else {
    Write-Host 'AVISO: No hay .env.local — en la otra PC copia env.local.plantilla a .env.local'
}

# Limpiar restos dentro del staging
@('node_modules', '.next') | ForEach-Object {
    $p = Join-Path $staging $_
    if (Test-Path $p) { Remove-Item -Recurse -Force $p }
}

if (Test-Path $zipPath) { Remove-Item -Force $zipPath }
Compress-Archive -Path (Join-Path $staging '*') -DestinationPath $zipPath -CompressionLevel Optimal
Remove-Item -Recurse -Force $staging

Write-Host ""
Write-Host "Listo: $zipPath"
Write-Host "En la otra PC: descomprimir, npm install, npm run dev, ngrok http 3000"
Write-Host "Probar: https://TU-NGROK/api/health  -> media_pipeline_version: 3"
