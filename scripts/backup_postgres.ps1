param(
    [string]$Container = "kora-postgres",
    [string]$Database = "kora",
    [string]$User = "kora",
    [string]$OutputDir = ".\backups"
)

$ErrorActionPreference = "Stop"
$root = Resolve-Path .
$target = Join-Path $root $OutputDir
New-Item -ItemType Directory -Force $target | Out-Null

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$dumpPath = Join-Path $target "$Database-$timestamp.sql"
$manifestPath = Join-Path $target "$Database-$timestamp.manifest.json"

docker exec $Container pg_dump -U $User -d $Database --clean --if-exists | Out-File -FilePath $dumpPath -Encoding utf8
$hash = (Get-FileHash -Algorithm SHA256 $dumpPath).Hash.ToLowerInvariant()

$manifest = [ordered]@{
    database = $Database
    container = $Container
    dump_path = $dumpPath
    checksum = $hash
    created_at = (Get-Date).ToUniversalTime().ToString("o")
}
$manifest | ConvertTo-Json -Depth 4 | Out-File -FilePath $manifestPath -Encoding utf8
Write-Output $manifestPath
