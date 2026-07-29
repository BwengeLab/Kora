package workflow

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/auth"
	"github.com/kora-finance/kora/libs/evidence"
	"github.com/kora-finance/kora/libs/policy"
	_ "github.com/jackc/pgx/v5/stdlib"
)

type PostgresStore struct {
	db *sql.DB
}

func NewPostgresStore(databaseURL string) (*PostgresStore, error) {
	if databaseURL == "" {
		return nil, errors.New("database url is required")
	}
	db, err := sql.Open("pgx", databaseURL)
	if err != nil {
		return nil, err
	}
	if err := db.Ping(); err != nil {
		_ = db.Close()
		return nil, err
	}
	return &PostgresStore{db: db}, nil
}

func (s *PostgresStore) Close() error {
	if s == nil || s.db == nil {
		return nil
	}
	return s.db.Close()
}

func (s *PostgresStore) Create(actor access.Actor, task Task, rules policy.Policy) (Task, error) {
	if err := access.Authorize(actor, access.Resource{OrganizationID: task.OrganizationID}, access.PermissionCreateApproval); err != nil {
		return Task{}, err
	}
	if rules.OrganizationID != task.OrganizationID {
		return Task{}, errors.New("policy belongs to another organization")
	}
	if err := policy.Validate(rules); err != nil {
		return Task{}, err
	}
	if err := evidence.ValidateProvenance(task.Evidence); err != nil {
		return Task{}, err
	}
	if task.SuggestedAction == "" || task.Currency == "" || task.AmountMinor < 0 {
		return Task{}, errors.New("action, currency, and non-negative amount are required")
	}
	id, err := auth.NewID("approval")
	if err != nil {
		return Task{}, err
	}
	task.ID = id
	task.CreatorUserID = actor.UserID
	task.State = Suggested
	task.RequiredApprovers = access.RequiredApprovers(task.AmountMinor, rules.TwoApproverThresholdMinor)
	task.ApproverUserIDs = nil
	task.CreatedAt = time.Now().UTC()

	evidenceJSON, err := json.Marshal(task.Evidence)
	if err != nil {
		return Task{}, fmt.Errorf("marshal task evidence: %w", err)
	}
	approverJSON, err := json.Marshal(task.ApproverUserIDs)
	if err != nil {
		return Task{}, fmt.Errorf("marshal approver ids: %w", err)
	}

	var deadline *time.Time
	if !task.Deadline.IsZero() {
		deadline = &task.Deadline
	}
	var matchCandidate *string
	if task.MatchCandidateID != "" {
		matchCandidate = &task.MatchCandidateID
	}

	_, err = s.db.ExecContext(context.Background(),
		`INSERT INTO approval_tasks
			(id, organization_id, suggested_action, creator_user_id, assigned_role, state,
			 amount_minor, currency, required_approvers, approver_user_ids,
			 match_candidate_id, deadline, evidence, created_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)`,
		task.ID, task.OrganizationID, task.SuggestedAction, task.CreatorUserID,
		string(task.AssignedRole), string(task.State),
		task.AmountMinor, task.Currency, task.RequiredApprovers, approverJSON,
		matchCandidate, deadline, evidenceJSON, task.CreatedAt)
	if err != nil {
		return Task{}, err
	}
	return task, nil
}

func (s *PostgresStore) Assign(ctx ActorContext, taskID string, role access.Role, proof evidence.Evidence) (Task, error) {
	return s.transition(ctx, taskID, Assigned, proof, func(task *Task) error {
		if err := access.Authorize(ctx.Actor, access.Resource{OrganizationID: task.OrganizationID}, access.PermissionCreateApproval); err != nil {
			return err
		}
		if task.State != Suggested && task.State != Escalated {
			return invalidTransition(task.State, Assigned)
		}
		if !access.IsTenantRole(role) || role == access.RoleExternalCollaborator {
			return errors.New("assigned role must be an internal tenant role")
		}
		task.AssignedRole = role
		return nil
	})
}

func (s *PostgresStore) Approve(ctx ActorContext, taskID string, rules policy.Policy, proof evidence.Evidence) (Task, error) {
	if !ctx.Human {
		return Task{}, errors.New("agents cannot approve financial actions")
	}
	if rules.OrganizationID != ctx.Actor.OrganizationID {
		return Task{}, errors.New("policy belongs to another organization")
	}
	if err := policy.Validate(rules); err != nil {
		return Task{}, err
	}
	return s.transition(ctx, taskID, Approved, proof, func(task *Task) error {
		if task.State != Assigned {
			return invalidTransition(task.State, Approved)
		}
		if err := access.Authorize(ctx.Actor, access.Resource{OrganizationID: task.OrganizationID}, access.PermissionApproveFinancial); err != nil {
			return err
		}
		if err := access.EnforceSegregationOfDuties(access.ActionContext{CreatorUserID: task.CreatorUserID, ApproverUserID: ctx.Actor.UserID}); err != nil {
			return err
		}
		if containsString(task.ApproverUserIDs, ctx.Actor.UserID) {
			return errors.New("approver has already approved this task")
		}
		if approvalLimit(ctx.Actor, rules) < task.AmountMinor {
			return errors.New("approval amount exceeds actor limit")
		}
		task.ApproverUserIDs = append(task.ApproverUserIDs, ctx.Actor.UserID)
		if len(task.ApproverUserIDs) < task.RequiredApprovers {
			return pendingApproval{}
		}
		return access.EnforceApprovalChain(task.CreatorUserID, task.ApproverUserIDs, task.RequiredApprovers)
	})
}

func (s *PostgresStore) Reject(ctx ActorContext, taskID string, proof evidence.Evidence) (Task, error) {
	if !ctx.Human {
		return Task{}, errors.New("agents cannot reject financial actions")
	}
	return s.transition(ctx, taskID, Rejected, proof, func(task *Task) error {
		if task.State != Suggested && task.State != Assigned && task.State != Escalated {
			return invalidTransition(task.State, Rejected)
		}
		return access.Authorize(ctx.Actor, access.Resource{OrganizationID: task.OrganizationID}, access.PermissionApproveFinancial)
	})
}

func (s *PostgresStore) Escalate(ctx ActorContext, taskID string, proof evidence.Evidence) (Task, error) {
	return s.transition(ctx, taskID, Escalated, proof, func(task *Task) error {
		if err := access.Authorize(ctx.Actor, access.Resource{OrganizationID: task.OrganizationID}, access.PermissionCreateApproval); err != nil {
			return err
		}
		if task.State != Assigned {
			return invalidTransition(task.State, Escalated)
		}
		return nil
	})
}

func (s *PostgresStore) MarkExecuted(ctx ActorContext, taskID string, proof evidence.Evidence) (Task, error) {
	if !ctx.Human {
		return Task{}, errors.New("agents cannot execute financial actions")
	}
	return s.transition(ctx, taskID, Executed, proof, func(task *Task) error {
		if task.State != Approved {
			return invalidTransition(task.State, Executed)
		}
		return access.Authorize(ctx.Actor, access.Resource{OrganizationID: task.OrganizationID}, access.PermissionPostLedger)
	})
}

func (s *PostgresStore) MarkReversed(ctx ActorContext, taskID string, proof evidence.Evidence) (Task, error) {
	if !ctx.Human {
		return Task{}, errors.New("agents cannot reverse financial actions")
	}
	return s.transition(ctx, taskID, Reversed, proof, func(task *Task) error {
		if task.State != Approved && task.State != Executed {
			return invalidTransition(task.State, Reversed)
		}
		return access.Authorize(ctx.Actor, access.Resource{OrganizationID: task.OrganizationID}, access.PermissionReverseLedger)
	})
}

func (s *PostgresStore) Get(organizationID, taskID string) (Task, error) {
	return s.readTask(taskID, organizationID)
}

func (s *PostgresStore) History(organizationID, taskID string) ([]Transition, error) {
	if _, err := s.readTask(taskID, organizationID); err != nil {
		return nil, err
	}
	rows, err := s.db.QueryContext(context.Background(),
		`SELECT id, task_id, organization_id, from_state, to_state, actor_user_id, evidence, occurred_at
		 FROM approval_transition_events
		 WHERE task_id=$1 AND organization_id=$2
		 ORDER BY occurred_at ASC`,
		taskID, organizationID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var transitions []Transition
	for rows.Next() {
		var t Transition
		var fromStr, toStr string
		var evidenceBytes []byte
		if err := rows.Scan(&t.ID, &t.TaskID, &t.OrganizationID, &fromStr, &toStr, &t.ActorUserID, &evidenceBytes, &t.OccurredAt); err != nil {
			return nil, err
		}
		t.From = State(fromStr)
		t.To = State(toStr)
		if err := json.Unmarshal(evidenceBytes, &t.Evidence); err != nil {
			return nil, fmt.Errorf("unmarshal transition evidence: %w", err)
		}
		transitions = append(transitions, t)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if transitions == nil {
		return []Transition{}, nil
	}
	return transitions, nil
}

func (s *PostgresStore) transition(ctx ActorContext, taskID string, target State, proof evidence.Evidence, mutate func(*Task) error) (Task, error) {
	if ctx.Actor.UserID == "" {
		return Task{}, errors.New("actor user is required")
	}
	if err := evidence.Validate(proof); err != nil {
		return Task{}, err
	}
	task, err := s.readTask(taskID, ctx.Actor.OrganizationID)
	if err != nil {
		return Task{}, err
	}
	from := task.State
	err = mutate(&task)
	if _, pending := err.(pendingApproval); pending {
		target = Assigned
		err = nil
	}
	if err != nil {
		return Task{}, err
	}
	task.State = target

	approverJSON, err := json.Marshal(task.ApproverUserIDs)
	if err != nil {
		return Task{}, fmt.Errorf("marshal approver ids: %w", err)
	}
	_, err = s.db.ExecContext(context.Background(),
		`UPDATE approval_tasks SET state=$1, assigned_role=$2, approver_user_ids=$3 WHERE id=$4 AND organization_id=$5`,
		string(task.State), string(task.AssignedRole), approverJSON, taskID, ctx.Actor.OrganizationID)
	if err != nil {
		return Task{}, err
	}
	transitionID, err := auth.NewID("transition")
	if err != nil {
		return Task{}, err
	}
	proofJSON, err := json.Marshal(proof)
	if err != nil {
		return Task{}, fmt.Errorf("marshal proof evidence: %w", err)
	}
	_, err = s.db.ExecContext(context.Background(),
		`INSERT INTO approval_transition_events (id, task_id, organization_id, from_state, to_state, actor_user_id, evidence, occurred_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		transitionID, taskID, ctx.Actor.OrganizationID, string(from), string(target),
		ctx.Actor.UserID, proofJSON, time.Now().UTC())
	if err != nil {
		return Task{}, err
	}
	return task, nil
}

func (s *PostgresStore) readTask(taskID, organizationID string) (Task, error) {
	var (
		task           Task
		assignedRole   string
		stateStr       string
		approverBytes  []byte
		evidenceBytes  []byte
		deadlineNull   sql.NullTime
		matchCandidate sql.NullString
		createdAt      time.Time
	)
	err := s.db.QueryRowContext(context.Background(),
		`SELECT id, organization_id, suggested_action, creator_user_id,
		        COALESCE(assigned_role, ''), state, amount_minor, currency,
		        required_approvers, approver_user_ids,
		        match_candidate_id, deadline, evidence, created_at
		 FROM approval_tasks WHERE id=$1 AND organization_id=$2`,
		taskID, organizationID).Scan(
		&task.ID, &task.OrganizationID, &task.SuggestedAction, &task.CreatorUserID,
		&assignedRole, &stateStr, &task.AmountMinor, &task.Currency,
		&task.RequiredApprovers, &approverBytes, &matchCandidate,
		&deadlineNull, &evidenceBytes, &createdAt)
	if err == sql.ErrNoRows {
		return Task{}, errors.New("approval task not found")
	}
	if err != nil {
		return Task{}, err
	}
	task.AssignedRole = access.Role(assignedRole)
	task.State = State(stateStr)
	task.MatchCandidateID = matchCandidate.String
	if deadlineNull.Valid {
		task.Deadline = deadlineNull.Time
	}
	task.CreatedAt = createdAt
	if err := json.Unmarshal(approverBytes, &task.ApproverUserIDs); err != nil {
		return Task{}, fmt.Errorf("unmarshal approver ids: %w", err)
	}
	if err := json.Unmarshal(evidenceBytes, &task.Evidence); err != nil {
		return Task{}, fmt.Errorf("unmarshal task evidence: %w", err)
	}
	return task, nil
}

func containsString(slice []string, s string) bool {
	for _, v := range slice {
		if v == s {
			return true
		}
	}
	return false
}
