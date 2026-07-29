package httpapi

import (
	"encoding/json"
	"net/http"
	"strings"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/evidence"
	"github.com/kora-finance/kora/libs/policy"
	"github.com/kora-finance/kora/libs/servicekit"
	"github.com/kora-finance/kora/libs/workflow"
)

type Server struct {
	mux   *http.ServeMux
	store workflow.Store
}

func New(store workflow.Store) *Server {
	s := &Server{mux: http.NewServeMux(), store: store}
	s.mux.HandleFunc("/healthz", servicekit.HealthHandler("workflow"))
	s.mux.HandleFunc("/v1/approval-tasks", s.tasks)
	s.mux.HandleFunc("/v1/approval-tasks/", s.taskAction)
	return s
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) { s.mux.ServeHTTP(w, r) }

func (s *Server) tasks(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		write(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
		return
	}
	var request struct {
		Actor  access.Actor  `json:"actor"`
		Task   workflow.Task `json:"task"`
		Policy policy.Policy `json:"policy"`
	}
	if err := decode(r, &request); err != nil {
		write(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	task, err := s.store.Create(request.Actor, request.Task, request.Policy)
	if err != nil {
		write(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	write(w, http.StatusCreated, task)
}

func (s *Server) taskAction(w http.ResponseWriter, r *http.Request) {
	parts := strings.Split(strings.TrimPrefix(r.URL.Path, "/v1/approval-tasks/"), "/")
	if len(parts) == 1 && r.Method == http.MethodGet {
		task, err := s.store.Get(r.URL.Query().Get("organization_id"), parts[0])
		if err != nil {
			write(w, http.StatusNotFound, map[string]string{"error": err.Error()})
			return
		}
		write(w, http.StatusOK, task)
		return
	}
	if len(parts) != 2 || r.Method != http.MethodPost {
		write(w, http.StatusMethodNotAllowed, map[string]string{"error": "unsupported task action"})
		return
	}
	var request struct {
		Context  workflow.ActorContext `json:"context"`
		Role     access.Role           `json:"role"`
		Policy   policy.Policy         `json:"policy"`
		Evidence evidence.Evidence     `json:"evidence"`
	}
	if err := decode(r, &request); err != nil {
		write(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	var task workflow.Task
	var err error
	switch parts[1] {
	case "assign":
		task, err = s.store.Assign(request.Context, parts[0], request.Role, request.Evidence)
	case "approve":
		task, err = s.store.Approve(request.Context, parts[0], request.Policy, request.Evidence)
	case "reject":
		task, err = s.store.Reject(request.Context, parts[0], request.Evidence)
	case "escalate":
		task, err = s.store.Escalate(request.Context, parts[0], request.Evidence)
	case "execute":
		task, err = s.store.MarkExecuted(request.Context, parts[0], request.Evidence)
	case "reverse":
		task, err = s.store.MarkReversed(request.Context, parts[0], request.Evidence)
	default:
		err = http.ErrNotSupported
	}
	if err != nil {
		write(w, http.StatusBadRequest, map[string]string{"error": err.Error()})
		return
	}
	write(w, http.StatusOK, task)
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
