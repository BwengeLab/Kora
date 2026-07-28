package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"
)

func TestRunLiveAgentRequiresCompletedExternalModel(t *testing.T) {
	runtime := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("Authorization") != "Bearer signed" || r.Header.Get("X-Kora-Internal-Token") != "internal" {
			t.Fatal("gateway did not forward runtime authentication")
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"run_id": "agent_run_live", "external_model": true,
			"output": map[string]any{"refused": false, "metadata": map[string]any{
				"model_status": "completed", "model_name": "llama-test", "explanation": "Live grounded result.",
			}},
		})
	}))
	defer runtime.Close()
	s := &Server{agentRuntimeURL: runtime.URL, agentRuntimeToken: "internal", httpClient: &http.Client{Timeout: time.Second}}
	req := httptest.NewRequest(http.MethodPost, "/api/agents/run/a-cfo", nil)
	req.Header.Set("Authorization", "Bearer signed")
	result, err := s.runLiveAgent(req, "org", "user", "a-cfo", "deterministic source")
	if err != nil {
		t.Fatalf("run live agent: %v", err)
	}
	if result.RunID != "agent_run_live" || result.Model != "llama-test" || result.Explanation != "Live grounded result." {
		t.Fatalf("unexpected live result: %#v", result)
	}
}

func TestRunLiveAgentRejectsStaticOrIncompleteRuntimeResult(t *testing.T) {
	runtime := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		_ = json.NewEncoder(w).Encode(map[string]any{
			"run_id": "agent_run_static", "external_model": false,
			"output": map[string]any{"metadata": map[string]any{"model_status": "unavailable", "explanation": "static"}},
		})
	}))
	defer runtime.Close()
	s := &Server{agentRuntimeURL: runtime.URL, httpClient: runtime.Client()}
	_, err := s.runLiveAgent(httptest.NewRequest(http.MethodPost, "/", nil), "org", "user", "a-cfo", "summary")
	if err == nil {
		t.Fatal("expected incomplete model execution to be rejected")
	}
}
