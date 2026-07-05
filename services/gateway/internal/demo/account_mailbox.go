package demo

type AccountSettingsData struct {
	DisplayName     string `json:"displayName"`
	JobTitle        string `json:"jobTitle"`
	Phone           string `json:"phone"`
	Language        string `json:"language"`
	Theme           string `json:"theme"`
	DateFormat      string `json:"dateFormat"`
	NotifyApprovals bool   `json:"notifyApprovals"`
	NotifyMentions  bool   `json:"notifyMentions"`
	NotifyDigest    bool   `json:"notifyDigest"`
	NotifyAgent     bool   `json:"notifyAgent"`
	TwoFactor       bool   `json:"twoFactor"`
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
	Label        string `json:"label,omitempty"`
	AgentDrafted bool   `json:"agentDrafted,omitempty"`
}

type MailboxData struct {
	Connected bool              `json:"connected"`
	Account   string            `json:"account"`
	Provider  string            `json:"provider"`
	Messages  []MailMessageData `json:"messages"`
}

func AccountSettingsDemoData(displayName, role string) AccountSettingsData {
	if displayName == "" {
		displayName = "You"
	}
	if role == "" {
		role = "Finance Lead"
	}
	return AccountSettingsData{
		DisplayName:     displayName,
		JobTitle:        role,
		Phone:           "+250 788 555 121",
		Language:        "en",
		Theme:           "system",
		DateFormat:      "DMY",
		NotifyApprovals: true,
		NotifyMentions:  true,
		NotifyDigest:    true,
		NotifyAgent:     false,
		TwoFactor:       true,
	}
}

func MailboxDemoData(email, displayName, role string) MailboxData {
	firstName := displayName
	if firstName == "" {
		firstName = "You"
	}
	return MailboxData{
		Connected: false,
		Account:   "",
		Provider:  "",
		Messages: []MailMessageData{
			{
				ID:        email + "-i1",
				Folder:    "inbox",
				FromName:  "PT Imports - Accounts",
				FromEmail: "accounts@ptimports.rw",
				ToName:    firstName,
				ToEmail:   email,
				Subject:   "Re: Overdue invoice INV-10221",
				Preview:   "Apologies for the delay - we expect to settle by Friday...",
				Body:      "Hello,\n\nApologies for the delay on INV-10221. We have a cash-flow gap this week but expect to settle the full $48,600 by Friday.\n\nCould you confirm the bank details?\n\nRegards,\nPT Imports Accounts",
				Date:      "2025-05-18T09:12:00Z",
				Read:      false,
				Starred:   true,
				Label:     "collections",
			},
			{
				ID:           email + "-i2",
				Folder:       "inbox",
				FromName:     "Kora Agent",
				FromEmail:    "agents@kora.app",
				ToName:       firstName,
				ToEmail:      email,
				Subject:      "Your daily brief - approvals and exceptions",
				Preview:      "Good morning. Here is what needs you today...",
				Body:         "Good morning,\n\n7 approvals are waiting, 2 items were flagged by the audit agent, and your data quality queue has 3 documents needing review.\n\nOpen Kora to act.",
				Date:         "2025-05-18T06:45:00Z",
				Read:         false,
				Starred:      false,
				Label:        "approval",
				AgentDrafted: true,
			},
			{
				ID:        email + "-i3",
				Folder:    "inbox",
				FromName:  "Bank of Kigali",
				FromEmail: "statements@bk.rw",
				ToName:    firstName,
				ToEmail:   email,
				Subject:   "May statement available",
				Preview:   "Your May 2025 account statement is ready to download...",
				Body:      "Your May 2025 statement for account ****7781 is now available. 412 transactions this period.",
				Date:      "2025-05-17T18:00:00Z",
				Read:      true,
				Starred:   false,
				Label:     "general",
			},
			{
				ID:           email + "-s1",
				Folder:       "sent",
				FromName:     firstName,
				FromEmail:    email,
				ToName:       "Kigali Corporate Group",
				ToEmail:      "finance@kcg.rw",
				Subject:      "Payment reminder - INV-10198",
				Preview:      "A friendly reminder that invoice INV-10198 ($36,400) is now...",
				Body:         "Dear Kigali Corporate Group,\n\nA friendly reminder that invoice INV-10198 for $36,400 is now 48 days overdue. We value our partnership and would appreciate settlement at your earliest convenience.\n\nKind regards,\n" + firstName,
				Date:         "2025-05-17T14:05:00Z",
				Read:         true,
				Starred:      false,
				Label:        "collections",
				AgentDrafted: true,
			},
		},
	}
}
