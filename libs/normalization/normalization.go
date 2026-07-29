package normalization

import (
	"errors"
	"fmt"
	"math"
	"strconv"
	"strings"

	"github.com/kora-finance/kora/libs/entities"
	"github.com/kora-finance/kora/libs/eventledger"
	"github.com/kora-finance/kora/libs/evidence"
	"github.com/kora-finance/kora/libs/ingestion"
)

type Input struct {
	IngestionBatchID string                 `json:"ingestion_batch_id"`
	Record           ingestion.SourceRecord `json:"record"`
}

type Result struct {
	Event    eventledger.Event `json:"event"`
	Entities []entities.Entity `json:"entities"`
	Created  bool              `json:"created"`
}

type Service struct {
	resolver entities.Store
	events   eventledger.Store
}

func NewService(resolver entities.Store, events eventledger.Store) *Service {
	return &Service{resolver: resolver, events: events}
}

func (s *Service) Normalize(input Input) (Result, error) {
	record := input.Record
	if record.OrganizationID == "" {
		return Result{}, errors.New("source record organization is required")
	}
	if input.IngestionBatchID == "" {
		return Result{}, errors.New("ingestion batch id is required")
	}
	if record.DocumentID == "" || record.ExtractionVersionID == "" || record.SourceRecordID == "" {
		return Result{}, errors.New("source record provenance is incomplete")
	}
	if record.Confidence <= 0 || record.Confidence > 1 {
		return Result{}, errors.New("source record confidence must be between 0 and 1")
	}
	if !isTrusted(record.QualityFlags) {
		return Result{}, errors.New("source record requires review before normalization")
	}

	eventType, domainType, category, err := classify(record.RecordType, record.Fields["amount"])
	if err != nil {
		return Result{}, err
	}
	resolved, related, err := s.resolveEntities(record, domainType)
	if err != nil {
		return Result{}, err
	}

	precision := currencyPrecision(record.Fields["currency"])
	amountMinor, err := parseMinorUnits(record.Fields["amount"], precision)
	if err != nil && eventType != eventledger.ContractSigned {
		return Result{}, err
	}
	proof := evidence.Evidence{
		SourceDocumentID:     record.DocumentID,
		SourceRecordID:       record.SourceRecordID,
		SourceRecordDBID:     record.ID,
		IngestionBatchID:     input.IngestionBatchID,
		ExtractionVersionID:  record.ExtractionVersionID,
		TransactionReference: record.Fields["reference"],
		OccurredOn:           record.Fields["date"],
		AmountMinor:          amountMinor,
		Currency:             strings.ToUpper(record.Fields["currency"]),
		Precision:            precision,
		Reason:               "normalized from versioned extracted source record",
		ConfidenceScore:      record.Confidence,
		ConfidenceMethod:     "document-extraction",
		SourcePage:           record.SourceLocation.PageNumber,
		SourceRow:            record.SourceLocation.RowNumber,
		SourceSheet:          record.SourceLocation.SheetName,
	}
	attributes := cloneMap(record.Fields)
	attributes["raw_record_type"] = strings.ToLower(record.RecordType)
	if category != "" {
		attributes["category"] = category
	}

	event := eventledger.Event{
		OrganizationID:   record.OrganizationID,
		Type:             eventType,
		Status:           eventledger.Active,
		ExternalPartyID:  related[string(entities.ExternalParty)],
		AccountID:        related[string(entities.Account)],
		SourceEntityID:   related[string(domainType)],
		RelatedEntityIDs: related,
		Evidence:         proof,
		Attributes:       attributes,
	}
	appended, err := s.events.Append(event)
	if err != nil {
		return Result{}, err
	}
	return Result{Event: appended.Event, Entities: resolved, Created: appended.Created}, nil
}

func (s *Service) EventStore() eventledger.Store {
	return s.events
}

func (s *Service) EntityResolver() entities.Store {
	return s.resolver
}

func (s *Service) resolveEntities(record ingestion.SourceRecord, domainType entities.Type) ([]entities.Entity, map[string]string, error) {
	reference := strings.TrimSpace(record.Fields["reference"])
	if reference == "" {
		return nil, nil, errors.New("source record reference is required for entity resolution")
	}
	resolved := make([]entities.Entity, 0, 4)
	related := map[string]string{}
	resolve := func(entityType entities.Type, candidate entities.Candidate) error {
		entity, _, err := s.resolver.Resolve(record.OrganizationID, entityType, candidate)
		if err != nil {
			return err
		}
		resolved = append(resolved, entity)
		related[string(entityType)] = entity.ID
		return nil
	}

	if err := resolve(entities.Document, entities.Candidate{ExternalReference: record.DocumentID, DisplayName: record.DocumentID}); err != nil {
		return nil, nil, err
	}
	if party := strings.TrimSpace(record.Fields["party_name"]); party != "" {
		if err := resolve(entities.ExternalParty, entities.Candidate{DisplayName: party}); err != nil {
			return nil, nil, err
		}
	}
	if account := firstNonEmpty(record.Fields["account_number"], record.Fields["account"]); account != "" {
		if err := resolve(entities.Account, entities.Candidate{AccountNumber: account, DisplayName: account}); err != nil {
			return nil, nil, err
		}
	}
	if err := resolve(domainType, entities.Candidate{ExternalReference: reference, DisplayName: reference}); err != nil {
		return nil, nil, err
	}
	return resolved, related, nil
}

func classify(recordType string, amount string) (eventledger.EventType, entities.Type, string, error) {
	switch strings.ToLower(strings.TrimSpace(recordType)) {
	case "transaction":
		return eventledger.TransactionObserved, entities.Transaction, "", nil
	case "payment":
		if strings.HasPrefix(strings.TrimSpace(amount), "-") {
			return eventledger.PaymentSent, entities.Payment, "", nil
		}
		return eventledger.PaymentReceived, entities.Payment, "", nil
	case "invoice":
		return eventledger.InvoiceIssued, entities.Invoice, "", nil
	case "bill":
		return eventledger.BillReceived, entities.Bill, "", nil
	case "receipt":
		return eventledger.ReceiptRecorded, entities.Receipt, "", nil
	case "contract":
		return eventledger.ContractSigned, entities.Contract, "", nil
	case "premium":
		return eventledger.PaymentReceived, entities.Payment, "premium", nil
	case "claim":
		return eventledger.ObligationCreated, entities.Obligation, "claim", nil
	default:
		return "", "", "", fmt.Errorf("unsupported source record type %q", recordType)
	}
}

func parseMinorUnits(value string, precision int) (int64, error) {
	value = strings.TrimSpace(value)
	if value == "" {
		return 0, errors.New("amount is required")
	}
	negative := strings.HasPrefix(value, "-")
	value = strings.TrimPrefix(value, "-")
	parts := strings.Split(value, ".")
	if len(parts) > 2 || parts[0] == "" {
		return 0, errors.New("amount format is invalid")
	}
	whole, err := strconv.ParseInt(parts[0], 10, 64)
	if err != nil {
		return 0, errors.New("amount format is invalid")
	}
	fraction := ""
	if len(parts) == 2 {
		fraction = parts[1]
	}
	if len(fraction) > precision {
		return 0, errors.New("amount has more precision than its currency allows")
	}
	fraction += strings.Repeat("0", precision-len(fraction))
	fractionValue := int64(0)
	if fraction != "" {
		fractionValue, err = strconv.ParseInt(fraction, 10, 64)
		if err != nil {
			return 0, errors.New("amount format is invalid")
		}
	}
	scale := int64(1)
	for range precision {
		scale *= 10
	}
	if whole > math.MaxInt64/scale {
		return 0, errors.New("amount exceeds supported range")
	}
	minor := whole*scale + fractionValue
	if minor < whole*scale {
		return 0, errors.New("amount exceeds supported range")
	}
	if negative {
		minor = -minor
	}
	return minor, nil
}

func currencyPrecision(currency string) int {
	switch strings.ToUpper(strings.TrimSpace(currency)) {
	case "RWF", "UGX", "JPY":
		return 0
	default:
		return 2
	}
}

func isTrusted(flags []string) bool {
	complete := false
	for _, flag := range flags {
		if flag == ingestion.QualityComplete {
			complete = true
		}
		switch flag {
		case ingestion.QualityIncomplete, ingestion.QualityDuplicateRisk, ingestion.QualityLowConfidence, ingestion.QualityNeedsReview, ingestion.QualitySourceConflict:
			return false
		}
	}
	return complete
}

func firstNonEmpty(values ...string) string {
	for _, value := range values {
		if strings.TrimSpace(value) != "" {
			return strings.TrimSpace(value)
		}
	}
	return ""
}

func cloneMap(input map[string]string) map[string]string {
	output := map[string]string{}
	for key, value := range input {
		output[key] = value
	}
	return output
}
