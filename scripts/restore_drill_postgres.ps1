param(
    [Parameter(Mandatory=$true)][string]$ManifestPath,
    [string]$Container = "kora-postgres",
    [string]$Database = "kora_restore_drill",
    [string]$User = "kora"
)

$ErrorActionPreference = "Stop"
$manifest = Get-Content $ManifestPath -Raw | ConvertFrom-Json
$dumpPath = $manifest.dump_path
if (-not (Test-Path $dumpPath)) {
    throw "Dump path not found: $dumpPath"
}
$actualHash = (Get-FileHash -Algorithm SHA256 $dumpPath).Hash.ToLowerInvariant()
if ($actualHash -ne $manifest.checksum) {
    throw "Backup checksum mismatch"
}

docker exec $Container psql -U $User -d postgres -v ON_ERROR_STOP=1 -c "DROP DATABASE IF EXISTS $Database;"
docker exec $Container psql -U $User -d postgres -v ON_ERROR_STOP=1 -c "CREATE DATABASE $Database;"
Get-Content $dumpPath -Raw | docker exec -i $Container psql -U $User -d $Database -v ON_ERROR_STOP=1 | Out-Null
$tableCount = docker exec $Container psql -U $User -d $Database -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';"

[ordered]@{
    database = $Database
    restored_checksum = $actualHash
    verified_table_count = [int]$tableCount
    verified = ([int]$tableCount -gt 0)
    completed_at = (Get-Date).ToUniversalTime().ToString("o")
} | ConvertTo-Json -Depth 4
