package workflow

import (
	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/evidence"
	"github.com/kora-finance/kora/libs/policy"
)

type Store interface {
	Create(actor access.Actor, task Task, rules policy.Policy) (Task, error)
	Assign(ctx ActorContext, taskID string, role access.Role, proof evidence.Evidence) (Task, error)
	Approve(ctx ActorContext, taskID string, rules policy.Policy, proof evidence.Evidence) (Task, error)
	Reject(ctx ActorContext, taskID string, proof evidence.Evidence) (Task, error)
	Escalate(ctx ActorContext, taskID string, proof evidence.Evidence) (Task, error)
	MarkExecuted(ctx ActorContext, taskID string, proof evidence.Evidence) (Task, error)
	MarkReversed(ctx ActorContext, taskID string, proof evidence.Evidence) (Task, error)
	Get(organizationID, taskID string) (Task, error)
	History(organizationID, taskID string) ([]Transition, error)
}
