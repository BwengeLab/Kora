package momo

type RequestTracker interface {
	Create(request Request) (Request, error)
	GetByReference(organizationID string, referenceID string) (Request, error)
	UpdateFromProvider(organizationID string, referenceID string, update RequestEvent) (Request, error)
	SaveOrUpdateFromCallback(seed Request, update RequestEvent) (Request, error)
	History(organizationID string, referenceID string) ([]RequestEvent, error)
	List(filter ListFilter) []Request
}
