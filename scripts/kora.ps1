param(
    [Parameter(Position = 0)]
    [ValidateSet("up", "down", "seed", "test", "py-test", "go-test", "proto")]
    [string]$Command = "test"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent $PSScriptRoot
Set-Location $Root

function Test-DockerDaemon {
    if (-not (Get-Command docker -ErrorAction SilentlyContinue)) {
        return $false
    }
    try {
        $previous = $ErrorActionPreference
        $ErrorActionPreference = "Continue"
        docker info 1>$null 2>$null
        return $LASTEXITCODE -eq 0
    } catch {
        return $false
    } finally {
        $ErrorActionPreference = $previous
    }
}

function Invoke-GoTests {
    if (Get-Command go -ErrorAction SilentlyContinue) {
        go test ./...
        return
    }
    Write-Host "Go is not installed locally. Skipping go-test; GitHub CI will run Go tests."
}

switch ($Command) {
    "up" {
        docker compose -f deploy/compose/docker-compose.yml up -d
    }
    "down" {
        docker compose -f deploy/compose/docker-compose.yml down
    }
    "seed" {
        python scripts/generate_synthetic_data.py
    }
    "py-test" {
        python -m unittest discover -s agents -p "*_test.py"
    }
    "go-test" {
        Invoke-GoTests
    }
    "proto" {
        docker run --rm -v "${Root}:/workspace" -w /workspace bufbuild/buf:latest generate
    }
    "test" {
        python -m unittest discover -s agents -p "*_test.py"
        Invoke-GoTests
    }
}
