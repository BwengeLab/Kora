package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/consent"
	"github.com/kora-finance/kora/libs/evidence"
	"github.com/kora-finance/kora/libs/servicekit"
	"github.com/kora-finance/kora/libs/workflow"
)

const maxRequestBytes = 2 << 20

type Server struct {
	store *consent.Store
	mux   *http.ServeMux
}

func New(store *consent.Store) *Server {
	server := &Server{store: store, mux: http.NewServeMux()}
	server.mux.HandleFunc("/healthz", servicekit.HealthHandler("consent"))
	server.mux.HandleFunc("/v1/consent/templates", server.templates)
	server.mux.HandleFunc("/v1/consent/grants", server.createGrant)
	server.mux.HandleFunc("/v1/consent/grants/", server.revokeGrant)
	server.mux.HandleFunc("/v1/consent/authorize", server.authorize)
	server.mux.HandleFunc("/v1/consent/access-logs/query", server.logs)
	return server
}

func (s *Server) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	s.mux.ServeHTTP(writer, request)
}

func (s *Server) templates(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	writeJSON(writer, http.StatusOK, map[string]any{"templates": consent.Templates()})
}

func (s *Server) createGrant(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		Actor    access.Actor  `json:"actor"`
		Grant    consent.Grant `json:"grant"`
		Approval workflow.Task `json:"approval"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	grant, err := s.store.Create(body.Actor, body.Grant, body.Approval)
	if err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(writer, http.StatusCreated, grant)
}

func (s *Server) revokeGrant(writer http.ResponseWriter, request *http.Request) {
	path := strings.TrimPrefix(request.URL.Path, "/v1/consent/grants/")
	parts := strings.Split(path, "/")
	if request.Method != http.MethodPost || len(parts) != 2 || parts[0] == "" || parts[1] != "revoke" {
		writeError(writer, http.StatusMethodNotAllowed, "unsupported grant action")
		return
	}
	var body struct {
		Actor          access.Actor      `json:"actor"`
		OrganizationID string            `json:"organization_id"`
		Evidence       evidence.Evidence `json:"evidence"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	grant, err := s.store.Revoke(body.Actor, body.OrganizationID, parts[0], body.Evidence)
	if err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(writer, http.StatusOK, grant)
}

func (s *Server) authorize(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body consent.AccessRequest
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	log, err := s.store.AuthorizeAndLog(body)
	if err != nil {
		writeJSON(writer, http.StatusForbidden, map[string]any{"error": err.Error(), "access_log": log})
		return
	}
	writeJSON(writer, http.StatusOK, map[string]any{"authorized": true, "access_log": log})
}

func (s *Server) logs(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		Actor          access.Actor `json:"actor"`
		OrganizationID string       `json:"organization_id"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	logs, err := s.store.Logs(body.Actor, body.OrganizationID)
	if err != nil {
		writeError(writer, http.StatusForbidden, err.Error())
		return
	}
	writeJSON(writer, http.StatusOK, map[string]any{"access_logs": logs})
}

func decode(request *http.Request, writer http.ResponseWriter, target any) error {
	request.Body = http.MaxBytesReader(writer, request.Body, maxRequestBytes)
	decoder := json.NewDecoder(request.Body)
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(target); err != nil {
		return err
	}
	if err := decoder.Decode(&struct{}{}); !errors.Is(err, io.EOF) {
		return errors.New("request body must contain one JSON value")
	}
	return nil
}

func writeJSON(writer http.ResponseWriter, status int, body any) {
	writer.Header().Set("Content-Type", "application/json")
	writer.WriteHeader(status)
	_ = json.NewEncoder(writer).Encode(body)
}

func writeError(writer http.ResponseWriter, status int, message string) {
	writeJSON(writer, status, map[string]string{"error": message})
}
