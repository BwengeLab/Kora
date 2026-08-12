package httpapi

// Canonical API types for the gateway. All shapes are backed by real
// tenant-scoped database rows; there is no demo/static/seed data.

// Money is a minor-unit amount plus currency.
type Money struct {
	AmountMinor string `json:"amountMinor"`
	Currency    string `json:"currency"`
}

// MoneyPtr returns a *Money for amountMinor in currency.
func MoneyPtr(amountMinor int64, currency string) *Money {
	return &Money{AmountMinor: formatMoneyMinorInt(amountMinor), Currency: currency}
}

func formatMoneyMinorInt(amountMinor int64) string {
	return itoa(amountMinor)
}

func itoa(v int64) string {
	if v == 0 {
		return "0"
	}
	neg := v < 0
	if neg {
		v = -v
	}
	var buf [24]byte
	pos := len(buf)
	for v > 0 {
		pos--
		buf[pos] = byte('0' + v%10)
		v /= 10
	}
	if neg {
		pos--
		buf[pos] = '-'
	}
	return string(buf[pos:])
}

type Trend struct {
	Direction  string `json:"direction"`
	ValueText  string `json:"valueText"`
	Label      string `json:"label"`
	Percentage string `json:"percentage,omitempty"`
}

type Approver struct {
	Name string `json:"name"`
	Role string `json:"role"`
	At   string `json:"at,omitempty"`
}

type EvidenceDoc struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	URL        string `json:"url"`
	UploadedAt string `json:"uploadedAt"`
}

type HistoryEvent struct {
	ID        string `json:"id"`
	At        string `json:"at"`
	Actor     string `json:"actor"`
	ActorRole string `json:"actorRole"`
	Kind      string `json:"kind"`
	Action    string `json:"action"`
}

type TransactionData struct {
	ID           string `json:"id"`
	Date         string `json:"date"`
	Description  string `json:"description"`
	Amount       Money  `json:"amount"`
	Counterparty string `json:"counterparty"`
	Reference    string `json:"reference"`
	Channel      string `json:"channel"`
	ExternalRef  string `json:"externalRef"`
}

type MatchCandidate struct {
	ID           string `json:"id"`
	Type         string `json:"type"`
	Title        string `json:"title"`
	Subtitle     string `json:"subtitle"`
	Confidence   string `json:"confidence"`
	Amount       Money  `json:"amount"`
	Date         string `json:"date"`
	Counterparty string `json:"counterparty"`
}

type LinkedReconciliation struct {
	ID       string `json:"id"`
	Title    string `json:"title"`
	Subtitle string `json:"subtitle"`
}

// AuditEvent is the canonical audit event surfaced in workflow and auditor views.
type AuditEvent struct {
	ID          string `json:"id"`
	At          string `json:"at"`
	Actor       string `json:"actor"`
	Role        string `json:"role"`
	Kind        string `json:"kind"`
	Action      string `json:"action"`
	Target      string `json:"target"`
	Amount      *Money `json:"amount,omitempty"`
	HasEvidence bool   `json:"hasEvidence"`
}

// WorkflowSnapshot is the tenant-scoped approval workflow control view.
type WorkflowSnapshot struct {
	Approvals         []WorkflowApprovalItem   `json:"approvals"`
	Reconciliations   []WorkflowReconciliation `json:"reconciliations"`
	DismissedReconIDs []string                 `json:"dismissedReconIds"`
	AuditLog          []AuditEvent             `json:"auditLog"`
}

func emptyWorkflowSnapshot() *WorkflowSnapshot {
	return &WorkflowSnapshot{
		Approvals:         []WorkflowApprovalItem{},
		Reconciliations:   []WorkflowReconciliation{},
		DismissedReconIDs: []string{},
		AuditLog:          []AuditEvent{},
	}
}

// WorkflowApprovalItem is a single approval task rendered in the Action Center.
type WorkflowApprovalItem struct {
	ID                   string                `json:"id"`
	Type                 string                `json:"type"`
	Title                string                `json:"title"`
	Subtitle             string                `json:"subtitle"`
	Status               string                `json:"status"`
	Stage                string                `json:"stage"`
	CreatedAt            string                `json:"createdAt"`
	PreparedAt           string                `json:"preparedAt"`
	DeadlineText         string                `json:"deadlineText"`
	Urgent               bool                  `json:"urgent"`
	Amount               Money                 `json:"amount"`
	Risk                 string                `json:"risk"`
	Category             string                `json:"category"`
	Requestor            Approver              `json:"requestor"`
	PreparedBy           Approver              `json:"preparedBy"`
	PolicyLimit          Money                 `json:"policyLimit"`
	RequiresTwoPerson    bool                  `json:"requiresTwoPerson"`
	RequiresDualApproval bool                  `json:"requiresDualApproval"`
	WithinLimit          bool                  `json:"withinLimit"`
	IsOwnItem            bool                  `json:"isOwnItem"`
	Confidence           *int                  `json:"confidence,omitempty"`
	AgentRecommendation  string                `json:"agentRecommendation"`
	Approvals            []Approver            `json:"approvals"`
	Evidence             []EvidenceDoc         `json:"evidence"`
	History              []HistoryEvent        `json:"history"`
	LinkedReconciliation *LinkedReconciliation `json:"linkedReconciliation,omitempty"`
}

// WorkflowReconciliation is a single reconciliation candidate in the cockpit.
type WorkflowReconciliation struct {
	ID                    string           `json:"id"`
	Title                 string           `json:"title"`
	Subtitle              string           `json:"subtitle"`
	Status                string           `json:"status"`
	Stage                 string           `json:"stage"`
	Tier                  string           `json:"tier"`
	Reason                string           `json:"reason"`
	AgeText               string           `json:"ageText"`
	Confidence            int              `json:"confidence"`
	Transaction           BankTransaction  `json:"transaction"`
	SuggestedRecord       *BusinessRecord  `json:"suggestedRecord,omitempty"`
	MatchCandidates       []MatchCandidate `json:"matchCandidates"`
	UnexplainedDifference *Money           `json:"unexplainedDifference,omitempty"`
	DuplicateOf           string           `json:"duplicateOf,omitempty"`
	Deltas                []FieldDelta     `json:"deltas"`
	History               []HistoryEvent   `json:"history"`
	Evidence              []EvidenceDoc    `json:"evidence"`
}

// BankTransaction is a money-movement row (ledger or event sourced).
type BankTransaction struct {
	ID           string `json:"id"`
	Source       string `json:"source"`
	Date         string `json:"date"`
	Amount       Money  `json:"amount"`
	Counterparty string `json:"counterparty"`
	Reference    string `json:"reference"`
	Direction    string `json:"direction"`
}

// BusinessRecord is a counterpart business record suggested as a match.
type BusinessRecord struct {
	ID        string `json:"id"`
	Type      string `json:"type"`
	Date      string `json:"date"`
	Amount    Money  `json:"amount"`
	PartyName string `json:"partyName"`
	Reference string `json:"reference"`
}

type FieldDelta struct {
	Field    string `json:"field"`
	OldValue string `json:"oldValue"`
	NewValue string `json:"newValue"`
}

// OverdueItem is a tenant-scoped receivables record.
type OverdueItem struct {
	ID              string `json:"id"`
	Customer        string `json:"customer"`
	Invoice         string `json:"invoice"`
	Party           string `json:"party"`
	Amount          Money  `json:"amount"`
	DaysOverdue     int    `json:"daysOverdue"`
	Risk            string `json:"risk"`
	RiskLevel       string `json:"riskLevel"`
	ReminderDrafted bool   `json:"reminderDrafted"`
	Contact         string `json:"contact"`
	ContactName     string `json:"contactName"`
	ContactPhone    string `json:"contactPhone"`
	Email           string `json:"email"`
	LastContact     string `json:"lastContact"`
	LastPromiseDate string `json:"lastPromiseDate"`
	ReminderCount   int    `json:"reminderCount"`
	ActionStatus    string `json:"actionStatus"`
}

// ContractData is a tenant contract record.
type ContractData struct {
	ID           string `json:"id"`
	Type         string `json:"type"`
	Title        string `json:"title"`
	Counterparty string `json:"counterparty"`
	StartDate    string `json:"startDate"`
	EndDate      string `json:"endDate"`
	Value        Money  `json:"value,omitempty"`
	AutoRenew    bool   `json:"autoRenew"`
	Owner        string `json:"owner"`
	Reference    string `json:"reference"`
	Terms        string `json:"terms"`
	Status       string `json:"status"`
}

type ContractsOverviewData struct {
	Items []ContractData `json:"items"`
}

type FinanceJournalLine struct {
	Account    string `json:"account"`
	Debit      Money  `json:"debit,omitempty"`
	Credit     Money  `json:"credit,omitempty"`
	CostCenter string `json:"costCenter,omitempty"`
}

type FinanceJournalEntry struct {
	ID     string               `json:"id"`
	Date   string               `json:"date"`
	Ref    string               `json:"ref"`
	Memo   string               `json:"memo"`
	Status string               `json:"status"`
	Source string               `json:"source"`
	Entity string               `json:"entity"`
	Lines  []FinanceJournalLine `json:"lines"`
}

type FinanceBill struct {
	ID        string `json:"id"`
	Date      string `json:"date"`
	Vendor    string `json:"vendor"`
	Amount    Money  `json:"amount"`
	Status    string `json:"status"`
	DueDate   string `json:"dueDate"`
	Reference string `json:"reference"`
}

type FinanceTransaction struct {
	ID           string `json:"id"`
	Date         string `json:"date"`
	Account      string `json:"account"`
	Category     string `json:"category"`
	Description  string `json:"description"`
	Amount       Money  `json:"amount"`
	Counterparty string `json:"counterparty"`
	Purpose      string `json:"purpose"`
	Reference    string `json:"reference"`
	Direction    string `json:"direction"`
	Reconciled   bool   `json:"reconciled"`
	Review       string `json:"review"`
}

type FinanceOperationsSnapshot struct {
	Journals     []FinanceJournalEntry `json:"journals"`
	Bills        []FinanceBill         `json:"bills"`
	Transactions []FinanceTransaction  `json:"transactions"`
}

type LedgerKPIData struct {
	ID                string `json:"id"`
	Label             string `json:"label"`
	Money             *Money `json:"money,omitempty"`
	Delta             Trend  `json:"delta"`
	PositiveDirection string `json:"positiveDirection"`
}

type LedgerCashflowView struct {
	KPIs           []LedgerKPIData      `json:"kpis"`
	OpeningBalance Money                `json:"openingBalance"`
	PeriodStart    string               `json:"periodStart"`
	PeriodEnd      string               `json:"periodEnd"`
	Inflows        []Money              `json:"inflows"`
	Outflows       []Money              `json:"outflows"`
	Movements      []FinanceTransaction `json:"movements"`
}

type AuditInvestigationsView struct {
	ControlHealth AuditControlHealthData `json:"controlHealth"`
	RiskStats     AuditRiskStatsData     `json:"riskStats"`
	AuditLog      []AuditEvent           `json:"auditLog"`
}

type AuditControlHealthData struct {
	Score     int                   `json:"score"`
	TrendPts  int                   `json:"trendPts"`
	Subscores []ControlSubscoreData `json:"subscores"`
}

type ControlSubscoreData struct {
	Label string `json:"label"`
	Value int    `json:"value"`
}

type AuditRiskStatsData struct {
	RiskFlags     int `json:"riskFlags"`
	SodViolations int `json:"sodViolations"`
	Suspicious    int `json:"suspicious"`
	MissingDocs   int `json:"missingDocs"`
}

type AccessAlert struct {
	ID        string `json:"id"`
	Severity  string `json:"severity"`
	Message   string `json:"message"`
	Timestamp string `json:"timestamp"`
}

type AccessRequest struct {
	ID        string `json:"id"`
	Requester string `json:"requester"`
	Resource  string `json:"resource"`
	Reason    string `json:"reason"`
	Status    string `json:"status"`
	CreatedAt string `json:"createdAt"`
}

type AdminUser struct {
	ID         string   `json:"id"`
	Name       string   `json:"name"`
	Email      string   `json:"email"`
	Roles      []string `json:"roles"`
	Status     string   `json:"status"`
	LastActive string   `json:"lastActive"`
}

type AdminStats struct {
	ActiveUsers           int `json:"activeUsers"`
	PendingRequests       int `json:"pendingRequests"`
	IntegrationsConnected int `json:"integrationsConnected"`
	IntegrationsTotal     int `json:"integrationsTotal"`
	ActivePolicies        int `json:"activePolicies"`
	CustomRoles           int `json:"customRoles"`
}

type AdminDashboardData struct {
	Stats          AdminStats      `json:"stats"`
	Users          []AdminUser     `json:"users"`
	AccessRequests []AccessRequest `json:"accessRequests"`
	AccessAlerts   []AccessAlert   `json:"accessAlerts"`
	Policies       []PolicyVersion `json:"policies"`
	Billing        BillingSummary  `json:"billing"`
}

type BillingSummary struct {
	Plan          string `json:"plan"`
	Seats         int    `json:"seats"`
	PriceMonthly  string `json:"priceMonthly,omitempty"`
	SeatsIncluded int    `json:"seatsIncluded,omitempty"`
}

type AreaSeries struct {
	Name  string    `json:"name"`
	Color string    `json:"color"`
	Data  []float64 `json:"data"`
}

type PolicyVersion struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	Version     string `json:"version"`
	Status      string `json:"status"`
	PublishedAt string `json:"publishedAt"`
}

type CloseTaskData struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	Area  string `json:"area"`
	Owner string `json:"owner"`
	Done  bool   `json:"done"`
	Due   string `json:"due,omitempty"`
}

type ComplianceItemData struct {
	ID    string `json:"id"`
	Label string `json:"label"`
	OK    bool   `json:"ok"`
	Note  string `json:"note,omitempty"`
}

type ControlCheckData struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Status  string `json:"status"`
	LastRun string `json:"lastRun"`
	Result  string `json:"result"`
}

type ControlPostureData struct {
	ControlHealth int    `json:"controlHealth"`
	ControlTrend  int    `json:"controlTrend"`
	RiskScore     string `json:"riskScore"`
	OpenRisks     int    `json:"openRisks"`
}

type ControlsCloseData struct {
	Period        string                `json:"period"`
	Status        string                `json:"status"`
	Tasks         []CloseTaskData       `json:"tasks"`
	Compliance    []ComplianceItemData  `json:"compliance"`
	Posture       ControlPostureData    `json:"posture"`
	Subscores     []ControlSubscoreData `json:"subscores"`
	EvidenceGaps  []EvidenceGapData     `json:"evidenceGaps"`
	ControlChecks []ControlCheckData    `json:"controlChecks"`
}

type EvidenceGapData struct {
	ID        string `json:"id"`
	Reference string `json:"reference"`
	Party     string `json:"party"`
	Amount    string `json:"amount"`
	Age       string `json:"age"`
}

type CreditFactor struct {
	Name   string  `json:"name"`
	Score  float64 `json:"score"`
	Weight float64 `json:"weight"`
	Status string  `json:"status"`
}

type CreditPassportSummary struct {
	Score   int            `json:"score"`
	Label   string         `json:"label"`
	Caption string         `json:"caption"`
	Updated string         `json:"updated"`
	Factors []CreditFactor `json:"factors"`
}

type Insight struct {
	Text      string `json:"text"`
	Severity  string `json:"severity"`
	ActionURL string `json:"actionUrl,omitempty"`
}

type IntakeBatchData struct {
	ID      string `json:"id"`
	Name    string `json:"name"`
	Source  string `json:"source"`
	Status  string `json:"status"`
	Records int    `json:"records"`
	Flags   int    `json:"flags"`
	When    string `json:"when"`
}

type OperatorFocusData struct {
	ExceptionsToClear int   `json:"exceptionsToClear"`
	UnmatchedCount    int   `json:"unmatchedCount"`
	UnmatchedValue    Money `json:"unmatchedValue"`
	DataQualityFlags  int   `json:"dataQualityFlags"`
	AgentSuggestions  int   `json:"agentSuggestions"`
}

type OperatorThroughputData struct {
	ClearedToday int      `json:"clearedToday"`
	ClearedMonth int      `json:"clearedMonth"`
	DailyGoal    int      `json:"dailyGoal"`
	StreakDays   int      `json:"streakDays"`
	WeekLabels   []string `json:"weekLabels"`
	WeekSeries   []int    `json:"weekSeries"`
}

type ResumeItemData struct {
	ReconID    string `json:"reconId"`
	Party      string `json:"party"`
	Amount     Money  `json:"amount"`
	Tier       string `json:"tier"`
	Confidence int    `json:"confidence"`
	Note       string `json:"note"`
}

type OperatorTaskData struct {
	ID       string `json:"id"`
	Title    string `json:"title"`
	Type     string `json:"type"`
	Priority string `json:"priority"`
	Status   string `json:"status"`
	DueDate  string `json:"dueDate"`
}

type OperatorHomeData struct {
	Focus         OperatorFocusData      `json:"focus"`
	Throughput    OperatorThroughputData `json:"throughput"`
	Resume        ResumeItemData         `json:"resume"`
	Tasks         []OperatorTaskData     `json:"tasks"`
	IntakeBatches []IntakeBatchData      `json:"intakeBatches"`
}

type OwnerKPI struct {
	ID                string `json:"id"`
	Label             string `json:"label"`
	Money             Money  `json:"money"`
	Trend             Trend  `json:"trend"`
	PositiveDirection string `json:"positiveDirection"`
	IconTone          string `json:"iconTone"`
}

type OwnerCashFlow struct {
	NetPosition Money        `json:"netPosition"`
	Inflow      Money        `json:"inflow"`
	Outflow     Money        `json:"outflow"`
	Net         Money        `json:"net"`
	XLabels     []string     `json:"xLabels"`
	Series      []AreaSeries `json:"series"`
}

type OwnerHomeSummary struct {
	KPIs     []OwnerKPI    `json:"kpis"`
	CashFlow OwnerCashFlow `json:"cashFlow"`
}

type BusinessRiskData struct {
	ID       string `json:"id"`
	Title    string `json:"title"`
	Severity string `json:"severity"`
	Status   string `json:"status"`
	Owner    string `json:"owner"`
}

type OwnerRiskDashboardData struct {
	ControlPosture ControlPostureData   `json:"controlPosture"`
	Risks          []BusinessRiskData   `json:"risks"`
	Compliance     []ComplianceItemData `json:"compliance"`
}

type RecentDocument struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	Ext  string `json:"ext"`
	Size string `json:"size"`
	When string `json:"when"`
}

type RelationshipRow struct {
	ID        string `json:"id"`
	IconKey   string `json:"iconKey"`
	Label     string `json:"label"`
	Count     int    `json:"count"`
	TrendText string `json:"trendText"`
	TrendTone string `json:"trendTone"`
}

type OwnerDashboardData struct {
	Insights       []Insight             `json:"insights"`
	Relationships  []RelationshipRow     `json:"relationships"`
	CreditPassport CreditPassportSummary `json:"creditPassport"`
	Documents      []RecentDocument      `json:"documents"`
}

// ConsentGrantData is a tenant-scoped external data-sharing grant.
type ConsentGrantData struct {
	ID              string   `json:"id"`
	Grantee         string   `json:"grantee"`
	GranteeType     string   `json:"granteeType"`
	Purpose         string   `json:"purpose"`
	Scopes          []string `json:"scopes"`
	Status          string   `json:"status"`
	Basis           string   `json:"basis"`
	GrantedBy       string   `json:"grantedBy"`
	GrantedAt       string   `json:"grantedAt"`
	ExpiresAt       string   `json:"expiresAt"`
	LastAccessed    string   `json:"lastAccessed,omitempty"`
	RecipientUserID string   `json:"recipientUserId,omitempty"`
}

// Claims types.
type ClaimStageCounts struct {
	FNOL       int `json:"fnol"`
	Triage     int `json:"triage"`
	Adjusting  int `json:"adjusting"`
	Approval   int `json:"approval"`
	Settlement int `json:"settlement"`
	Closed     int `json:"closed"`
}

type ClaimHistoryEvent struct {
	ID        string `json:"id"`
	At        string `json:"at"`
	Actor     string `json:"actor"`
	ActorRole string `json:"actorRole"`
	Action    string `json:"action"`
	Note      string `json:"note,omitempty"`
}

type ClaimDocument struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	Type       string `json:"type"`
	URL        string `json:"url"`
	UploadedAt string `json:"uploadedAt"`
}

type ClaimRecord struct {
	ID                  string              `json:"id"`
	Claimant            string              `json:"claimant"`
	PolicyNumber        string              `json:"policyNumber"`
	Type                string              `json:"type"`
	Stage               string              `json:"stage"`
	IncidentDate        string              `json:"incidentDate"`
	ReportedDate        string              `json:"reportedDate"`
	Description         string              `json:"description"`
	ClaimedAmount       Money               `json:"claimedAmount"`
	Deductible          Money               `json:"deductible"`
	Reserve             Money               `json:"reserve"`
	SuggestedReserve    Money               `json:"suggestedReserve"`
	SuggestedSettlement Money               `json:"suggestedSettlement"`
	AISummary           string              `json:"aiSummary"`
	TriageSeverity      string              `json:"triageSeverity"`
	TriageFastTrack     bool                `json:"triageFastTrack"`
	FraudScore          int                 `json:"fraudScore"`
	FraudFlags          []string            `json:"fraudFlags"`
	AssignedTo          string              `json:"assignedTo"`
	SLAText             string              `json:"slaText"`
	PaymentReconciled   *bool               `json:"paymentReconciled,omitempty"`
	CoverageOK          bool                `json:"coverageOk"`
	Evidence            []EvidenceDoc       `json:"evidence"`
	History             []ClaimHistoryEvent `json:"history"`
	Documents           []ClaimDocument     `json:"documents"`
	NextAction          string              `json:"nextAction"`
}

type ClaimStats struct {
	OpenClaims    int              `json:"openClaims"`
	TotalReserves Money            `json:"totalReserves"`
	AvgCycleDays  float64          `json:"avgCycleDays"`
	FraudFlagged  int              `json:"fraudFlagged"`
	Pipeline      ClaimStageCounts `json:"pipeline"`
}

type ClaimsWorkspaceData struct {
	Claims []ClaimRecord `json:"claims"`
	Stats  ClaimStats    `json:"stats"`
}

func emptyClaimsWorkspace() *ClaimsWorkspaceData {
	return &ClaimsWorkspaceData{
		Claims: []ClaimRecord{},
		Stats: ClaimStats{
			TotalReserves: Money{AmountMinor: "0", Currency: "USD"},
			Pipeline:      ClaimStageCounts{},
		},
	}
}

// Auditor home.
type SODViolationData struct {
	ID       string `json:"id"`
	User     string `json:"user"`
	Conflict string `json:"conflict"`
	Detail   string `json:"detail"`
	Severity string `json:"severity"`
}

type MissingDocData struct {
	ID          string `json:"id"`
	DocType     string `json:"docType"`
	Party       string `json:"party"`
	Period      string `json:"period"`
	DaysMissing int    `json:"daysMissing"`
}

type ControlHealthData struct {
	Score     int                   `json:"score"`
	TrendPts  []int                 `json:"trendPts"`
	Subscores []ControlSubscoreData `json:"subscores"`
}

type RiskStatsData struct {
	RiskFlags     int `json:"riskFlags"`
	SODViolations int `json:"sodViolations"`
	Suspicious    int `json:"suspicious"`
	MissingDocs   int `json:"missingDocs"`
}

type AuditorHomeData struct {
	ControlHealth ControlHealthData  `json:"controlHealth"`
	RiskStats     RiskStatsData      `json:"riskStats"`
	SODViolations []SODViolationData `json:"sodViolations"`
	MissingDocs   []MissingDocData   `json:"missingDocs"`
}

// Relationships.
type PartyActivityData struct {
	Date string `json:"date"`
	Text string `json:"text"`
}

type RelationshipParty struct {
	ID                 string              `json:"id"`
	Type               string              `json:"type"`
	Name               string              `json:"name"`
	Contact            string              `json:"contact"`
	Email              string              `json:"email"`
	Phone              string              `json:"phone"`
	RelationshipType   string              `json:"relationshipType"`
	Status             string              `json:"status"`
	CreditLimit        Money               `json:"creditLimit"`
	OutstandingBalance Money               `json:"outstandingBalance"`
	Since              string              `json:"since"`
	Overdue            bool                `json:"overdue"`
	Activity           []PartyActivityData `json:"activity"`
}

type RelationshipsOverviewData struct {
	Parties       []RelationshipParty `json:"parties"`
	TotalParties  int                 `json:"totalParties"`
	ActiveParties int                 `json:"activeParties"`
}

// Platform console.
type PlatformAuditEventData struct {
	ID     string `json:"id"`
	Actor  string `json:"actor"`
	Action string `json:"action"`
	Target string `json:"target"`
	At     string `json:"at"`
	Icon   string `json:"icon"`
	Tone   string `json:"tone"`
}

type PlatformTenantRowData struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Plan   string `json:"plan"`
	Users  int    `json:"users"`
	MRR    string `json:"mrr"`
	Health string `json:"health"`
	Since  string `json:"since"`
}

type PlatformTenantMetrics struct {
	ActiveTenants string `json:"activeTenants"`
	TotalMRR      string `json:"totalMrr"`
	HealthScore   string `json:"healthScore"`
}

type PlatformUserData struct {
	ID    string `json:"id"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"`
	Last  string `json:"last"`
}

type PlatformSupportGrantData struct {
	ID     string `json:"id"`
	Tenant string `json:"tenant"`
	Status string `json:"status"`
	Detail string `json:"detail"`
	Tone   string `json:"tone"`
}

type PlatformFeatureFlag struct {
	ID   string `json:"id"`
	Name string `json:"name"`
	On   bool   `json:"on"`
}

type PlatformConsoleData struct {
	TenantMetrics PlatformTenantMetrics      `json:"tenantMetrics"`
	Tenants       []PlatformTenantRowData    `json:"tenants"`
	PlatformUsers []PlatformUserData         `json:"platformUsers"`
	SupportGrants []PlatformSupportGrantData `json:"supportGrants"`
	FeatureFlags  []PlatformFeatureFlag      `json:"featureFlags"`
	AuditEvents   []PlatformAuditEventData   `json:"auditEvents"`
}

// Settings.
type OrgProfileData struct {
	Name     string `json:"name"`
	Industry string `json:"industry"`
	Region   string `json:"region"`
	Timezone string `json:"timezone"`
	Country  string `json:"country"`
	TaxID    string `json:"taxId"`
}

type PolicyControlsData struct {
	AutoMatchThreshold  float64 `json:"autoMatchThreshold"`
	SuggestedThreshold  float64 `json:"suggestedThreshold"`
	DuplicateWindowDays int     `json:"duplicateWindowDays"`
	PaymentTolerance    string  `json:"paymentTolerance"`
	RenewalAlertDays    int     `json:"renewalAlertDays"`
}

type DataControlsData struct {
	RetentionDays  int      `json:"retentionDays"`
	DataCategories []string `json:"dataCategories"`
	ExportEnabled  bool     `json:"exportEnabled"`
	AnonymizeAfter int      `json:"anonymizeAfter"`
}

type SettingsBillingData struct {
	Plan          string `json:"plan"`
	PriceMonthly  string `json:"priceMonthly"`
	SeatsIncluded int    `json:"seatsIncluded"`
}

type SettingsOverviewData struct {
	OrgProfile     OrgProfileData      `json:"orgProfile"`
	PolicyControls PolicyControlsData  `json:"policyControls"`
	DataControls   DataControlsData    `json:"dataControls"`
	Billing        SettingsBillingData `json:"billing"`
}

type AccountSettingsData struct {
	Name      string `json:"name"`
	Email     string `json:"email"`
	Role      string `json:"role"`
	Timezone  string `json:"timezone"`
	Locale    string `json:"locale"`
	Theme     string `json:"theme"`
	TwoFactor bool   `json:"twoFactor"`
}

type MailMessageData struct {
	ID           string `json:"id"`
	Folder       string `json:"folder"`
	FromName     string `json:"fromName"`
	FromEmail    string `json:"fromEmail"`
	ToName       string `json:"toName"`
	ToEmail      string `json:"toEmail"`
	Subject      string `json:"subject"`
	Preview      string `json:"preview"`
	Body         string `json:"body"`
	Date         string `json:"date"`
	Read         bool   `json:"read"`
	Starred      bool   `json:"starred"`
	Label        string `json:"label"`
	AgentDrafted bool   `json:"agentDrafted"`
}

type MailboxData struct {
	Account   string            `json:"account"`
	Provider  string            `json:"provider"`
	Connected bool              `json:"connected"`
	Messages  []MailMessageData `json:"messages"`
}

// Intake.
type ExtractedField struct {
	Label      string  `json:"label"`
	Value      string  `json:"value"`
	Confidence float64 `json:"confidence"`
}

type IntakeDoc struct {
	ID         string           `json:"id"`
	Name       string           `json:"name"`
	Type       string           `json:"type"`
	Source     string           `json:"source"`
	ReceivedAt string           `json:"receivedAt"`
	Status     string           `json:"status"`
	Stage      string           `json:"stage"`
	SizeText   string           `json:"sizeText"`
	Fields     []ExtractedField `json:"fields"`
}

// Reports.
type ReportDef struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	Kind          string `json:"kind"`
	Schedule      string `json:"schedule"`
	Owner         string `json:"owner"`
	LastGenerated string `json:"lastGenerated,omitempty"`
	NextRun       string `json:"nextRun,omitempty"`
}

type ReportContent struct {
	KPIs []struct {
		Label string `json:"label"`
		Value string `json:"value"`
	} `json:"kpis"`
	Rows []map[string]string `json:"rows"`
}

// ROI.
type ROISummaryData struct {
	TotalValue       Money   `json:"totalValue"`
	SubscriptionCost Money   `json:"subscriptionCost"`
	ROIMultiple      float64 `json:"roiMultiple"`
	HoursSaved       int     `json:"hoursSaved"`
	Period           string  `json:"period"`
}

// Agent runtime evaluation.
type AgentsOverviewData struct {
	Agents    []AgentCardData          `json:"agents"`
	Stats     AgentStatsData           `json:"stats"`
	Activity  []AgentActivityEventData `json:"activity"`
	Feedback  []AgentFeedbackData      `json:"feedback"`
	RunningID string                   `json:"runningId,omitempty"`
}

type AgentCardData struct {
	ID             string `json:"id"`
	Name           string `json:"name"`
	Icon           string `json:"icon"`
	Status         string `json:"status"`
	Role           string `json:"role"`
	LastRun        string `json:"lastRun"`
	LastRunAt      string `json:"lastRunAt,omitempty"`
	AccuracyPct    int    `json:"accuracyPct"`
	Runs           int    `json:"runs"`
	Issues         int    `json:"issues"`
	ProcessedToday int    `json:"processedToday"`
	Insight        string `json:"insight"`
	Description    string `json:"description"`
}

type AgentStatsData struct {
	AgentsActive        int `json:"agentsActive"`
	ProcessedToday      int `json:"processedToday"`
	SuggestionsAwaiting int `json:"suggestionsAwaiting"`
	AvgAccuracyPct      int `json:"avgAccuracyPct"`
}

type AgentActivityEventData struct {
	ID        string `json:"id"`
	AgentID   string `json:"agentId"`
	AgentName string `json:"agentName"`
	At        string `json:"at"`
	Action    string `json:"action"`
	Detail    string `json:"detail"`
	Tone      string `json:"tone"`
	Link      string `json:"link,omitempty"`
	LinkTo    string `json:"linkTo,omitempty"`
}

type AgentFeedbackData struct {
	ID          string `json:"id"`
	AgentID     string `json:"agentId"`
	AgentName   string `json:"agentName"`
	Label       string `json:"label"`
	Comment     string `json:"comment"`
	SubmittedBy string `json:"submittedBy"`
	SubmittedAt string `json:"submittedAt"`
}

// Org users and approval rules (admin).
type OrgUserData struct {
	ID     string `json:"id"`
	Name   string `json:"name"`
	Email  string `json:"email"`
	Role   string `json:"role"`
	Status string `json:"status"`
}

type ApprovalRuleData struct {
	ID        string     `json:"id"`
	Name      string     `json:"name"`
	Scope     string     `json:"scope"`
	Threshold string     `json:"threshold"`
	Approvers []Approver `json:"approvers"`
	CreatedAt string     `json:"createdAt"`
}

// Collections management.
type EscalationItem struct {
	ID        string `json:"id"`
	Customer  string `json:"customer"`
	Invoice   string `json:"invoice"`
	Amount    Money  `json:"amount"`
	Days      int    `json:"days"`
	Requested string `json:"requested"`
	By        string `json:"by"`
	Note      string `json:"note"`
}

type CollectionsPolicy struct {
	ReminderCadence string `json:"reminderCadence"`
	DSOTarget       string `json:"dsoTarget"`
	AutoEscalateAt  string `json:"autoEscalateAt"`
}

type CollectionsManagementData struct {
	Overdue     []OverdueItem     `json:"overdue"`
	Escalations []EscalationItem  `json:"escalations"`
	Policy      CollectionsPolicy `json:"policy"`
}

// Finance lead home.
type FinanceLeadHomeData struct {
	CloseTasks []CloseTaskData `json:"closeTasks"`
}

// ROI summary payload backed by roi_facts rows.
type ROIItemData struct {
	ID       string  `json:"id"`
	Icon     string  `json:"icon"`
	Label    string  `json:"label"`
	Detail   string  `json:"detail"`
	Value    Money   `json:"value"`
	DeltaPct float64 `json:"deltaPct"`
}

type ROISummaryPayload struct {
	TotalValue       Money        `json:"totalValue"`
	SubscriptionCost Money        `json:"subscriptionCost"`
	ROIMultiple      float64      `json:"roiMultiple"`
	Series           []float64    `json:"series"`
	Labels           []string     `json:"labels"`
	Items            []ROIItemData `json:"items"`
	HoursSaved       int          `json:"hoursSaved"`
}

// Portal credit-passport payload shared with external collaborators.
type PortalCreditPassportPayload struct {
	Passport     PortalCreditPassportSummary   `json:"passport"`
	SubScores    []PortalCreditSubScore        `json:"subScores"`
	Trends       PortalCreditTrends            `json:"trends"`
	Affordability PortalCreditAffordability    `json:"affordability"`
	EvidencePack []PortalCreditEvidenceFactor  `json:"evidencePack"`
	Grant        PortalCreditGrantInfo         `json:"grant"`
}

type PortalCreditPassportSummary struct {
	Tenant   string `json:"tenant"`
	Score    int    `json:"score"`
	Label    string `json:"label"`
	Band     string `json:"band"`
	Updated  string `json:"updated"`
	SharedBy string `json:"sharedBy"`
}

type PortalCreditSubScore struct {
	ID       string `json:"id"`
	Label    string `json:"label"`
	Value    int    `json:"value"`
	Rating   string `json:"rating"`
	Evidence string `json:"evidence"`
}

type PortalCreditTrends struct {
	Labels   []string  `json:"labels"`
	Revenue  []float64 `json:"revenue"`
	Cashflow []float64 `json:"cashflow"`
}

type PortalCreditAffordability struct {
	MaxFacility     Money    `json:"maxFacility"`
	MonthlyCapacity Money    `json:"monthlyCapacity"`
	TermMonths      int      `json:"termMonths"`
	Assumptions     []string `json:"assumptions"`
}

type PortalCreditEvidenceFactor struct {
	ID      string `json:"id"`
	Factor  string `json:"factor"`
	DocName string `json:"docName"`
	Detail  string `json:"detail"`
}

type PortalCreditGrantInfo struct {
	ExpiresInDays  int      `json:"expiresInDays"`
	DataCategories []string `json:"dataCategories"`
	ScopeNote      string   `json:"scopeNote"`
}

func emptyOwnerHomeSummary() *OwnerHomeSummary {
	return &OwnerHomeSummary{
		KPIs:     []OwnerKPI{},
		CashFlow: OwnerCashFlow{XLabels: []string{}, Series: []AreaSeries{}},
	}
}

func emptyOwnerDashboard() *OwnerDashboardData {
	return &OwnerDashboardData{
		Insights:       []Insight{},
		Relationships:  []RelationshipRow{},
		CreditPassport: CreditPassportSummary{Factors: []CreditFactor{}},
		Documents:      []RecentDocument{},
	}
}

func emptyAdminDashboard() *AdminDashboardData {
	return &AdminDashboardData{
		Stats:          AdminStats{},
		Users:          []AdminUser{},
		AccessRequests: []AccessRequest{},
		AccessAlerts:   []AccessAlert{},
		Policies:       []PolicyVersion{},
		Billing:        BillingSummary{},
	}
}

func emptyOperatorHome() *OperatorHomeData {
	return &OperatorHomeData{
		Tasks:         []OperatorTaskData{},
		IntakeBatches: []IntakeBatchData{},
	}
}

func emptyAuditorHome() *AuditorHomeData {
	return &AuditorHomeData{
		ControlHealth: ControlHealthData{Subscores: []ControlSubscoreData{}},
		RiskStats:     RiskStatsData{},
		SODViolations: []SODViolationData{},
		MissingDocs:   []MissingDocData{},
	}
}

func emptyOwnerRiskDashboard() *OwnerRiskDashboardData {
	return &OwnerRiskDashboardData{
		ControlPosture: ControlPostureData{},
		Risks:          []BusinessRiskData{},
		Compliance:     []ComplianceItemData{},
	}
}

func emptyControlsClose() *ControlsCloseData {
	return &ControlsCloseData{
		Tasks:         []CloseTaskData{},
		Compliance:    []ComplianceItemData{},
		Subscores:     []ControlSubscoreData{},
		EvidenceGaps:  []EvidenceGapData{},
		ControlChecks: []ControlCheckData{},
	}
}
