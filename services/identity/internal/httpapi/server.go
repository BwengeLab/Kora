package httpapi

import (
	"encoding/json"
	"net/http"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/identity"
	"github.com/kora-finance/kora/libs/servicekit"
)

type Server struct {
	service *identity.Service
	mux     *http.ServeMux
}

func New(service *identity.Service) *Server {
	server := &Server{service: service, mux: http.NewServeMux()}
	server.mux.HandleFunc("/healthz", servicekit.HealthHandler("identity"))
	server.mux.HandleFunc("/v1/organizations/register", server.registerOrganization)
	server.mux.HandleFunc("/v1/auth/login", server.login)
	server.mux.HandleFunc("/v1/auth/refresh", server.refresh)
	server.mux.HandleFunc("/v1/auth/authorize", server.authorize)
	return server
}

func (s *Server) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	s.mux.ServeHTTP(w, r)
}

type registerRequest struct {
	OrganizationName string `json:"organization_name"`
	OwnerEmail       string `json:"owner_email"`
	OwnerDisplayName string `json:"owner_display_name"`
	OwnerPassword    string `json:"owner_password"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type refreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

type authorizeRequest struct {
	ActorUserID            string `json:"actor_user_id"`
	ActorOrganizationID    string `json:"actor_organization_id"`
	ResourceOrganizationID string `json:"resource_organization_id"`
	Permission             string `json:"permission"`
}

func (s *Server) registerOrganization(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var req registerRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	out, err := s.service.RegisterOrganization(identity.RegisterInput{
		OrganizationName: req.OrganizationName,
		OwnerEmail:       req.OwnerEmail,
		OwnerDisplayName: req.OwnerDisplayName,
		OwnerPassword:    req.OwnerPassword,
	})
	if err != nil {
		writeError(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusCreated, out)
}

func (s *Server) login(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var req loginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	out, err := s.service.Login(req.Email, req.Password)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) refresh(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var req refreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	out, err := s.service.Refresh(req.RefreshToken)
	if err != nil {
		writeError(w, http.StatusUnauthorized, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, out)
}

func (s *Server) authorize(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		writeError(w, http.StatusMethodNotAllowed, "method not allowed")
		return
	}
	var req authorizeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		writeError(w, http.StatusBadRequest, "invalid json")
		return
	}
	err := s.service.Authorize(identity.AuthorizeInput{
		ActorUserID:            req.ActorUserID,
		ActorOrganizationID:    req.ActorOrganizationID,
		ResourceOrganizationID: req.ResourceOrganizationID,
		Permission:             access.Permission(req.Permission),
	})
	if err != nil {
		writeJSON(w, http.StatusForbidden, map[string]any{"allowed": false, "reason": err.Error()})
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"allowed": true, "reason": ""})
}

func writeJSON(w http.ResponseWriter, status int, body any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
