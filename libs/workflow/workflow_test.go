package workflow

import (
	"testing"
	"time"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/evidence"
	"github.com/kora-finance/kora/libs/policy"
)

func TestApprovalEnforcesSegregationAndHumanActor(t *testing.T) {
	store := NewStore()
	rules := policy.DefaultSME("org-1")
	creator := actor("creator", access.RoleFinanceOperator)
	task, err := store.Create(creator, taskFixture(1_000), rules)
	if err != nil {
		t.Fatal(err)
	}
	if _, err = store.Assign(ActorContext{Actor: creator, Human: true}, task.ID, access.RoleFinanceLead, proof()); err != nil {
		t.Fatal(err)
	}
	if _, err = store.Approve(ActorContext{Actor: creator, Human: true}, task.ID, rules, proof()); err == nil {
		t.Fatal("expected creator self-approval to fail")
	}
	lead := actor("lead", access.RoleFinanceLead)
	if _, err = store.Approve(ActorContext{Actor: lead, Human: false}, task.ID, rules, proof()); err == nil {
		t.Fatal("expected agent approval to fail")
	}
	approved, err := store.Approve(ActorContext{Actor: lead, Human: true}, task.ID, rules, proof())
	if err != nil || approved.State != Approved {
		t.Fatalf("expected human approval: task=%+v err=%v", approved, err)
	}
}

func TestTwoDistinctApproversAndImmutableHistory(t *testing.T) {
	store := NewStore()
	rules := policy.DefaultSME("org-1")
	creator := actor("creator", access.RoleFinanceOperator)
	task := taskFixture(rules.TwoApproverThresholdMinor + 1)
	created, err := store.Create(creator, task, rules)
	if err != nil {
		t.Fatal(err)
	}
	if created.RequiredApprovers != 2 {
		t.Fatalf("expected two approvers, got %d", created.RequiredApprovers)
	}
	if _, err = store.Assign(ActorContext{Actor: creator, Human: true}, created.ID, access.RoleOrganizationOwner, proof()); err != nil {
		t.Fatal(err)
	}
	owner1 := actor("owner-1", access.RoleOrganizationOwner)
	pending, err := store.Approve(ActorContext{Actor: owner1, Human: true}, created.ID, rules, proof())
	if err != nil || pending.State != Assigned || len(pending.ApproverUserIDs) != 1 {
		t.Fatalf("expected one pending approval: task=%+v err=%v", pending, err)
	}
	if _, err = store.Approve(ActorContext{Actor: owner1, Human: true}, created.ID, rules, proof()); err == nil {
		t.Fatal("expected duplicate approver to fail")
	}
	owner2 := actor("owner-2", access.RoleOrganizationOwner)
	approved, err := store.Approve(ActorContext{Actor: owner2, Human: true}, created.ID, rules, proof())
	if err != nil || approved.State != Approved {
		t.Fatalf("expected second approval: task=%+v err=%v", approved, err)
	}
	history, err := store.History("org-1", created.ID)
	if err != nil || len(history) != 3 {
		t.Fatalf("expected append-only transitions: history=%+v err=%v", history, err)
	}
	history[0].To = Rejected
	fresh, _ := store.History("org-1", created.ID)
	if fresh[0].To == Rejected {
		t.Fatal("returned history must not mutate stored history")
	}
}

func TestApprovalLimitAndTenantBoundary(t *testing.T) {
	store := NewStore()
	rules := policy.DefaultSME("org-1")
	creator := actor("creator", access.RoleFinanceOperator)
	task, _ := store.Create(creator, taskFixture(10_000_001), rules)
	_, _ = store.Assign(ActorContext{Actor: creator, Human: true}, task.ID, access.RoleOrganizationOwner, proof())
	lead := actor("lead", access.RoleFinanceLead)
	if _, err := store.Approve(ActorContext{Actor: lead, Human: true}, task.ID, rules, proof()); err == nil {
		t.Fatal("expected finance lead limit to reject approval")
	}
	if _, err := store.Get("org-2", task.ID); err == nil {
		t.Fatal("expected cross-tenant task read to fail")
	}
}

func actor(id string, role access.Role) access.Actor {
	return access.Actor{UserID: id, OrganizationID: "org-1", Roles: []access.Role{role}}
}

func taskFixture(amount int64) Task {
	return Task{OrganizationID: "org-1", SuggestedAction: "post_reconciled_payment", AmountMinor: amount, Currency: "RWF", Deadline: time.Now().Add(time.Hour), Evidence: proof()}
}

func proof() evidence.Evidence {
	return evidence.Evidence{SourceDocumentID: "doc-1", SourceRecordID: "row-1", IngestionBatchID: "batch-1", ExtractionVersionID: "version-1", Reason: "verified fixture", ConfidenceScore: .99}
}
