param(
    [string]$EnvFile = ".env",
    [int]$Port = 8080,
    [string]$AgentRuntimeUrl = "http://127.0.0.1:8089"
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path -LiteralPath $EnvFile)) {
    throw "Environment file not found: $EnvFile"
}

Get-Content -LiteralPath $EnvFile | ForEach-Object {
    if ($_ -match '^([^#=]+)=(.*)$') {
        Set-Item -Path "Env:$($matches[1])" -Value $matches[2]
    }
}

$env:PORT = $Port.ToString()
$env:KORA_AGENT_RUNTIME_URL = $AgentRuntimeUrl
go run ./services/gateway/cmd/server
