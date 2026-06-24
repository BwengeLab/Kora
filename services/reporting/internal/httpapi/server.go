package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/reporting"
	"github.com/kora-finance/kora/libs/servicekit"
)

const maxRequestBytes = 8 << 20

type Server struct{ mux *http.ServeMux }

func New() *Server {
	server := &Server{mux: http.NewServeMux()}
	server.mux.HandleFunc("/healthz", servicekit.HealthHandler("reporting"))
	server.mux.HandleFunc("/v1/reports/generate", server.generate)
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
		Actor access.Actor    `json:"actor"`
		Input reporting.Input `json:"input"`
	}
	if err := decode(request, writer, &body); err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	report, err := reporting.Generate(body.Actor, body.Input)
	if err != nil {
		writeError(writer, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(writer, http.StatusOK, report)
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
