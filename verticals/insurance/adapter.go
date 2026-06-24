package insurance

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"sort"
	"strings"

	"github.com/kora-finance/kora/libs/entities"
	"github.com/kora-finance/kora/libs/eventledger"
	"github.com/kora-finance/kora/libs/evidence"
	"github.com/kora-finance/kora/libs/ingestion"
	"github.com/kora-finance/kora/libs/normalization"
	"github.com/kora-finance/kora/libs/policy"
	"github.com/kora-finance/kora/libs/reconciliation"
)

type RecordType string

const (
	Policy          RecordType = "policy"
	Claim           RecordType = "claim"
	Broker          RecordType = "broker"
	Premium         RecordType = "premium"
	ClaimPayment    RecordType = "claim_payment"
	Commission      RecordType = "commission"
	SupplierPayment RecordType = "supplier_payment"
	BankCharge      RecordType = "bank_charge"
	Refund          RecordType = "refund"
)

type Input struct {
	OrganizationID string            `json:"organization_id"`
	RecordType     RecordType        `json:"record_type"`
	Fields         map[string]string `json:"fields"`
	Evidence       evidence.Evidence `json:"evidence"`
}

type Mapping struct {
	ID             string              `json:"id"`
	OrganizationID string              `json:"organization_id"`
	RecordType     RecordType          `json:"record_type"`
	Reference      string              `json:"reference"`
	Events         []eventledger.Event `json:"events"`
	Entities       []entities.Entity   `json:"entities"`
	RelatedIDs     map[string]string   `json:"related_ids"`
	QualityFlags   []string            `json:"quality_flags"`
	Evidence       evidence.Evidence   `json:"evidence"`
	Created        bool                `json:"created"`
}

type ImportTemplate struct {
	RecordType      RecordType `json:"record_type"`
	RequiredColumns []string   `json:"required_columns"`
	OptionalColumns []string   `json:"optional_columns"`
}

type Adapter struct {
	normalizer *normalization.Service
}

func NewAdapter(normalizer *normalization.Service) *Adapter {
	return &Adapter{normalizer: normalizer}
}

func (a *Adapter) Map(input Input) (Mapping, error) {
	if a == nil || a.normalizer == nil {
		return Mapping{}, errors.New("insurance adapter is not configured")
	}
	if input.OrganizationID == "" {
		return Mapping{}, errors.New("organization id is required")
	}
	if err := evidence.ValidateProvenance(input.Evidence); err != nil {
		return Mapping{}, err
	}
	fields := cloneMap(input.Fields)
	fields["vertical"] = "insurance"
	fields["insurance_record_type"] = string(input.RecordType)

	switch input.RecordType {
	case Policy:
		return a.mapPolicy(input, fields)
	case Claim:
		return a.mapClaim(input, fields)
	case Broker:
		return a.mapBroker(input, fields)
	case Premium:
		return a.mapPremium(input, fields)
	case ClaimPayment, Commission, SupplierPayment, BankCharge, Refund:
		return a.mapPayment(input, fields)
	default:
		return Mapping{}, fmt.Errorf("unsupported insurance record type %q", input.RecordType)
	}
}

func (a *Adapter) mapPolicy(input Input, fields map[string]string) (Mapping, error) {
	reference, err := require(fields, "policy_number")
	if err != nil {
		return Mapping{}, err
	}
	if _, err := require(fields, "customer_name"); err != nil {
		return Mapping{}, err
	}
	if _, err := require(fields, "effective_date"); err != nil {
		return Mapping{}, err
	}
	base := map[string]string{
		"reference":     reference,
		"party_name":    fields["customer_name"],
		"date":          fields["effective_date"],
		"policy_number": reference,
		"contract_link": reference,
		"vertical":      "insurance",
		"category":      "policy",
	}
	copyOptional(base, fields, "expiry_date", "broker_code", "product_code")
	contract, err := a.normalize(input, "contract", "policy-contract", base)
	if err != nil {
		return Mapping{}, err
	}
	results := []normalization.Result{contract}
	if strings.TrimSpace(fields["premium_amount"]) != "" {
		invoiceFields := cloneMap(base)
		invoiceFields["amount"] = fields["premium_amount"]
		invoiceFields["currency"] = fields["currency"]
		invoiceFields["date"] = firstNonEmpty(fields["invoice_date"], fields["effective_date"])
		invoiceFields["category"] = "premium_due"
		invoice, normalizeErr := a.normalize(input, "invoice", "policy-premium-invoice", invoiceFields)
		if normalizeErr != nil {
			return Mapping{}, normalizeErr
		}
		results = append(results, invoice)
	}
	return combine(input, reference, results, nil), nil
}

func (a *Adapter) mapClaim(input Input, fields map[string]string) (Mapping, error) {
	reference, err := require(fields, "claim_number")
	if err != nil {
		return Mapping{}, err
	}
	for _, name := range []string{"insured_name", "claim_date", "amount", "currency"} {
		if _, err := require(fields, name); err != nil {
			return Mapping{}, err
		}
	}
	claimFields := cloneMap(fields)
	claimFields["reference"] = reference
	claimFields["party_name"] = fields["insured_name"]
	claimFields["date"] = fields["claim_date"]
	claimFields["category"] = "claim"
	claimFields["obligation_link"] = reference
	result, err := a.normalize(input, "claim", "claim-obligation", claimFields)
	if err != nil {
		return Mapping{}, err
	}
	flags := []string{}
	if strings.TrimSpace(fields["approval_task_id"]) == "" {
		flags = append(flags, "unsupported-claim")
	}
	return combine(input, reference, []normalization.Result{result}, flags), nil
}

func (a *Adapter) mapBroker(input Input, fields map[string]string) (Mapping, error) {
	code, err := require(fields, "broker_code")
	if err != nil {
		return Mapping{}, err
	}
	name, err := require(fields, "broker_name")
	if err != nil {
		return Mapping{}, err
	}
	entity, created, err := a.normalizer.EntityResolver().Resolve(
		input.OrganizationID,
		entities.ExternalParty,
		entities.Candidate{
			DisplayName:       name,
			ExternalReference: code,
			Attributes: map[string]string{
				"role":        "BROKER",
				"vertical":    "insurance",
				"broker_code": code,
			},
		},
	)
	if err != nil {
		return Mapping{}, err
	}
	return Mapping{
		ID:             mappingID(input),
		OrganizationID: input.OrganizationID,
		RecordType:     Broker,
		Reference:      code,
		Entities:       []entities.Entity{entity},
		RelatedIDs:     map[string]string{"broker_external_party_id": entity.ID},
		QualityFlags:   []string{"complete"},
		Evidence:       input.Evidence,
		Created:        created,
	}, nil
}

func (a *Adapter) mapPremium(input Input, fields map[string]string) (Mapping, error) {
	reference, err := require(fields, "policy_number")
	if err != nil {
		return Mapping{}, err
	}
	for _, name := range []string{"payment_date", "amount", "currency", "payer_name"} {
		if _, err := require(fields, name); err != nil {
			return Mapping{}, err
		}
	}
	if strings.HasPrefix(strings.TrimSpace(fields["amount"]), "-") {
		return Mapping{}, errors.New("premium receipt amount must be positive")
	}
	premiumFields := cloneMap(fields)
	premiumFields["reference"] = reference
	premiumFields["party_name"] = fields["payer_name"]
	premiumFields["date"] = fields["payment_date"]
	premiumFields["category"] = "premium"
	premiumFields["contract_link"] = reference
	result, err := a.normalize(input, "premium", "premium-payment", premiumFields)
	if err != nil {
		return Mapping{}, err
	}
	return combine(input, reference, []normalization.Result{result}, nil), nil
}

func (a *Adapter) mapPayment(input Input, fields map[string]string) (Mapping, error) {
	reference, err := require(fields, "reference")
	if err != nil {
		return Mapping{}, err
	}
	for _, name := range []string{"date", "amount", "currency", "party_name"} {
		if _, err := require(fields, name); err != nil {
			return Mapping{}, err
		}
	}
	amount := strings.TrimSpace(fields["amount"])
	if input.RecordType == Refund {
		direction, directionErr := require(fields, "direction")
		if directionErr != nil {
			return Mapping{}, directionErr
		}
		if direction != "received" && direction != "sent" {
			return Mapping{}, errors.New("refund direction must be received or sent")
		}
		if (direction == "sent") != strings.HasPrefix(amount, "-") {
			return Mapping{}, errors.New("refund amount sign does not match direction")
		}
	} else if !strings.HasPrefix(amount, "-") {
		return Mapping{}, fmt.Errorf("%s amount must be negative", input.RecordType)
	}
	paymentFields := cloneMap(fields)
	paymentFields["category"] = string(input.RecordType)
	paymentFields["vertical"] = "insurance"
	if claimNumber := strings.TrimSpace(fields["claim_number"]); claimNumber != "" {
		paymentFields["obligation_link"] = claimNumber
	}
	result, err := a.normalize(input, "payment", string(input.RecordType)+"-payment", paymentFields)
	if err != nil {
		return Mapping{}, err
	}
	return combine(input, reference, []normalization.Result{result}, nil), nil
}

func (a *Adapter) normalize(input Input, recordType, suffix string, fields map[string]string) (normalization.Result, error) {
	confidence := input.Evidence.ConfidenceScore
	fieldConfidence := map[string]float64{}
	for name := range fields {
		fieldConfidence[name] = confidence
	}
	recordDBID := input.Evidence.SourceRecordID + "-" + suffix
	if input.Evidence.SourceRecordDBID != "" {
		recordDBID = input.Evidence.SourceRecordDBID + "-" + suffix
	}
	record := ingestion.SourceRecord{
		ID:                  recordDBID,
		OrganizationID:      input.OrganizationID,
		DocumentID:          input.Evidence.SourceDocumentID,
		ExtractionVersionID: input.Evidence.ExtractionVersionID,
		SourceRecordID:      input.Evidence.SourceRecordID + "-" + suffix,
		RecordType:          recordType,
		Fields:              fields,
		FieldConfidences:    fieldConfidence,
		Confidence:          confidence,
		SourceLocation: ingestion.SourceLocation{
			PageNumber: input.Evidence.SourcePage,
			RowNumber:  input.Evidence.SourceRow,
			SheetName:  input.Evidence.SourceSheet,
		},
		QualityFlags: []string{ingestion.QualityComplete},
	}
	return a.normalizer.Normalize(normalization.Input{
		IngestionBatchID: input.Evidence.IngestionBatchID,
		Record:           record,
	})
}

func combine(input Input, reference string, results []normalization.Result, flags []string) Mapping {
	events := make([]eventledger.Event, 0, len(results))
	entityByID := map[string]entities.Entity{}
	related := map[string]string{}
	created := false
	for _, result := range results {
		events = append(events, result.Event)
		created = created || result.Created
		for _, entity := range result.Entities {
			entityByID[entity.ID] = entity
			switch entity.Type {
			case entities.ExternalParty:
				related["customer_external_party_id"] = entity.ID
			case entities.Contract:
				related["contract_id"] = entity.ID
			case entities.Invoice:
				related["invoice_id"] = entity.ID
			case entities.Obligation:
				related["obligation_id"] = entity.ID
			case entities.Payment:
				related["payment_id"] = entity.ID
			}
		}
	}
	for _, event := range events {
		switch event.Type {
		case eventledger.PaymentReceived, eventledger.PaymentSent:
			related["payment_event_id"] = event.ID
		case eventledger.ObligationCreated:
			related["obligation_event_id"] = event.ID
		case eventledger.InvoiceIssued:
			related["invoice_event_id"] = event.ID
		case eventledger.ContractSigned:
			related["contract_event_id"] = event.ID
		}
	}
	copyRelatedField(related, input.Fields, "approval_task_id")
	copyRelatedField(related, input.Fields, "ledger_entry_id")
	copyRelatedField(related, input.Fields, "policy_id")
	entitiesOut := make([]entities.Entity, 0, len(entityByID))
	for _, entity := range entityByID {
		entitiesOut = append(entitiesOut, entity)
	}
	sort.Slice(entitiesOut, func(i, j int) bool { return entitiesOut[i].ID < entitiesOut[j].ID })
	quality := append([]string{"complete"}, flags...)
	return Mapping{
		ID:             mappingID(input),
		OrganizationID: input.OrganizationID,
		RecordType:     input.RecordType,
		Reference:      reference,
		Events:         events,
		Entities:       entitiesOut,
		RelatedIDs:     related,
		QualityFlags:   quality,
		Evidence:       input.Evidence,
		Created:        created,
	}
}

func mappingID(input Input) string {
	payload := strings.Join([]string{
		input.OrganizationID,
		string(input.RecordType),
		input.Evidence.SourceDocumentID,
		input.Evidence.ExtractionVersionID,
		input.Evidence.SourceRecordID,
	}, "\x00")
	digest := sha256.Sum256([]byte(payload))
	return "insmap_" + hex.EncodeToString(digest[:12])
}

func ImportTemplates() []ImportTemplate {
	return []ImportTemplate{
		{Policy, []string{"policy_number", "customer_name", "effective_date"}, []string{"expiry_date", "premium_amount", "currency", "broker_code", "product_code"}},
		{Claim, []string{"claim_number", "insured_name", "claim_date", "amount", "currency"}, []string{"policy_number", "approval_task_id", "payment_event_id", "ledger_entry_id"}},
		{Broker, []string{"broker_code", "broker_name"}, []string{"tax_id", "phone", "email"}},
		{Premium, []string{"policy_number", "payment_date", "amount", "currency", "payer_name"}, []string{"broker_code", "account_number"}},
		{ClaimPayment, []string{"reference", "date", "amount", "currency", "party_name"}, []string{"claim_number", "approval_task_id", "account_number"}},
		{Commission, []string{"reference", "date", "amount", "currency", "party_name"}, []string{"policy_number", "broker_code"}},
		{SupplierPayment, []string{"reference", "date", "amount", "currency", "party_name"}, []string{"invoice_number", "account_number"}},
		{BankCharge, []string{"reference", "date", "amount", "currency", "party_name"}, []string{"account_number"}},
		{Refund, []string{"reference", "date", "amount", "currency", "party_name", "direction"}, []string{"policy_number", "claim_number"}},
	}
}

func require(fields map[string]string, name string) (string, error) {
	value := strings.TrimSpace(fields[name])
	if value == "" {
		return "", fmt.Errorf("%s is required", name)
	}
	return value, nil
}

func cloneMap(input map[string]string) map[string]string {
	output := map[string]string{}
	for key, value := range input {
		output[key] = strings.TrimSpace(value)
	}
	return output
}

func copyOptional(target, source map[string]string, names ...string) {
	for _, name := range names {
		if value := strings.TrimSpace(source[name]); value != "" {
			target[name] = value
		}
	}
}

func copyRelatedField(target, source map[string]string, name string) {
	if value := strings.TrimSpace(source[name]); value != "" {
		target[name] = value
	}
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func ReconcileEvents(organizationID string, mappings []Mapping, rules policy.Policy) (reconciliation.Result, error) {
	events := []eventledger.Event{}
	for _, mapping := range mappings {
		if mapping.OrganizationID != organizationID {
			return reconciliation.Result{}, errors.New("cross-tenant insurance mapping denied")
		}
		events = append(events, mapping.Events...)
	}
	return reconciliation.Reconcile(organizationID, events, rules)
}
