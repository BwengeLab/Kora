package operations

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"sort"
	"strings"
	"time"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/evidence"
)

type Severity string

const (
	Info     Severity = "INFO"
	Warning  Severity = "WARNING"
	Critical Severity = "CRITICAL"
)

type HealthStatus string

const (
	Healthy  HealthStatus = "HEALTHY"
	Degraded HealthStatus = "DEGRADED"
	Down     HealthStatus = "DOWN"
)

type DependencyStatus struct {
	Name      string       `json:"name"`
	Status    HealthStatus `json:"status"`
	LatencyMS int64        `json:"latency_ms"`
	CheckedAt time.Time    `json:"checked_at"`
	Message   string       `json:"message,omitempty"`
}

type HealthReport struct {
	ID           string             `json:"id"`
	Service      string             `json:"service"`
	Status       HealthStatus       `json:"status"`
	GeneratedAt  time.Time          `json:"generated_at"`
	Dependencies []DependencyStatus `json:"dependencies"`
}

type RequestLog struct {
	TraceID        string            `json:"trace_id"`
	Service        string            `json:"service"`
	OrganizationID string            `json:"organization_id,omitempty"`
	UserID         string            `json:"user_id,omitempty"`
	Method         string            `json:"method"`
	Path           string            `json:"path"`
	StatusCode     int               `json:"status_code"`
	DurationMS     int64             `json:"duration_ms"`
	Fields         map[string]string `json:"fields,omitempty"`
	OccurredAt     time.Time         `json:"occurred_at"`
}

type Metric struct {
	ID             string            `json:"id"`
	Name           string            `json:"name"`
	OrganizationID string            `json:"organization_id,omitempty"`
	Value          float64           `json:"value"`
	Unit           string            `json:"unit"`
	Labels         map[string]string `json:"labels,omitempty"`
	ObservedAt     time.Time         `json:"observed_at"`
}

type BackupManifest struct {
	ID             string            `json:"id"`
	OrganizationID string            `json:"organization_id,omitempty"`
	Scope          string            `json:"scope"`
	StorageURI     string            `json:"storage_uri"`
	DatabaseLSN    string            `json:"database_lsn"`
	ObjectSnapshot string            `json:"object_snapshot"`
	Checksum       string            `json:"checksum"`
	CreatedBy      string            `json:"created_by"`
	CreatedAt      time.Time         `json:"created_at"`
	Evidence       evidence.Evidence `json:"evidence"`
}

type RestoreDrill struct {
	ID               string            `json:"id"`
	BackupID         string            `json:"backup_id"`
	OrganizationID   string            `json:"organization_id,omitempty"`
	StartedAt        time.Time         `json:"started_at"`
	CompletedAt      time.Time         `json:"completed_at"`
	Verified         bool              `json:"verified"`
	VerifiedTables   []string          `json:"verified_tables"`
	RestoredChecksum string            `json:"restored_checksum"`
	Evidence         evidence.Evidence `json:"evidence"`
}

type CostUsage struct {
	ID              string    `json:"id"`
	OrganizationID  string    `json:"organization_id"`
	Service         string    `json:"service"`
	AgentName       string    `json:"agent_name,omitempty"`
	ModelRoute      string    `json:"model_route,omitempty"`
	Units           int64     `json:"units"`
	UnitCostMicros  int64     `json:"unit_cost_micros"`
	TotalCostMicros int64     `json:"total_cost_micros"`
	ObservedAt      time.Time `json:"observed_at"`
}

type SecurityCheck struct {
	ID             string            `json:"id"`
	OrganizationID string            `json:"organization_id,omitempty"`
	Check          string            `json:"check"`
	Passed         bool              `json:"passed"`
	Severity       Severity          `json:"severity"`
	Reason         string            `json:"reason"`
	Evidence       evidence.Evidence `json:"evidence"`
	CheckedAt      time.Time         `json:"checked_at"`
}

func BuildHealthReport(service string, dependencies []DependencyStatus) (HealthReport, error) {
	if strings.TrimSpace(service) == "" {
		return HealthReport{}, errors.New("service name is required")
	}
	report := HealthReport{Service: service, Status: Healthy, GeneratedAt: time.Now().UTC(), Dependencies: append([]DependencyStatus(nil), dependencies...)}
	for index := range report.Dependencies {
		if report.Dependencies[index].Name == "" || !validHealth(report.Dependencies[index].Status) {
			return HealthReport{}, errors.New("dependency name and valid status are required")
		}
		if report.Dependencies[index].CheckedAt.IsZero() {
			report.Dependencies[index].CheckedAt = report.GeneratedAt
		}
		switch report.Dependencies[index].Status {
		case Down:
			report.Status = Down
		case Degraded:
			if report.Status != Down {
				report.Status = Degraded
			}
		}
	}
	report.ID = stableID("health", report.Service, string(report.Status), report.GeneratedAt.Format(time.RFC3339Nano))
	return report, nil
}

func StructuredLog(entry RequestLog) (string, error) {
	if entry.TraceID == "" || entry.Service == "" || entry.Method == "" || entry.Path == "" || entry.StatusCode <= 0 {
		return "", errors.New("trace id, service, method, path, and status are required")
	}
	if entry.OccurredAt.IsZero() {
		entry.OccurredAt = time.Now().UTC()
	}
	entry.Fields = cloneMap(entry.Fields)
	encoded, err := json.Marshal(entry)
	if err != nil {
		return "", err
	}
	return string(encoded), nil
}

func RecordMetric(actor access.Actor, metric Metric) (Metric, error) {
	if metric.OrganizationID != "" {
		if err := access.Authorize(actor, access.Resource{OrganizationID: metric.OrganizationID}, access.PermissionReadReports); err != nil {
			return Metric{}, err
		}
	} else if err := access.AuthorizePlatform(actor, access.PermissionPlatformReadUsage); err != nil {
		return Metric{}, err
	}
	if metric.Name == "" || metric.Unit == "" {
		return Metric{}, errors.New("metric name and unit are required")
	}
	if metric.ObservedAt.IsZero() {
		metric.ObservedAt = time.Now().UTC()
	}
	metric.ID = stableID("metric", metric.OrganizationID, metric.Name, fmt.Sprint(metric.Value), metric.ObservedAt.Format(time.RFC3339Nano))
	metric.Labels = cloneMap(metric.Labels)
	return metric, nil
}

func CreateBackupManifest(actor access.Actor, manifest BackupManifest) (BackupManifest, error) {
	if manifest.OrganizationID != "" {
		if err := access.Authorize(actor, access.Resource{OrganizationID: manifest.OrganizationID}, access.PermissionReadAudit); err != nil {
			return BackupManifest{}, err
		}
	} else if err := access.AuthorizePlatform(actor, access.PermissionPlatformSecurity); err != nil {
		return BackupManifest{}, err
	}
	if manifest.Scope == "" || manifest.StorageURI == "" || manifest.DatabaseLSN == "" || manifest.Checksum == "" || manifest.CreatedBy == "" {
		return BackupManifest{}, errors.New("backup scope, storage uri, database lsn, checksum, and creator are required")
	}
	if err := evidence.Validate(manifest.Evidence); err != nil {
		return BackupManifest{}, err
	}
	if manifest.CreatedAt.IsZero() {
		manifest.CreatedAt = time.Now().UTC()
	}
	manifest.ID = stableID("backup", manifest.OrganizationID, manifest.Scope, manifest.StorageURI, manifest.Checksum)
	return manifest, nil
}

func VerifyRestoreDrill(actor access.Actor, drill RestoreDrill, backup BackupManifest) (RestoreDrill, error) {
	if drill.OrganizationID != backup.OrganizationID || drill.BackupID != backup.ID {
		return RestoreDrill{}, errors.New("restore drill must reference the backup and tenant")
	}
	if drill.OrganizationID != "" {
		if err := access.Authorize(actor, access.Resource{OrganizationID: drill.OrganizationID}, access.PermissionReadAudit); err != nil {
			return RestoreDrill{}, err
		}
	} else if err := access.AuthorizePlatform(actor, access.PermissionPlatformSecurity); err != nil {
		return RestoreDrill{}, err
	}
	if drill.StartedAt.IsZero() || drill.CompletedAt.Before(drill.StartedAt) || len(drill.VerifiedTables) == 0 {
		return RestoreDrill{}, errors.New("restore drill requires valid timing and verified tables")
	}
	if drill.RestoredChecksum == "" || drill.RestoredChecksum != backup.Checksum {
		return RestoreDrill{}, errors.New("restore checksum must match backup checksum")
	}
	if err := evidence.Validate(drill.Evidence); err != nil {
		return RestoreDrill{}, err
	}
	drill.Verified = true
	drill.VerifiedTables = sortedStrings(drill.VerifiedTables)
	drill.ID = stableID("restore", backup.ID, drill.RestoredChecksum, strings.Join(drill.VerifiedTables, ","))
	return drill, nil
}

func RecordCostUsage(actor access.Actor, usage CostUsage) (CostUsage, error) {
	if err := access.Authorize(actor, access.Resource{OrganizationID: usage.OrganizationID}, access.PermissionReadReports); err != nil {
		return CostUsage{}, err
	}
	if usage.OrganizationID == "" || usage.Service == "" || usage.Units < 0 || usage.UnitCostMicros < 0 {
		return CostUsage{}, errors.New("cost usage requires tenant, service, and non-negative units/cost")
	}
	if usage.ObservedAt.IsZero() {
		usage.ObservedAt = time.Now().UTC()
	}
	usage.TotalCostMicros = usage.Units * usage.UnitCostMicros
	usage.ID = stableID("cost", usage.OrganizationID, usage.Service, usage.AgentName, usage.ModelRoute, fmt.Sprint(usage.Units), usage.ObservedAt.Format(time.RFC3339Nano))
	return usage, nil
}

func TenantIsolationCheck(actor access.Actor, organizationID string, attemptedOrganizationID string, proof evidence.Evidence) (SecurityCheck, error) {
	if actor.OrganizationID == "" || organizationID == "" || attemptedOrganizationID == "" {
		return SecurityCheck{}, errors.New("actor tenant, expected tenant, and attempted tenant are required")
	}
	if err := evidence.Validate(proof); err != nil {
		return SecurityCheck{}, err
	}
	passed := actor.OrganizationID == organizationID && attemptedOrganizationID != organizationID
	check := SecurityCheck{OrganizationID: organizationID, Check: "TENANT_ISOLATION", Passed: passed, Severity: Critical, Evidence: proof, CheckedAt: time.Now().UTC()}
	if passed {
		check.Reason = "cross-tenant access attempt was denied"
	} else {
		check.Reason = "tenant isolation check failed"
	}
	check.ID = stableID("security", check.OrganizationID, check.Check, fmt.Sprint(check.Passed), proof.SourceRecordID)
	return check, nil
}

func validHealth(status HealthStatus) bool {
	return status == Healthy || status == Degraded || status == Down
}

func stableID(prefix string, values ...string) string {
	payload, err := json.Marshal(values)
	if err != nil {
		panic(err)
	}
	sum := sha256.Sum256(payload)
	return prefix + "_" + hex.EncodeToString(sum[:10])
}

func sortedStrings(values []string) []string {
	out := append([]string(nil), values...)
	sort.Strings(out)
	return out
}

func cloneMap(input map[string]string) map[string]string {
	out := map[string]string{}
	for key, value := range input {
		out[key] = value
	}
	return out
}
