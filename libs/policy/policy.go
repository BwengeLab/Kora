package policy

import (
	"errors"
	"time"
)

type Scope string

const (
	ScopeDefault        Scope = "default"
	ScopeSME            Scope = "sme"
	ScopeInsurance      Scope = "insurance"
	ScopeReconciliation Scope = "reconciliation"
	ScopeApproval       Scope = "approval"
	ScopeCreditSharing  Scope = "credit_sharing"
)

type Policy struct {
	ID                        string
	OrganizationID            string
	Scope                     Scope
	Version                   int
	AutoMatchThreshold        float64
	SuggestedMatchThreshold   float64
	DuplicateWindowDays       int
	PaymentToleranceMinor     int64
	Currency                  string
	ApprovalLimitsMinor       map[string]int64
	TwoApproverThresholdMinor int64
	RequiredEvidenceFields    []string
	AgingBucketsDays          []int
	RenewalAlertDays          int
	RiskRules                 map[string]string
	SharingScopes             map[string]string
	CreatedBy                 string
	CreatedAt                 time.Time
}

type AuditEvent struct {
	OrganizationID string
	ActorUserID    string
	Action         string
	PolicyID       string
	Version        int
	CreatedAt      time.Time
}

type Store interface {
	Latest(organizationID string, scope Scope) (Policy, error)
	Save(policy Policy, audit AuditEvent) (Policy, error)
	AuditTrail(organizationID string, policyID string) ([]AuditEvent, error)
}

func DefaultSME(organizationID string) Policy {
	return Policy{
		ID:                      "default-sme",
		OrganizationID:          organizationID,
		Scope:                   ScopeSME,
		Version:                 1,
		AutoMatchThreshold:      0.95,
		SuggestedMatchThreshold: 0.70,
		DuplicateWindowDays:     7,
		PaymentToleranceMinor:   100,
		Currency:                "RWF",
		ApprovalLimitsMinor: map[string]int64{
			"FINANCE_OPERATOR":   0,
			"FINANCE_LEAD":       10_000_000,
			"ORGANIZATION_OWNER": 100_000_000,
		},
		TwoApproverThresholdMinor: 10_000_000,
		RequiredEvidenceFields:    []string{"source_document_id", "source_record_id", "reason", "confidence"},
		AgingBucketsDays:          []int{0, 30, 60, 90},
		RenewalAlertDays:          30,
		RiskRules:                 map[string]string{"supplier_price_jump_percent": "10"},
		SharingScopes:             map[string]string{"credit_passport": "consent_required"},
	}
}

func DefaultInsurance(organizationID string) Policy {
	p := DefaultSME(organizationID)
	p.ID = "default-insurance"
	p.Scope = ScopeInsurance
	p.AutoMatchThreshold = 0.97
	p.SuggestedMatchThreshold = 0.75
	p.DuplicateWindowDays = 14
	p.RenewalAlertDays = 60
	p.RequiredEvidenceFields = append(p.RequiredEvidenceFields, "transaction_reference")
	p.RiskRules["claim_without_approval"] = "block_posting"
	return p
}

func Validate(p Policy) error {
	if p.OrganizationID == "" {
		return errors.New("organization id is required")
	}
	if p.Scope == "" {
		return errors.New("policy scope is required")
	}
	if p.AutoMatchThreshold <= 0 || p.AutoMatchThreshold > 1 {
		return errors.New("auto match threshold must be between 0 and 1")
	}
	if p.SuggestedMatchThreshold <= 0 || p.SuggestedMatchThreshold > 1 {
		return errors.New("suggested match threshold must be between 0 and 1")
	}
	if p.SuggestedMatchThreshold >= p.AutoMatchThreshold {
		return errors.New("suggested threshold must be below auto threshold")
	}
	if p.DuplicateWindowDays < 0 {
		return errors.New("duplicate window cannot be negative")
	}
	if p.Currency == "" {
		return errors.New("currency is required")
	}
	if p.TwoApproverThresholdMinor <= 0 {
		return errors.New("two approver threshold must be positive")
	}
	if len(p.RequiredEvidenceFields) == 0 {
		return errors.New("required evidence fields are required")
	}
	return nil
}

func Tier(score float64, p Policy) string {
	switch {
	case score >= p.AutoMatchThreshold:
		return "auto"
	case score >= p.SuggestedMatchThreshold:
		return "suggested"
	default:
		return "review"
	}
}
