package reconciliation

import (
	"errors"
	"math"
	"sort"
	"strings"
	"time"

	"github.com/kora-finance/kora/libs/eventledger"
	"github.com/kora-finance/kora/libs/evidence"
	"github.com/kora-finance/kora/libs/policy"
)

type State string

const (
	Matched    State = "MATCHED"
	Suggested  State = "SUGGESTED"
	Rejected   State = "REJECTED"
	Unmatched  State = "UNMATCHED"
	Duplicate  State = "DUPLICATE"
	Suspicious State = "SUSPICIOUS"
)

type Candidate struct {
	LeftEventID  string             `json:"left_event_id"`
	RightEventID string             `json:"right_event_id,omitempty"`
	State        State              `json:"state"`
	Score        float64            `json:"score"`
	Tier         string             `json:"tier"`
	Factors      map[string]float64 `json:"factors"`
	Evidence     evidence.Evidence  `json:"evidence"`
	Reason       string             `json:"reason"`
}
type Exception struct {
	EventID  string            `json:"event_id"`
	State    State             `json:"state"`
	Reason   string            `json:"reason"`
	Evidence evidence.Evidence `json:"evidence"`
}
type Result struct {
	Candidates    []Candidate `json:"candidates"`
	Exceptions    []Exception `json:"exceptions"`
	PolicyID      string      `json:"policy_id"`
	PolicyVersion int         `json:"policy_version"`
}

func Reconcile(organizationID string, events []eventledger.Event, rules policy.Policy) (Result, error) {
	if organizationID == "" {
		return Result{}, errors.New("organization id is required")
	}
	if rules.OrganizationID != organizationID {
		return Result{}, errors.New("policy belongs to another organization")
	}
	if err := policy.Validate(rules); err != nil {
		return Result{}, err
	}
	for _, event := range events {
		if event.OrganizationID != organizationID {
			return Result{}, errors.New("cross-tenant event denied")
		}
	}

	result := Result{PolicyID: rules.ID, PolicyVersion: rules.Version}
	duplicateIDs := detectDuplicates(events, rules)
	consumed := map[string]bool{}
	for i, left := range events {
		if consumed[left.ID] {
			continue
		}
		if duplicateIDs[left.ID] {
			result.Candidates = append(result.Candidates, candidate(left, eventledger.Event{}, Duplicate, 1, nil, "duplicate source event", rules))
			result.Exceptions = append(result.Exceptions, exception(left, Duplicate, "duplicate reference, amount, and date within policy window"))
			continue
		}
		bestScore := 0.0
		var best eventledger.Event
		var bestFactors map[string]float64
		for j, right := range events {
			if i == j || consumed[right.ID] || duplicateIDs[right.ID] || !compatible(left, right) {
				continue
			}
			score, factors := score(left, right, rules)
			if score > bestScore {
				bestScore, best, bestFactors = score, right, factors
			}
		}
		if best.ID == "" {
			result.Candidates = append(result.Candidates, candidate(left, best, Unmatched, 0, nil, "no compatible counterpart", rules))
			result.Exceptions = append(result.Exceptions, exception(left, Unmatched, "no compatible counterpart"))
			continue
		}
		state := Rejected
		reason := "candidate below review threshold"
		if bestScore >= rules.AutoMatchThreshold {
			state, reason = Matched, "deterministic policy threshold met"
		} else if bestScore >= rules.SuggestedMatchThreshold {
			state, reason = Suggested, "human review required"
		} else if bestFactors["reference"] == 1 && bestFactors["amount"] == 0 {
			state, reason = Suspicious, "same reference with amount conflict"
		}
		// Reconciliation candidates are one-to-one. Pairing both sides here avoids
		// emitting the same proposal again from the opposite direction.
		consumed[left.ID] = true
		consumed[best.ID] = true
		result.Candidates = append(result.Candidates, candidate(left, best, state, bestScore, bestFactors, reason, rules))
		if state != Matched {
			result.Exceptions = append(result.Exceptions, exception(left, state, reason))
		}
	}
	sort.SliceStable(result.Candidates, func(i, j int) bool { return result.Candidates[i].LeftEventID < result.Candidates[j].LeftEventID })
	return result, nil
}

func score(left, right eventledger.Event, rules policy.Policy) (float64, map[string]float64) {
	f := map[string]float64{}
	f["reference"] = boolScore(norm(left.Evidence.TransactionReference) != "" && norm(left.Evidence.TransactionReference) == norm(right.Evidence.TransactionReference))
	diff := abs(left.Evidence.AmountMinor) - abs(right.Evidence.AmountMinor)
	if diff < 0 {
		diff = -diff
	}
	if diff == 0 {
		f["amount"] = 1
	} else if diff <= rules.PaymentToleranceMinor {
		f["amount"] = .9
	}
	f["date"] = dateScore(left.Evidence.OccurredOn, right.Evidence.OccurredOn)
	f["counterparty"] = boolScore(norm(left.Attributes["party_name"]) != "" && norm(left.Attributes["party_name"]) == norm(right.Attributes["party_name"]))
	f["document"] = boolScore(left.Attributes["document_link"] != "" && left.Attributes["document_link"] == right.Attributes["document_link"])
	return round(f["reference"]*.40 + f["amount"]*.30 + f["date"]*.15 + f["counterparty"]*.10 + f["document"]*.05), f
}
func compatible(a, b eventledger.Event) bool {
	return (a.Type == eventledger.PaymentReceived && b.Type == eventledger.InvoiceIssued) || (b.Type == eventledger.PaymentReceived && a.Type == eventledger.InvoiceIssued) || (a.Type == eventledger.PaymentSent && b.Type == eventledger.BillReceived) || (b.Type == eventledger.PaymentSent && a.Type == eventledger.BillReceived) || (a.Type == eventledger.PaymentSent && b.Type == eventledger.ObligationCreated) || (b.Type == eventledger.PaymentSent && a.Type == eventledger.ObligationCreated)
}
func detectDuplicates(events []eventledger.Event, rules policy.Policy) map[string]bool {
	out := map[string]bool{}
	for i := range events {
		for j := i + 1; j < len(events); j++ {
			a, b := events[i], events[j]
			if a.Type != b.Type || norm(a.Evidence.TransactionReference) == "" || norm(a.Evidence.TransactionReference) != norm(b.Evidence.TransactionReference) || a.Evidence.AmountMinor != b.Evidence.AmountMinor {
				continue
			}
			if days(a.Evidence.OccurredOn, b.Evidence.OccurredOn) <= rules.DuplicateWindowDays {
				out[b.ID] = true
			}
		}
	}
	return out
}
func candidate(left, right eventledger.Event, state State, scoreValue float64, f map[string]float64, reason string, rules policy.Policy) Candidate {
	return Candidate{LeftEventID: left.ID, RightEventID: right.ID, State: state, Score: scoreValue, Tier: strings.ToUpper(policy.Tier(scoreValue, rules)), Factors: f, Evidence: left.Evidence, Reason: reason}
}
func exception(e eventledger.Event, state State, reason string) Exception {
	return Exception{EventID: e.ID, State: state, Reason: reason, Evidence: e.Evidence}
}
func dateScore(a, b string) float64 {
	d := days(a, b)
	if d == 0 {
		return 1
	}
	if d <= 3 {
		return .8
	}
	if d <= 7 {
		return .5
	}
	return 0
}
func days(a, b string) int {
	x, e1 := time.Parse("2006-01-02", a)
	y, e2 := time.Parse("2006-01-02", b)
	if e1 != nil || e2 != nil {
		return math.MaxInt
	}
	return int(math.Abs(x.Sub(y).Hours() / 24))
}
func norm(v string) string {
	return strings.ToLower(strings.Join(strings.Fields(strings.TrimSpace(v)), ""))
}
func boolScore(v bool) float64 {
	if v {
		return 1
	}
	return 0
}
func abs(v int64) int64 {
	if v < 0 {
		return -v
	}
	return v
}
func round(v float64) float64 { return math.Round(v*10000) / 10000 }
