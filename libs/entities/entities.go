package entities

import (
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"sort"
	"strings"
	"sync"
	"time"
	"unicode"
)

type Type string

const (
	ExternalParty Type = "EXTERNAL_PARTY"
	Account       Type = "ACCOUNT"
	Document      Type = "DOCUMENT"
	Contract      Type = "CONTRACT"
	Invoice       Type = "INVOICE"
	Bill          Type = "BILL"
	Receipt       Type = "RECEIPT"
	Payment       Type = "PAYMENT"
	Transaction   Type = "TRANSACTION"
	Obligation    Type = "OBLIGATION"
)

var validTypes = map[Type]bool{
	ExternalParty: true,
	Account:       true,
	Document:      true,
	Contract:      true,
	Invoice:       true,
	Bill:          true,
	Receipt:       true,
	Payment:       true,
	Transaction:   true,
	Obligation:    true,
}

type Candidate struct {
	DisplayName       string            `json:"display_name"`
	ExternalReference string            `json:"external_reference"`
	AccountNumber     string            `json:"account_number"`
	Attributes        map[string]string `json:"attributes"`
}

type Entity struct {
	ID                   string            `json:"id"`
	OrganizationID       string            `json:"organization_id"`
	Type                 Type              `json:"type"`
	CanonicalKey         string            `json:"canonical_key"`
	DisplayName          string            `json:"display_name"`
	ExternalReference    string            `json:"external_reference"`
	ResolutionMethod     string            `json:"resolution_method"`
	ResolutionConfidence float64           `json:"resolution_confidence"`
	Attributes           map[string]string `json:"attributes"`
	CreatedAt            time.Time         `json:"created_at"`
}

type Resolver struct {
	mu       sync.RWMutex
	byKey    map[string]Entity
	byID     map[string]Entity
	byTenant map[string][]string
}

func NewResolver() *Resolver {
	return &Resolver{
		byKey:    map[string]Entity{},
		byID:     map[string]Entity{},
		byTenant: map[string][]string{},
	}
}

func (r *Resolver) Resolve(organizationID string, entityType Type, candidate Candidate) (Entity, bool, error) {
	if organizationID == "" {
		return Entity{}, false, errors.New("organization id is required")
	}
	if !validTypes[entityType] {
		return Entity{}, false, fmt.Errorf("unsupported entity type %q", entityType)
	}
	canonicalKey, resolutionMethod, resolutionConfidence, err := canonicalKey(entityType, candidate)
	if err != nil {
		return Entity{}, false, err
	}
	storeKey := organizationID + ":" + canonicalKey

	r.mu.Lock()
	defer r.mu.Unlock()
	if existing, ok := r.byKey[storeKey]; ok {
		return clone(existing), false, nil
	}

	entity := Entity{
		ID:                   newID("ent"),
		OrganizationID:       organizationID,
		Type:                 entityType,
		CanonicalKey:         canonicalKey,
		DisplayName:          strings.TrimSpace(candidate.DisplayName),
		ExternalReference:    strings.TrimSpace(candidate.ExternalReference),
		ResolutionMethod:     resolutionMethod,
		ResolutionConfidence: resolutionConfidence,
		Attributes:           cloneMap(candidate.Attributes),
		CreatedAt:            time.Now().UTC(),
	}
	r.byKey[storeKey] = entity
	r.byID[entity.ID] = entity
	r.byTenant[organizationID] = append(r.byTenant[organizationID], entity.ID)
	return clone(entity), true, nil
}

func (r *Resolver) Get(organizationID string, entityID string) (Entity, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()
	entity, ok := r.byID[entityID]
	if !ok || entity.OrganizationID != organizationID {
		return Entity{}, errors.New("entity not found")
	}
	return clone(entity), nil
}

func (r *Resolver) List(organizationID string) []Entity {
	r.mu.RLock()
	defer r.mu.RUnlock()
	ids := append([]string(nil), r.byTenant[organizationID]...)
	entities := make([]Entity, 0, len(ids))
	for _, id := range ids {
		entities = append(entities, clone(r.byID[id]))
	}
	sort.SliceStable(entities, func(i, j int) bool { return entities[i].CreatedAt.Before(entities[j].CreatedAt) })
	return entities
}

func canonicalKey(entityType Type, candidate Candidate) (string, string, float64, error) {
	attributes := candidate.Attributes
	identifiers := []struct {
		kind       string
		value      string
		confidence float64
	}{
		{"tax_id", attributes["tax_id"], 0.99},
		{"registration_number", attributes["registration_number"], 0.98},
		{"account_number", candidate.AccountNumber, 0.99},
		{"external_reference", candidate.ExternalReference, 0.97},
	}
	if entityType == ExternalParty {
		identifiers = append(identifiers, struct {
			kind       string
			value      string
			confidence float64
		}{"normalized_name", candidate.DisplayName, 0.80})
	}
	for _, identifier := range identifiers {
		if normalized := normalize(identifier.value); normalized != "" {
			return strings.ToLower(string(entityType)) + ":" + identifier.kind + ":" + normalized, identifier.kind, identifier.confidence, nil
		}
	}
	return "", "", 0, fmt.Errorf("%s resolution requires a stable identifier", entityType)
}

func normalize(value string) string {
	return strings.Map(func(r rune) rune {
		switch {
		case unicode.IsLetter(r), unicode.IsNumber(r):
			return unicode.ToLower(r)
		default:
			return -1
		}
	}, strings.TrimSpace(value))
}

func clone(entity Entity) Entity {
	entity.Attributes = cloneMap(entity.Attributes)
	return entity
}

func cloneMap(input map[string]string) map[string]string {
	output := map[string]string{}
	for key, value := range input {
		output[key] = value
	}
	return output
}

func newID(prefix string) string {
	var value [8]byte
	if _, err := rand.Read(value[:]); err != nil {
		panic(err)
	}
	return prefix + "_" + hex.EncodeToString(value[:])
}
