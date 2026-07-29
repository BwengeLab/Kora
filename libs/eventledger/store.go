package eventledger

import (
	"github.com/kora-finance/kora/libs/corrections"
	"github.com/kora-finance/kora/libs/evidence"
)

type Store interface {
	Append(event Event) (AppendResult, error)
	AppendCorrection(correction corrections.Event) (corrections.Event, error)
	Reverse(organizationID string, eventID string, proof evidence.Evidence, reason string) (corrections.Event, error)
	Get(organizationID string, eventID string) (EventView, error)
	List(organizationID string) []EventView
}
