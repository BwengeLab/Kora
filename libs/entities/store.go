package entities

type Store interface {
	Resolve(organizationID string, entityType Type, candidate Candidate) (Entity, bool, error)
	Get(organizationID string, entityID string) (Entity, error)
	List(organizationID string) []Entity
}
