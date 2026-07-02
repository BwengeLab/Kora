package relationships

import (
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"sort"
	"strings"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/entities"
	"github.com/kora-finance/kora/libs/eventledger"
	"github.com/kora-finance/kora/libs/evidence"
)

type Node struct {
	ID             string            `json:"id"`
	OrganizationID string            `json:"organization_id"`
	Type           string            `json:"type"`
	Label          string            `json:"label"`
	Attributes     map[string]string `json:"attributes"`
}

type Edge struct {
	ID             string            `json:"id"`
	OrganizationID string            `json:"organization_id"`
	FromNodeID     string            `json:"from_node_id"`
	ToNodeID       string            `json:"to_node_id"`
	Type           string            `json:"type"`
	Evidence       evidence.Evidence `json:"evidence"`
}

type Graph struct {
	OrganizationID string `json:"organization_id"`
	Nodes          []Node `json:"nodes"`
	Edges          []Edge `json:"edges"`
}

type Input struct {
	OrganizationID string                  `json:"organization_id"`
	Entities       []entities.Entity       `json:"entities"`
	Events         []eventledger.EventView `json:"events"`
}

func Build(actor access.Actor, input Input) (Graph, error) {
	if err := access.Authorize(actor, access.Resource{OrganizationID: input.OrganizationID}, access.PermissionManageRelationships); err != nil {
		return Graph{}, err
	}
	if input.OrganizationID == "" {
		return Graph{}, errors.New("organization is required")
	}
	graph := Graph{OrganizationID: input.OrganizationID}
	seen := map[string]bool{}
	for _, entity := range input.Entities {
		if entity.OrganizationID != input.OrganizationID {
			return Graph{}, errors.New("cross-tenant relationship entity denied")
		}
		graph.Nodes = append(graph.Nodes, Node{ID: entity.ID, OrganizationID: input.OrganizationID, Type: string(entity.Type), Label: entity.DisplayName, Attributes: cloneMap(entity.Attributes)})
		seen[entity.ID] = true
	}
	for _, view := range input.Events {
		if view.OrganizationID != input.OrganizationID {
			return Graph{}, errors.New("cross-tenant relationship event denied")
		}
		if err := eventledger.Validate(view.Event); err != nil {
			return Graph{}, err
		}
		eventNodeID := "event:" + view.ID
		if !seen[eventNodeID] {
			graph.Nodes = append(graph.Nodes, Node{ID: eventNodeID, OrganizationID: input.OrganizationID, Type: string(view.Type), Label: string(view.Type), Attributes: cloneMap(view.Attributes)})
			seen[eventNodeID] = true
		}
		if view.ExternalPartyID != "" {
			graph.Edges = append(graph.Edges, edge(input.OrganizationID, view.ExternalPartyID, eventNodeID, "PARTY_EVENT", view.Evidence))
		}
		for relationType, nodeID := range view.RelatedEntityIDs {
			if strings.TrimSpace(nodeID) != "" {
				graph.Edges = append(graph.Edges, edge(input.OrganizationID, eventNodeID, nodeID, "EVENT_"+strings.ToUpper(relationType), view.Evidence))
			}
		}
	}
	sort.SliceStable(graph.Nodes, func(i, j int) bool { return graph.Nodes[i].ID < graph.Nodes[j].ID })
	sort.SliceStable(graph.Edges, func(i, j int) bool { return graph.Edges[i].ID < graph.Edges[j].ID })
	return graph, nil
}

func edge(org, from, to, kind string, proof evidence.Evidence) Edge {
	return Edge{ID: stableID(org, from, to, kind, proof.SourceRecordID), OrganizationID: org, FromNodeID: from, ToNodeID: to, Type: kind, Evidence: proof}
}

func stableID(values ...string) string {
	payload, err := json.Marshal(values)
	if err != nil {
		panic(err)
	}
	sum := sha256.Sum256(payload)
	return "rel_" + hex.EncodeToString(sum[:10])
}

func cloneMap(input map[string]string) map[string]string {
	out := map[string]string{}
	for key, value := range input {
		out[key] = value
	}
	return out
}
