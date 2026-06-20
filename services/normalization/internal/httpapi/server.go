package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/kora-finance/kora/libs/corrections"
	"github.com/kora-finance/kora/libs/normalization"
	"github.com/kora-finance/kora/libs/servicekit"
)

type Server struct {
	service *normalization.Service
	mux     *http.ServeMux
}

func New(service *normalization.Service) *Server {
	server := &Server{service: service, mux: http.NewServeMux()}
	server.mux.HandleFunc("/healthz", servicekit.HealthHandler("normalization"))
	server.mux.HandleFunc("/v1/normalize", server.normalize)
	server.mux.HandleFunc("/v1/events", server.events)
	server.mux.HandleFunc("/v1/events/get", server.getEvent)
	server.mux.HandleFunc("/v1/events/corrections", server.appendCorrection)
	server.mux.HandleFunc("/v1/entities", server.entities)
	return server
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mux.ServeHTTP(w, r)
}

func (s *Server) normalize(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var input normalization.Input
	if err := decodeJSON(r, &input); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	result, err := s.service.Normalize(input)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	status := http.StatusCreated
	if !result.Created {
		status = http.StatusOK
	}
	writeJSON(w, status, result)
}

func (s *Server) events(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	organizationID := r.URL.Query().Get("organization_id")
	if organizationID == "" {
		writeError(w, http.StatusBadRequest, "organization_id is required")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"events": s.service.EventStore().List(organizationID)})
}

func (s *Server) getEvent(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	view, err := s.service.EventStore().Get(r.URL.Query().Get("organization_id"), r.URL.Query().Get("event_id"))
	if err != nil {
		writeError(w, http.StatusNotFound, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, view)
}

func (s *Server) appendCorrection(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var correction corrections.Event
	if err := decodeJSON(r, &correction); err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	stored, err := s.service.EventStore().AppendCorrection(correction)
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, stored)
}

func (s *Server) entities(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodGet {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	organizationID := r.URL.Query().Get("organization_id")
	if organizationID == "" {
		writeError(w, http.StatusBadRequest, "organization_id is required")
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"entities": s.service.EntityResolver().List(organizationID)})
}

func decodeJSON(r *http.Request, target any) error {
	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()
	return decoder.Decode(target)
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
