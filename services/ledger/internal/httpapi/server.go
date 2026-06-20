package httpapi

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/evidence"
	"github.com/kora-finance/kora/libs/ledger"
	"github.com/kora-finance/kora/libs/servicekit"
	"github.com/kora-finance/kora/libs/workflow"
)

type Server struct {
	mux   *http.ServeMux
	store *ledger.Store
}

func New(store *ledger.Store) *Server {
	s := &Server{mux: http.NewServeMux(), store: store}
	s.mux.HandleFunc("/healthz", servicekit.HealthHandler("ledger"))
	s.mux.HandleFunc("/v1/accounts", s.accounts)
	s.mux.HandleFunc("/v1/postings", s.postings)
	s.mux.HandleFunc("/v1/postings/", s.postingAction)
	return s
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) { s.mux.ServeHTTP(w, r) }

func (s *Server) accounts(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		write(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	var request struct {
		Actor   access.Actor   `json:"actor"`
		Account ledger.Account `json:"account"`
	}
	if err := decode(r, &request); err != nil {
		write(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	account, err := s.store.CreateAccount(request.Actor, request.Account)
	if err != nil {
		write(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	write(w, http.StatusCreated, account)
}

func (s *Server) postings(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		write(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	var request struct {
		Context workflowContext `json:"context"`
		Task    workflow.Task   `json:"task"`
		Entries []ledger.Entry  `json:"entries"`
	}
	if err := decode(r, &request); err != nil {
		write(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	group, err := s.store.Post(ledger.ActorContext(request.Context), request.Task, request.Entries)
	if err != nil {
		write(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	write(w, http.StatusCreated, group)
}

type workflowContext struct {
	Actor access.Actor `json:"actor"`
	Human bool         `json:"human"`
}

func (s *Server) postingAction(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/v1/postings/"), "/")
	if len(parts) != 2 || parts[1] != "reverse" || r.Method != http.MethodPost {
		write(w, http.StatusMethodNotAllowed, map[string]string{"error": "unsupported posting action"})
		return
	}
	var request struct {
		Context        workflowContext   `json:"context"`
		OrganizationID string            `json:"organization_id"`
		Evidence       evidence.Evidence `json:"evidence"`
	}
	if err := decode(r, &request); err != nil {
		write(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	group, err := s.store.Reverse(ledger.ActorContext(request.Context), request.OrganizationID, parts[0], request.Evidence)
	if err != nil {
		write(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	write(w, http.StatusCreated, group)
}

func decode(r *http.Request, value any) error {
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	return decoder.Decode(value)
}

func write(w http.ResponseWriter, status int, value any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(value)
}
