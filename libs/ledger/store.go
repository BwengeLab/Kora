package ledger

import (
	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/evidence"
	"github.com/kora-finance/kora/libs/workflow"
)

type Store interface {
	CreateAccount(actor access.Actor, account Account) (Account, error)
	Post(ctx ActorContext, task workflow.Task, entries []Entry) (Group, error)
	Reverse(ctx ActorContext, organizationID, groupID string, proof evidence.Evidence) (Group, error)
	Group(organizationID, groupID string) (Group, error)
	Balance(organizationID, accountID string) (int64, error)
}
