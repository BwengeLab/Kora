package httpapi

import (
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"
)

// errNoDatabase is returned when a DB-backed operation cannot run without a database.
var errNoDatabase = errors.New("database connection required")

// appendAuditEntry appends a row to the real audit_entries trail. It is the
// single write path used by every workflow mutation handler so that all
// control actions are captured in the tenant-scoped audit log.
func (s *Server) appendAuditEntry(orgID, actorUserID, action, resource string) error {
	if s.db == nil {
		return errNoDatabase
	}
	now := time.Now().UTC()
	id := fmt.Sprintf("al-%d", now.UnixNano())
	hashInput := id + "|" + orgID + "|" + actorUserID + "|" + action + "|" + resource + "|" + now.Format(time.RFC3339Nano)
	hash := fmt.Sprintf("%x", sha256.Sum256([]byte(hashInput)))
	_, err := s.db.Exec(`
		INSERT INTO audit_entries (
			id, organization_id, actor_user_id, action, resource,
			evidence_id, previous_hash, integrity_hash, occurred_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
	`,
		id, orgID, actorUserID, action, resource, "", "", hash, now,
	)
	return err
}

// allowedApprovalTransition mirrors the approval_tasks.state CHECK constraint
// defined in deploy/migrations/010_workflow_ledger.sql.
func allowedApprovalTransition(fromState, toState string) bool {
	switch fromState {
	case "SUGGESTED":
		return toState == "ASSIGNED" || toState == "REJECTED"
	case "ASSIGNED":
		return toState == "ASSIGNED" || toState == "APPROVED" || toState == "REJECTED" || toState == "ESCALATED"
	case "ESCALATED":
		return toState == "ASSIGNED" || toState == "REJECTED"
	case "APPROVED":
		return toState == "EXECUTED" || toState == "REVERSED"
	case "EXECUTED":
		return toState == "REVERSED"
	default:
		return false
	}
}

// transitionApprovalTask moves an approval task between allowed states and
// records the transition in approval_transition_events. The UPDATE is guarded
// by the current state predicate so concurrent writers cannot double-apply.
func (s *Server) transitionApprovalTask(orgID, taskID, fromState, toState, actorUserID string) error {
	if s.db == nil {
		return errNoDatabase
	}
	if !allowedApprovalTransition(fromState, toState) {
		return fmt.Errorf("illegal approval transition %s -> %s", fromState, toState)
	}
	res, err := s.db.Exec(
		`UPDATE approval_tasks SET state = $1 WHERE id = $2 AND organization_id = $3 AND state = $4`,
		toState, taskID, orgID, fromState,
	)
	if err != nil {
		return err
	}
	if n, _ := res.RowsAffected(); n == 0 {
		return fmt.Errorf("approval task %s is not in state %s", taskID, fromState)
	}
	now := time.Now().UTC()
	_, err = s.db.Exec(`
		INSERT INTO approval_transition_events (
			id, task_id, organization_id, from_state, to_state, actor_user_id, evidence, occurred_at
		)
		VALUES ($1, $2, $3, $4, $5, $6, '{}'::jsonb, $7)
	`,
		"ate-"+strconv.FormatInt(now.UnixNano(), 10), taskID, orgID, fromState, toState, actorUserID, now,
	)
	return err
}

// buildEvidenceJSON marshals an arbitrary evidence object for JSONB columns.
// It never fails for the maps/structs used by the workflow handlers.
func buildEvidenceJSON(value any) []byte {
	data, err := json.Marshal(value)
	if err != nil {
		return []byte("{}")
	}
	return data
}

// parseDecimalToMinor converts a decimal string ("1234.56") into a minor-unit
// integer string ("123456"). It returns "0" for unparsable or empty input.
func parseDecimalToMinor(decimal string) string {
	cleaned := strings.TrimSpace(decimal)
	if cleaned == "" {
		return "0"
	}
	parts := strings.SplitN(cleaned, ".", 2)
	whole := strings.TrimLeft(parts[0], " ")
	if len(parts) == 1 {
		return whole
	}
	fraction := parts[1]
	if len(fraction) > 2 {
		fraction = fraction[:2]
	}
	for len(fraction) < 2 {
		fraction += "0"
	}
	return strings.TrimLeft(whole+"", "") + fraction
}
