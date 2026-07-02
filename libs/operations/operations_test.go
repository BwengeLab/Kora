package operations

import (
	"encoding/json"
	"testing"
	"time"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/evidence"
)

func TestBuildHealthReportAggregatesDependencyStatus(t *testing.T) {
	report, err := BuildHealthReport("gateway", []DependencyStatus{
		{Name: "postgres", Status: Healthy, LatencyMS: 10},
		{Name: "redis", Status: Degraded, LatencyMS: 120},
	})
	if err != nil {
		t.Fatalf("BuildHealthReport() error = %v", err)
	}
	if report.Status != Degraded || report.ID == "" {
		t.Fatalf("report = %+v", report)
	}
}

func TestStructuredLogProducesJSONWithTrace(t *testing.T) {
	line, err := StructuredLog(RequestLog{TraceID: "trace-1", Service: "gateway", Method: "POST", Path: "/v1/test", StatusCode: 200, DurationMS: 5})
	if err != nil {
		t.Fatalf("StructuredLog() error = %v", err)
	}
	var decoded map[string]any
	if err := json.Unmarshal([]byte(line), &decoded); err != nil {
		t.Fatalf("log line is not JSON: %v", err)
	}
	if decoded["trace_id"] != "trace-1" {
		t.Fatalf("decoded log = %+v", decoded)
	}
}

func TestBackupAndRestoreDrillRequireMatchingChecksum(t *testing.T) {
	backup, err := CreateBackupManifest(auditor(), BackupManifest{OrganizationID: "org_1", Scope: "tenant", StorageURI: "s3://kora/backups/1", DatabaseLSN: "0/123", Checksum: "abc", CreatedBy: "u_1", Evidence: proof("backup")})
	if err != nil {
		t.Fatalf("CreateBackupManifest() error = %v", err)
	}
	drill, err := VerifyRestoreDrill(auditor(), RestoreDrill{BackupID: backup.ID, OrganizationID: "org_1", StartedAt: time.Now().UTC(), CompletedAt: time.Now().UTC().Add(time.Minute), VerifiedTables: []string{"business_events", "ledger_entries"}, RestoredChecksum: "abc", Evidence: proof("restore")}, backup)
	if err != nil {
		t.Fatalf("VerifyRestoreDrill() error = %v", err)
	}
	if !drill.Verified || drill.ID == "" {
		t.Fatalf("drill = %+v", drill)
	}
	bad := drill
	bad.RestoredChecksum = "wrong"
	if _, err := VerifyRestoreDrill(auditor(), bad, backup); err == nil {
		t.Fatal("VerifyRestoreDrill() accepted wrong checksum")
	}
}

func TestTenantIsolationCheckAndCostUsage(t *testing.T) {
	check, err := TenantIsolationCheck(auditor(), "org_1", "org_2", proof("tenant-check"))
	if err != nil {
		t.Fatalf("TenantIsolationCheck() error = %v", err)
	}
	if !check.Passed || check.Severity != Critical {
		t.Fatalf("check = %+v", check)
	}
	usage, err := RecordCostUsage(financeLead(), CostUsage{OrganizationID: "org_1", Service: "agent-runtime", AgentName: "credit_passport_agent", ModelRoute: "local", Units: 1000, UnitCostMicros: 2})
	if err != nil {
		t.Fatalf("RecordCostUsage() error = %v", err)
	}
	if usage.TotalCostMicros != 2000 || usage.ID == "" {
		t.Fatalf("usage = %+v", usage)
	}
}

func TestPlatformMetricRequiresPlatformPermission(t *testing.T) {
	metric, err := RecordMetric(platformAdmin(), Metric{Name: "http_requests_total", Unit: "count", Value: 10})
	if err != nil {
		t.Fatalf("RecordMetric(platform) error = %v", err)
	}
	if metric.ID == "" {
		t.Fatalf("metric = %+v", metric)
	}
	if _, err := RecordMetric(financeLead(), Metric{Name: "http_requests_total", Unit: "count", Value: 10}); err == nil {
		t.Fatal("RecordMetric() allowed tenant actor to write platform metric")
	}
}

func auditor() access.Actor {
	return access.Actor{UserID: "u_1", OrganizationID: "org_1", Roles: []access.Role{access.RoleAuditorCompliance}}
}

func financeLead() access.Actor {
	return access.Actor{UserID: "u_finance", OrganizationID: "org_1", Roles: []access.Role{access.RoleFinanceLead}}
}

func platformAdmin() access.Actor {
	return access.Actor{UserID: "u_platform", Plane: access.PlanePlatform, Roles: []access.Role{access.RoleSuperAdmin}}
}

func proof(sourceRecord string) evidence.Evidence {
	return evidence.Evidence{SourceDocumentID: "ops-doc", SourceRecordID: sourceRecord, Reason: "operations fixture", ConfidenceScore: 0.99}
}
