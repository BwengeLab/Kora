package httpapi

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/kora-finance/kora/libs/policy"
)

func TestPolicyHTTPUpsertAndLatest(t *testing.T) {
	server := New(policy.NewMemoryStore())
	p := policy.DefaultSME("tenant-a")
	body, _ := json.Marshal(map[string]any{"policy": p, "actor_user_id": "user-a"})
	upsertReq := httptest.NewRequest(http.MethodPost, "/v1/policies", bytes.NewReader(body))
	upsertRes := httptest.NewRecorder()
	server.ServeHTTP(upsertRes, upsertReq)
	if upsertRes.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d %s", upsertRes.Code, upsertRes.Body.String())
	}

	latestReq := httptest.NewRequest(http.MethodGet, "/v1/policies/latest?organization_id=tenant-a&scope=sme", nil)
	latestRes := httptest.NewRecorder()
	server.ServeHTTP(latestRes, latestReq)
	if latestRes.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d %s", latestRes.Code, latestRes.Body.String())
	}
}
