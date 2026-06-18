package tenant

import "errors"

type Context struct {
	OrganizationID string
	UserID         string
	Role           string
	Permissions    map[string]bool
}

func RequireSameTenant(actor Context, resourceTenantID string) error {
	if actor.OrganizationID == "" {
		return errors.New("actor tenant is required")
	}
	if actor.OrganizationID != resourceTenantID {
		return errors.New("cross-tenant access denied")
	}
	return nil
}

func Can(actor Context, permission string) bool {
	return actor.Permissions != nil && actor.Permissions[permission]
}

