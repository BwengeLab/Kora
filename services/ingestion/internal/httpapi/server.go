package httpapi

import (
	"encoding/base64"
	"encoding/json"
	"net/http"

	"github.com/kora-finance/kora/libs/ingestion"
	"github.com/kora-finance/kora/libs/servicekit"
)

type Server struct {
	service *ingestion.Service
	mux     *http.ServeMux
}

func New(service *ingestion.Service) *Server {
	server := &Server{service: service, mux: http.NewServeMux()}
	server.mux.HandleFunc("/healthz", servicekit.HealthHandler("ingestion"))
	server.mux.HandleFunc("/v1/documents/ingest", server.ingestDocument)
	return server
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mux.ServeHTTP(w, r)
}

type ingestRequest struct {
	OrganizationID   string                           `json:"organization_id"`
	IdempotencyKey   string                           `json:"idempotency_key"`
	FileName         string                           `json:"file_name"`
	ContentType      string                           `json:"content_type"`
	ContentBase64    string                           `json:"content_base64"`
	Extractor        string                           `json:"extractor"`
	ForceReprocess   bool                             `json:"force_reprocess"`
	ExtractedRecords []ingestion.ExtractedRecordInput `json:"extracted_records"`
}

func (s *Server) ingestDocument(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}

	var req ingestRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}

	content, err := base64.StdEncoding.DecodeString(req.ContentBase64)
	if err != nil {
		writeError(w, http.StatusBadRequest, "content_base64 is invalid")
		return
	}

	result, err := s.service.Ingest(ingestion.IngestInput{
		OrganizationID:   req.OrganizationID,
		IdempotencyKey:   req.IdempotencyKey,
		FileName:         req.FileName,
		ContentType:      req.ContentType,
		Content:          content,
		Extractor:        req.Extractor,
		ForceReprocess:   req.ForceReprocess,
		ExtractedRecords: req.ExtractedRecords,
	})
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}

	writeJSON(w, http.StatusCreated, result)
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
