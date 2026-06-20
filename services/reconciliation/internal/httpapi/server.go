package httpapi

import (
	"encoding/json"
	"github.com/kora-finance/kora/libs/eventledger"
	"github.com/kora-finance/kora/libs/policy"
	"github.com/kora-finance/kora/libs/reconciliation"
	"github.com/kora-finance/kora/libs/servicekit"
	"net/http"
)

type Server struct{ mux *http.ServeMux }

func New() *Server {
	s := &Server{mux: http.NewServeMux()}
	s.mux.HandleFunc("/healthz", servicekit.HealthHandler("reconciliation"))
	s.mux.HandleFunc("/v1/reconcile", s.reconcile)
	return s
}
func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) { s.mux.ServeHTTP(w, r) }
func (s *Server) reconcile(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		write(w, 405, map[string]string{"error": "method not allowed"})
		return
	}
	var req struct {
		OrganizationID string              `json:"organization_id"`
		Events         []eventledger.Event `json:"events"`
		Policy         policy.Policy       `json:"policy"`
	}
	d := json.NewDecoder(r.Body)
	d.DisallowUnknownFields()
	if err := d.Decode(&req); err != nil {
		write(w, 400, map[string]string{"error": err.Error()})
		return
	}
	result, err := reconciliation.Reconcile(req.OrganizationID, req.Events, req.Policy)
	if err != nil {
		write(w, 400, map[string]string{"error": err.Error()})
		return
	}
	write(w, 200, result)
}
func write(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(v)
}
