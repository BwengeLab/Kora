package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/kora-finance/kora/libs/policy"
	"github.com/kora-finance/kora/libs/servicekit"
)

type Server struct {
	store *policy.MemoryStore
	mux   *http.ServeMux
}

func New(store *policy.MemoryStore) *Server {
	server := &Server{store: store, mux: http.NewServeMux()}
	server.mux.HandleFunc("/healthz", servicekit.HealthHandler("rules"))
	server.mux.HandleFunc("/v1/policies/defaults/sme", server.defaultSME)
	server.mux.HandleFunc("/v1/policies/defaults/insurance", server.defaultInsurance)
	server.mux.HandleFunc("/v1/policies", server.upsertPolicy)
	server.mux.HandleFunc("/v1/policies/latest", server.latestPolicy)
	return server
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mux.ServeHTTP(w, r)
}

func (s *Server) defaultSME(w http.ResponseWriter, r *http.Request) {
	orgID := r.URL.Query().Get("organization_id")
	writeJSON(w, http.StatusOK, policy.DefaultSME(orgID))
}

func (s *Server) defaultInsurance(w http.ResponseWriter, r *http.Request) {
	orgID := r.URL.Query().Get("organization_id")
	writeJSON(w, http.StatusOK, policy.DefaultInsurance(orgID))
}

func (s *Server) upsertPolicy(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var req struct {
		Policy      policy.Policy `json:"policy"`
		ActorUserID string        `json:"actor_user_id"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	stored, err := s.store.Save(req.Policy, policy.AuditEvent{ActorUserID: req.ActorUserID, Action: "policy.upserted"})
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, stored)
}

func (s *Server) latestPolicy(w http.ResponseWriter, r *http.Request) {
	orgID := r.URL.Query().Get("organization_id")
	scope := policy.Scope(r.URL.Query().Get("scope"))
	latest, err := s.store.Latest(orgID, scope)
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, latest)
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
