package identity

import (
	"errors"
	"strings"
	"time"

	"github.com/kora-finance/kora/libs/access"
	"github.com/kora-finance/kora/libs/auth"
)

type Service struct {
	store           Store
	jwtSecret       []byte
	now             func() time.Time
	accessTokenTTL  time.Duration
	refreshTokenTTL time.Duration
}

type RegisterInput struct {
	OrganizationName string
	OwnerEmail       string
	OwnerDisplayName string
	OwnerPassword    string
}

type RegisterOutput struct {
	OrganizationID string
	OwnerUserID    string
}

type LoginOutput struct {
	AccessToken    string
	RefreshToken   string
	UserID         string
	OrganizationID string
	Plane          access.Plane
	Roles          []access.Role
	Permissions    []access.Permission
}

type AuthorizeInput struct {
	ActorUserID            string
	ActorOrganizationID    string
	ResourceOrganizationID string
	Permission             access.Permission
}

func NewService(store Store, jwtSecret []byte) *Service {
	return &Service{
		store:           store,
		jwtSecret:       jwtSecret,
		now:             time.Now,
		accessTokenTTL:  15 * time.Minute,
		refreshTokenTTL: 30 * 24 * time.Hour,
	}
}

func (s *Service) RegisterOrganization(input RegisterInput) (RegisterOutput, error) {
	if strings.TrimSpace(input.OrganizationName) == "" {
		return RegisterOutput{}, errors.New("organization name is required")
	}
	if strings.TrimSpace(input.OwnerEmail) == "" {
		return RegisterOutput{}, errors.New("owner email is required")
	}
	if len(input.OwnerPassword) < 8 {
		return RegisterOutput{}, errors.New("owner password must be at least 8 characters")
	}

	orgID, err := auth.NewID("org")
	if err != nil {
		return RegisterOutput{}, err
	}
	userID, err := auth.NewID("usr")
	if err != nil {
		return RegisterOutput{}, err
	}
	bindingID, err := auth.NewID("role")
	if err != nil {
		return RegisterOutput{}, err
	}
	salt, err := auth.NewRefreshToken()
	if err != nil {
		return RegisterOutput{}, err
	}
	now := s.now()
	org := Organization{ID: orgID, Name: input.OrganizationName, Status: "active", CreatedAt: now}
	if parts := strings.Split(strings.ToLower(strings.TrimSpace(input.OwnerEmail)), "@"); len(parts) == 2 {
		org.Domain = parts[1]
	}
	user := User{
		ID:             userID,
		OrganizationID: orgID,
		Email:          strings.ToLower(strings.TrimSpace(input.OwnerEmail)),
		DisplayName:    input.OwnerDisplayName,
		PasswordHash:   auth.HashSecret(input.OwnerPassword, salt),
		PasswordSalt:   salt,
		Status:         "active",
		CreatedAt:      now,
	}
	if user.DisplayName == "" {
		user.DisplayName = user.Email
	}
	if err := s.store.CreateOrganization(org); err != nil {
		return RegisterOutput{}, err
	}
	if err := s.store.CreateUser(user); err != nil {
		return RegisterOutput{}, err
	}
	if err := s.store.CreateRoleBinding(RoleBinding{ID: bindingID, OrganizationID: orgID, UserID: userID, Role: access.RoleOrganizationOwner, CreatedAt: now}); err != nil {
		return RegisterOutput{}, err
	}
	return RegisterOutput{OrganizationID: orgID, OwnerUserID: userID}, nil
}

func (s *Service) Login(email string, password string) (LoginOutput, error) {
	user, err := s.store.FindUserByEmail(strings.ToLower(strings.TrimSpace(email)))
	if err != nil {
		return LoginOutput{}, errors.New("invalid credentials")
	}
	if user.Status != "active" || auth.HashSecret(password, user.PasswordSalt) != user.PasswordHash {
		return LoginOutput{}, errors.New("invalid credentials")
	}
	return s.issueTokens(user)
}

func (s *Service) Refresh(refreshToken string) (LoginOutput, error) {
	hash := auth.HashSecret(refreshToken, "refresh")
	session, err := s.store.FindRefreshSession(hash)
	if err != nil {
		return LoginOutput{}, errors.New("invalid refresh token")
	}
	if session.Revoked || !session.ExpiresAt.After(s.now()) {
		return LoginOutput{}, errors.New("invalid refresh token")
	}
	user, err := s.store.FindUserByID(session.UserID)
	if err != nil {
		return LoginOutput{}, err
	}
	if err := s.store.RevokeRefreshSession(hash); err != nil {
		return LoginOutput{}, err
	}
	return s.issueTokens(user)
}

func (s *Service) AssignRole(actor access.Actor, userID string, role access.Role) error {
	if !access.IsTenantRole(role) {
		return errors.New("only canonical tenant roles can be assigned to tenant users")
	}
	user, err := s.store.FindUserByID(userID)
	if err != nil {
		return err
	}
	if err := access.Authorize(actor, access.Resource{OrganizationID: user.OrganizationID}, access.PermissionManageRoles); err != nil {
		return err
	}
	bindingID, err := auth.NewID("role")
	if err != nil {
		return err
	}
	return s.store.CreateRoleBinding(RoleBinding{ID: bindingID, OrganizationID: user.OrganizationID, UserID: userID, Role: role, CreatedAt: s.now()})
}

func (s *Service) Authorize(input AuthorizeInput) error {
	roles, err := s.store.RolesForUser(input.ActorUserID)
	if err != nil {
		return err
	}
	actor := access.Actor{
		UserID:         input.ActorUserID,
		OrganizationID: input.ActorOrganizationID,
		Roles:          roles,
	}
	return access.Authorize(actor, access.Resource{OrganizationID: input.ResourceOrganizationID}, input.Permission)
}

func (s *Service) VerifyAccessToken(token string) (auth.Claims, error) {
	return auth.VerifyJWT(token, s.jwtSecret, s.now())
}

func (s *Service) issueTokens(user User) (LoginOutput, error) {
	roles, err := s.store.RolesForUser(user.ID)
	if err != nil {
		return LoginOutput{}, err
	}
	permissions := access.PermissionsForRoles(roles...)
	roleStrings := make([]string, 0, len(roles))
	for _, role := range roles {
		roleStrings = append(roleStrings, string(role))
	}
	permissionStrings := make([]string, 0, len(permissions))
	for _, permission := range permissions {
		permissionStrings = append(permissionStrings, string(permission))
	}
	now := s.now()
	accessToken, err := auth.SignJWT(auth.Claims{
		Subject:        user.ID,
		OrganizationID: user.OrganizationID,
		Plane:          string(access.PlaneTenant),
		Roles:          roleStrings,
		Permissions:    permissionStrings,
		IssuedAt:       now.Unix(),
		ExpiresAt:      now.Add(s.accessTokenTTL).Unix(),
	}, s.jwtSecret)
	if err != nil {
		return LoginOutput{}, err
	}
	refreshToken, err := auth.NewRefreshToken()
	if err != nil {
		return LoginOutput{}, err
	}
	if err := s.store.SaveRefreshSession(RefreshSession{
		TokenHash:      auth.HashSecret(refreshToken, "refresh"),
		OrganizationID: user.OrganizationID,
		UserID:         user.ID,
		ExpiresAt:      now.Add(s.refreshTokenTTL),
	}); err != nil {
		return LoginOutput{}, err
	}
	return LoginOutput{
		AccessToken:    accessToken,
		RefreshToken:   refreshToken,
		UserID:         user.ID,
		OrganizationID: user.OrganizationID,
		Plane:          access.PlaneTenant,
		Roles:          roles,
		Permissions:    permissions,
	}, nil
}
