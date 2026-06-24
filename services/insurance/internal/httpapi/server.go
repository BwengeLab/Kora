package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/kora-finance/kora/libs/policy"
	"github.com/kora-finance/kora/libs/reconciliation"
	"github.com/kora-finance/kora/libs/servicekit"
	insurance "github.com/kora-finance/kora/verticals/insurance"
)

const maxRequestBytes = 2 << 20

type Server struct {
	adapter *insurance.Adapter
	mux     *http.ServeMux
}

func New(adapter *insurance.Adapter) *Server {
	server := &Server{adapter: adapter, mux: http.NewServeMux()}
	server.mux.HandleFunc("/healthz", servicekit.HealthHandler("insurance-adapter"))
	server.mux.HandleFunc("/v1/insurance/map", server.mapRecord)
	server.mux.HandleFunc("/v1/insurance/templates", server.templates)
	server.mux.HandleFunc("/v1/insurance/reconcile", server.reconcile)
	return server
}

func (s *Server) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	s.mux.ServeHTTP(writer, request)
}

func (s *Server) mapRecord(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var input insurance.Input
	if err := decode(request, writer, &input); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	mapping, err := s.adapter.Map(input)
	if err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	status := http.StatusCreated
	if !mapping.Created {
		status = http.StatusOK
	}
	writeJSON(writer, status, mapping)
}

func (s *Server) templates(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodGet {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	writeJSON(writer, http.StatusOK, map[string]any{"templates": insurance.ImportTemplates()})
}

func (s *Server) reconcile(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var input struct {
		OrganizationID string              `json:"organization_id"`
		Mappings       []insurance.Mapping `json:"mappings"`
		Policy         policy.Policy       `json:"policy"`
	}
	if err := decode(request, writer, &input); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	result, err := insurance.ReconcileEvents(input.OrganizationID, input.Mappings, input.Policy)
	if err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	report, err := insurance.BuildExceptionReport(input.OrganizationID, input.Mappings, result)
	if err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(writer, http.StatusOK, struct {
		Reconciliation reconciliation.Result     `json:"reconciliation"`
		Exceptions     insurance.ExceptionReport `json:"exceptions"`
	}{result, report})
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
