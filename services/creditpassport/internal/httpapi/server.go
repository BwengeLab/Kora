package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/consent"
	"github.com/kora-finance/kora/libs/creditpassport"
	"github.com/kora-finance/kora/libs/servicekit"
)

const maxRequestBytes = 10 << 20

type Server struct {
	passports *creditpassport.Store
	consents  *consent.Store
	mux       *http.ServeMux
}

func New(passports *creditpassport.Store, consents *consent.Store) *Server {
	server := &Server{passports: passports, consents: consents, mux: http.NewServeMux()}
	server.mux.HandleFunc("/healthz", servicekit.HealthHandler("credit-passport"))
	server.mux.HandleFunc("/v1/credit-passports", server.generate)
	server.mux.HandleFunc("/v1/credit-passports/", server.passportAction)
	return server
}

func (s *Server) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	s.mux.ServeHTTP(writer, request)
}

func (s *Server) generate(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		Actor access.Actor         `json:"actor"`
		Input creditpassport.Input `json:"input"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	passport, created, err := s.passports.Generate(body.Actor, body.Input)
	if err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	status := http.StatusCreated
	if !created {
		status = http.StatusOK
	}
	writeJSON(writer, status, passport)
}

func (s *Server) passportAction(writer http.ResponseWriter, request *http.Request) {
	path := strings.TrimPrefix(request.URL.Path, "/v1/credit-passports/")
	parts := strings.Split(path, "/")
	if request.Method != http.MethodPost || len(parts) != 2 || parts[0] == "" {
		writeError(writer, http.StatusMethodNotAllowed, "unsupported passport action")
		return
	}
	switch parts[1] {
	case "read":
		s.read(writer, request, parts[0])
	case "share":
		s.share(writer, request, parts[0])
	default:
		writeError(writer, http.StatusMethodNotAllowed, "unsupported passport action")
	}
}

func (s *Server) read(writer http.ResponseWriter, request *http.Request, passportID string) {
	var body struct {
		Actor          access.Actor `json:"actor"`
		OrganizationID string       `json:"organization_id"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	passport, err := s.passports.Read(body.Actor, body.OrganizationID, passportID)
	if err != nil {
		writeError(writer, http.StatusForbidden, err.Error())
		return
	}
	writeJSON(writer, http.StatusOK, passport)
}

func (s *Server) share(writer http.ResponseWriter, request *http.Request, passportID string) {
	var body struct {
		AccessRequest consent.AccessRequest `json:"access_request"`
		Categories    []string              `json:"categories"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	shared, err := s.passports.Share(s.consents, body.AccessRequest, body.Categories, passportID)
	if err != nil {
		writeError(writer, http.StatusForbidden, err.Error())
		return
	}
	writeJSON(writer, http.StatusOK, shared)
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
