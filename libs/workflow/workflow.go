package workflow

import (
	"errors"
	"fmt"
	"slices"
	"sync"
	"time"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/auth"
	"github.com/kora-finance/kora/libs/evidence"
	"github.com/kora-finance/kora/libs/policy"
)

type State string

const (
	Suggested State = "SUGGESTED"
	Assigned  State = "ASSIGNED"
	Approved  State = "APPROVED"
	Rejected  State = "REJECTED"
	Executed  State = "EXECUTED"
	Escalated State = "ESCALATED"
	Reversed  State = "REVERSED"
)

type Task struct {
	ID                string            `json:"id"`
	OrganizationID    string            `json:"organization_id"`
	SuggestedAction   string            `json:"suggested_action"`
	CreatorUserID     string            `json:"creator_user_id"`
	AssignedRole      access.Role       `json:"assigned_role"`
	State             State             `json:"state"`
	AmountMinor       int64             `json:"amount_minor"`
	Currency          string            `json:"currency"`
	RequiredApprovers int               `json:"required_approvers"`
	ApproverUserIDs   []string          `json:"approver_user_ids"`
	MatchCandidateID  string            `json:"match_candidate_id,omitempty"`
	Deadline          time.Time         `json:"deadline"`
	Evidence          evidence.Evidence `json:"evidence"`
	CreatedAt         time.Time         `json:"created_at"`
}

type Transition struct {
	ID             string            `json:"id"`
	TaskID         string            `json:"task_id"`
	OrganizationID string            `json:"organization_id"`
	From           State             `json:"from"`
	To             State             `json:"to"`
	ActorUserID    string            `json:"actor_user_id"`
	Evidence       evidence.Evidence `json:"evidence"`
	OccurredAt     time.Time         `json:"occurred_at"`
}

type ActorContext struct {
	Actor access.Actor `json:"actor"`
	Human bool         `json:"human"`
}

type memoryStore struct {
	mu      sync.RWMutex
	tasks   map[string]Task
	history map[string][]Transition
}

func NewStore() Store {
	return &memoryStore{tasks: map[string]Task{}, history: map[string][]Transition{}}
}

func (s *memoryStore) Create(actor access.Actor, task Task, rules policy.Policy) (Task, error) {
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
	s.mu.Lock()
	defer s.mu.Unlock()
	s.tasks[task.ID] = cloneTask(task)
	return cloneTask(task), nil
}

func (s *memoryStore) Assign(ctx ActorContext, taskID string, role access.Role, proof evidence.Evidence) (Task, error) {
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

func (s *memoryStore) Approve(ctx ActorContext, taskID string, rules policy.Policy, proof evidence.Evidence) (Task, error) {
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
		if slices.Contains(task.ApproverUserIDs, ctx.Actor.UserID) {
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

func (s *memoryStore) Reject(ctx ActorContext, taskID string, proof evidence.Evidence) (Task, error) {
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

func (s *memoryStore) Escalate(ctx ActorContext, taskID string, proof evidence.Evidence) (Task, error) {
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

func (s *memoryStore) MarkExecuted(ctx ActorContext, taskID string, proof evidence.Evidence) (Task, error) {
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

func (s *memoryStore) MarkReversed(ctx ActorContext, taskID string, proof evidence.Evidence) (Task, error) {
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

func (s *memoryStore) Get(organizationID, taskID string) (Task, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	task, ok := s.tasks[taskID]
	if !ok || task.OrganizationID != organizationID {
		return Task{}, errors.New("approval task not found")
	}
	return cloneTask(task), nil
}

func (s *memoryStore) History(organizationID, taskID string) ([]Transition, error) {
	if _, err := s.Get(organizationID, taskID); err != nil {
		return nil, err
	}
	s.mu.RLock()
	defer s.mu.RUnlock()
	return slices.Clone(s.history[taskID]), nil
}

type pendingApproval struct{}

func (pendingApproval) Error() string { return "additional approval required" }

func (s *memoryStore) transition(ctx ActorContext, taskID string, target State, proof evidence.Evidence, mutate func(*Task) error) (Task, error) {
	if ctx.Actor.UserID == "" {
		return Task{}, errors.New("actor user is required")
	}
	if err := evidence.Validate(proof); err != nil {
		return Task{}, err
	}
	s.mu.Lock()
	defer s.mu.Unlock()
	task, ok := s.tasks[taskID]
	if !ok || task.OrganizationID != ctx.Actor.OrganizationID {
		return Task{}, errors.New("approval task not found")
	}
	from := task.State
	err := mutate(&task)
	if _, pending := err.(pendingApproval); pending {
		target = Assigned
		err = nil
	}
	if err != nil {
		return Task{}, err
	}
	task.State = target
	id, err := auth.NewID("transition")
	if err != nil {
		return Task{}, err
	}
	s.tasks[taskID] = cloneTask(task)
	s.history[taskID] = append(s.history[taskID], Transition{ID: id, TaskID: taskID, OrganizationID: task.OrganizationID, From: from, To: target, ActorUserID: ctx.Actor.UserID, Evidence: proof, OccurredAt: time.Now().UTC()})
	return cloneTask(task), nil
}

func approvalLimit(actor access.Actor, rules policy.Policy) int64 {
	var limit int64
	for _, role := range actor.Roles {
		if configured := rules.ApprovalLimitsMinor[string(role)]; configured > limit {
			limit = configured
		}
	}
	return limit
}

func invalidTransition(from, to State) error {
	return fmt.Errorf("invalid approval transition %s -> %s", from, to)
}

func cloneTask(task Task) Task {
	task.ApproverUserIDs = slices.Clone(task.ApproverUserIDs)
	return task
}
