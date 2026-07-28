param(
    [string]$EnvFile = ".env",
    [string]$HostAddress = "127.0.0.1",
    [int]$Port = 8089
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

$env:KORA_AGENT_RUNTIME_HOST = $HostAddress
$env:KORA_AGENT_RUNTIME_PORT = $Port.ToString()
python -m uvicorn agents.runtime.service:app --host $HostAddress --port $Port
