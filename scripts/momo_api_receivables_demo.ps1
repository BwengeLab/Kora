param(
  [string]$BaseUrl = "http://localhost:8080",
  [string]$OrganizationId = "org_1",
  [string]$AdminUserId = "u_admin",
  [string]$FinanceUserId = "u_fin",
  [string]$ConnectionId = "conn_momo_demo",
  [string]$ConnectionDisplayName = "MTN MoMo",
  [string]$SecretRef = "secret://org_1/momo-demo",
  [string]$Environment = "sandbox",
  [string]$Currency = "EUR",
  [string[]]$PayerMsisdns = @("250780000000"),
  [int]$Count = 20,
  [int]$PollSeconds = 1,
  [int]$MaxPolls = 4
)

$ErrorActionPreference = "Stop"

function New-UuidV4 {
  return [guid]::NewGuid().ToString()
}

function Invoke-KoraJson {
  param(
    [string]$Path,
    [hashtable]$Body
  )
  $json = $Body | ConvertTo-Json -Depth 8
  try {
    return Invoke-RestMethod -Method Post -Uri ($BaseUrl.TrimEnd("/") + $Path) -ContentType "application/json" -Body $json
  } catch {
    if ($_.Exception.Response -and $_.Exception.Response.GetResponseStream()) {
      $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
      $payload = $reader.ReadToEnd()
      throw "API call failed for $Path`n$payload"
    }
    throw
  }
}

function New-Actor([string]$UserId, [string]$Role) {
  return @{
    UserID = $UserId
    OrganizationID = $OrganizationId
    Roles = @($Role)
  }
}

function Scenario-Amount([int]$Index) {
  switch ($Index % 4) {
    1 { return "1" }
    2 { return "2" }
    3 { return "3" }
    default { return "4" }
  }
}

$categories = @("invoice", "premium", "installment", "other_receivable")
$summary = [ordered]@{
  mode = "kora_api_live_sql"
  count = $Count
  categories = [ordered]@{
    invoice = 0
    premium = 0
    installment = 0
    other_receivable = 0
  }
  request_accepted_count = 0
  successful_count = 0
  imported_count = 0
  failed_count = 0
  cases = @()
  notes = @(
    "This scenario talks to Kora over HTTP only.",
    "It uses the live MTN sandbox rail behind Kora.",
    "If only one sandbox MSISDN is supplied, this is still a multi-case receivables simulation rather than twenty distinct real wallets."
  )
}

$existingConnections = Invoke-KoraJson -Path "/v1/integrations/connections/query" -Body @{
  actor = New-Actor $AdminUserId "ORG_ADMIN"
  organization_id = $OrganizationId
  kind = "MOMO"
}

$connectionExists = $false
if ($existingConnections.connections) {
  foreach ($conn in $existingConnections.connections) {
    if ($conn.id -eq $ConnectionId) {
      $connectionExists = $true
      break
    }
  }
}

if (-not $connectionExists) {
  $null = Invoke-KoraJson -Path "/v1/integrations/connections" -Body @{
    actor = New-Actor $AdminUserId "ORG_ADMIN"
    connection = @{
      id = $ConnectionId
      organization_id = $OrganizationId
      kind = "MOMO"
      display_name = $ConnectionDisplayName
      secret_ref = $SecretRef
      active = $true
      config = @{
        environment = $Environment
      }
    }
  }
}

$null = Invoke-KoraJson -Path "/v1/integrations/momo/validate-auth" -Body @{
  actor = New-Actor $AdminUserId "ORG_ADMIN"
}

for ($i = 1; $i -le $Count; $i++) {
  $category = $categories[($i - 1) % $categories.Count]
  $summary.categories[$category]++
  $referenceId = New-UuidV4
  $payer = $PayerMsisdns[($i - 1) % $PayerMsisdns.Count]
  $case = [ordered]@{
    user_id = ("sim-user-{0:d2}" -f $i)
    category = $category
    reference_id = $referenceId
    external_id = ("{0}-{1:d3}" -f $category, $i)
    payer_msisdn = $payer
    amount = Scenario-Amount $i
    currency = $Currency
    request_ok = $false
    status = ""
    imported = $false
  }

  try {
    $request = Invoke-KoraJson -Path "/v1/integrations/momo/request-to-pay" -Body @{
      actor = New-Actor $FinanceUserId "FINANCE_LEAD"
      connection_id = $ConnectionId
      reference_id = $referenceId
      amount = $case.amount
      currency = $Currency
      external_id = $case.external_id
      payer_msisdn = $payer
      payer_message = ("Kora {0} collection" -f $category)
      payee_note = "Kora sandbox collection"
    }
    $case.request_ok = $true
    $summary.request_accepted_count++
  } catch {
    $case.error = $_.Exception.Message
    $summary.failed_count++
    $summary.cases += $case
    continue
  }

  for ($poll = 0; $poll -lt $MaxPolls; $poll++) {
    Start-Sleep -Seconds $PollSeconds
    try {
      $status = Invoke-KoraJson -Path "/v1/integrations/momo/request-to-pay/status" -Body @{
        actor = New-Actor $FinanceUserId "FINANCE_LEAD"
        reference_id = $referenceId
      }
      $case.status = $status.status
      if ($case.status -eq "SUCCESSFUL" -or $case.status -eq "FAILED") {
        break
      }
    } catch {
      $case.error = $_.Exception.Message
    }
  }

  if ($case.status -eq "SUCCESSFUL") {
    $summary.successful_count++
    try {
      $import = Invoke-KoraJson -Path "/v1/integrations/momo/request-to-pay/import" -Body @{
        actor = New-Actor $AdminUserId "ORG_ADMIN"
        reference_id = $referenceId
        input = @{
          organization_id = $OrganizationId
          connection_id = $ConnectionId
          source_name = "momo-api-demo"
          window_end = [DateTime]::UtcNow.ToString("o")
          sync_cursor = $referenceId
          idempotency_key = ("api-demo-" + $referenceId)
        }
      }
      $case.imported = $true
      $summary.imported_count++
    } catch {
      $case.error = $_.Exception.Message
      $summary.failed_count++
    }
  } else {
    if (-not $case.error) {
      $case.error = "status did not reach SUCCESSFUL or FAILED inside the polling window"
    }
    $summary.failed_count++
  }

  $summary.cases += $case
}

$summary | ConvertTo-Json -Depth 8
