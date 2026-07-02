package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/collections"
	"github.com/kora-finance/kora/libs/contracts"
	"github.com/kora-finance/kora/libs/evidence"
	"github.com/kora-finance/kora/libs/financeanalytics"
	"github.com/kora-finance/kora/libs/relationships"
	"github.com/kora-finance/kora/libs/riskanalytics"
	"github.com/kora-finance/kora/libs/servicekit"
)

const maxRequestBytes = 12 << 20

type Server struct{ mux *http.ServeMux }

func New() *Server {
	server := &Server{mux: http.NewServeMux()}
	server.mux.HandleFunc("/healthz", servicekit.HealthHandler("finance-ops"))
	server.mux.HandleFunc("/v1/finance-analytics/generate", server.generateAnalytics)
	server.mux.HandleFunc("/v1/collections/cases", server.collectionCases)
	server.mux.HandleFunc("/v1/collections/send", server.sendCollectionReminder)
	server.mux.HandleFunc("/v1/contracts/analyze", server.analyzeContracts)
	server.mux.HandleFunc("/v1/relationships/graph", server.relationshipGraph)
	server.mux.HandleFunc("/v1/risk-analytics/detect", server.detectRisk)
	return server
}

func (s *Server) ServeHTTP(writer http.ResponseWriter, request *http.Request) {
	s.mux.ServeHTTP(writer, request)
}

func (s *Server) generateAnalytics(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		Actor access.Actor           `json:"actor"`
		Input financeanalytics.Input `json:"input"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	report, err := financeanalytics.Generate(body.Actor, body.Input)
	if err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(writer, http.StatusOK, report)
}

func (s *Server) collectionCases(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		Actor access.Actor      `json:"actor"`
		Input collections.Input `json:"input"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	cases, err := collections.BuildCases(body.Actor, body.Input)
	if err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(writer, http.StatusOK, cases)
}

func (s *Server) sendCollectionReminder(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		Actor   access.Actor      `json:"actor"`
		Human   bool              `json:"human"`
		Case    collections.Case  `json:"case"`
		Proof   evidence.Evidence `json:"proof"`
		Channel string            `json:"channel"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	receipt, err := collections.SendReminder(body.Actor, body.Human, body.Case, body.Proof, body.Channel)
	if err != nil {
		writeError(writer, http.StatusForbidden, err.Error())
		return
	}
	writeJSON(writer, http.StatusCreated, receipt)
}

func (s *Server) analyzeContracts(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		Actor access.Actor    `json:"actor"`
		Input contracts.Input `json:"input"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	report, err := contracts.Analyze(body.Actor, body.Input)
	if err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(writer, http.StatusOK, report)
}

func (s *Server) relationshipGraph(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		Actor access.Actor        `json:"actor"`
		Input relationships.Input `json:"input"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	graph, err := relationships.Build(body.Actor, body.Input)
	if err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(writer, http.StatusOK, graph)
}

func (s *Server) detectRisk(writer http.ResponseWriter, request *http.Request) {
	if request.Method != http.MethodPost {
		writeError(writer, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var body struct {
		Actor access.Actor        `json:"actor"`
		Input riskanalytics.Input `json:"input"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	flags, err := riskanalytics.Detect(body.Actor, body.Input)
	if err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(writer, http.StatusOK, flags)
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
