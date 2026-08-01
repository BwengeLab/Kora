package httpapi

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"
)

var liveAgentNames = map[string]string{
	"a-intake": "data_intake_live", "a-recon": "reconciliation_live",
	"a-cfo": "finance_live", "a-rel": "relationship_live",
	"a-contract": "contract_live", "a-coll": "collections_live",
	"a-credit": "credit_live", "a-supplier": "supplier_live",
	"a-sales": "sales_live", "a-audit": "audit_live",
}

type liveAgentRuntimeResponse struct {
	RunID         string `json:"run_id"`
	ExternalModel bool   `json:"external_model"`
	Output        struct {
		Refused       bool           `json:"refused"`
		RefusalReason string         `json:"refusal_reason"`
		Metadata      map[string]any `json:"metadata"`
	} `json:"output"`
}

type liveAgentInsight struct {
	RunID       string
	Explanation string
	Model       string
}

func (s *Server) runLiveAgent(r *http.Request, organizationID, userID, agentID, summary string) (liveAgentInsight, error) {
	if s.agentRuntimeURL == "" {
		return liveAgentInsight{}, errors.New("KORA_AGENT_RUNTIME_URL is not configured")
	}
	agentName := liveAgentNames[agentID]
	if agentName == "" {
		return liveAgentInsight{}, errors.New("agent is not registered in the live runtime")
	}
	now := time.Now().UTC()
	payload := map[string]any{
		"organization_id":                   organizationID,
		"user_id":                           userID,
		"agent_name":                        agentName,
		"objective":                         "Explain the latest deterministic Kora analysis for a finance user",
		"context":                           map[string]any{"deterministic_summary": summary},
		"estimated_complexity":              "low",
		"contains_sensitive_financial_data": false,
		"external_models_allowed":           true,
		"idempotency_key":                   fmt.Sprintf("ui-%s-%d", agentID, now.UnixNano()),
		"evidence": []map[string]any{{
			"source_document_id":    "agent-analysis-" + agentID,
			"source_record_id":      agentID,
			"transaction_reference": "",
			"occurred_on":           now.Format("2006-01-02"),
			"confidence":            map[string]any{"score": 0.9, "tier": "suggested", "method": "postgres-deterministic-analysis", "calibration_version": "v1"},
			"reason":                "Deterministic Postgres analysis for " + agentID + " on organization " + organizationID,
			"ingestion_batch_id":    "live-agent-run-" + organizationID,
			"extraction_version_id": "agent-v1",
		}},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return liveAgentInsight{}, err
	}
	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost, s.agentRuntimeURL+"/v1/agent-runs", bytes.NewReader(body))
	if err != nil {
		return liveAgentInsight{}, err
	}
	req.Header.Set("Content-Type", "application/json")
	if authz := r.Header.Get("Authorization"); authz != "" {
		req.Header.Set("Authorization", authz)
	}
	if s.agentRuntimeToken != "" {
		req.Header.Set("X-Kora-Internal-Token", s.agentRuntimeToken)
	}
	response, err := s.httpClient.Do(req)
	if err != nil {
		return liveAgentInsight{}, err
	}
	defer response.Body.Close()
	if response.StatusCode != http.StatusOK {
		return liveAgentInsight{}, fmt.Errorf("runtime returned HTTP %d", response.StatusCode)
	}
	var result liveAgentRuntimeResponse
	if err := json.NewDecoder(response.Body).Decode(&result); err != nil {
		return liveAgentInsight{}, err
	}
	if result.Output.Refused {
		return liveAgentInsight{}, errors.New(result.Output.RefusalReason)
	}
	status, _ := result.Output.Metadata["model_status"].(string)
	if !result.ExternalModel || status != "completed" {
		return liveAgentInsight{}, fmt.Errorf("model did not complete (status %s)", status)
	}
	explanation, _ := result.Output.Metadata["explanation"].(string)
	model, _ := result.Output.Metadata["model_name"].(string)
	if strings.TrimSpace(explanation) == "" || result.RunID == "" {
		return liveAgentInsight{}, errors.New("runtime returned an incomplete result")
	}
	return liveAgentInsight{RunID: result.RunID, Explanation: explanation, Model: model}, nil
}

func (s *Server) agentSummaryFromDB(agentID, orgID string) (string, string) {
	// Get agent insight from database
	result := s.queryAgentInsight(orgID, agentID)
	if result != nil {
		return result.insight, "Agent"
	}
	return "", "Agent"
}

func (s *Server) applyLiveAgentInsightFromDB(agentID, agentName string, insight liveAgentInsight, orgID string) error {
	if s.db == nil {
		return fmt.Errorf("database not connected")
	}
	
	now := time.Now().UTC()
	
	// Log the live agent insight to activity log
	_, err := s.db.Exec(`
		INSERT INTO agent_activity_log (id, organization_id, agent_id, action, detail, tone, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`,
		fmt.Sprintf("la-%s", insight.RunID),
		orgID,
		agentID,
		"Live AI analysis completed",
		insight.Explanation,
		"ai",
		now,
	)
	
	return err
}
