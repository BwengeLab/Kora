package main

import (
	"bytes"
	"crypto/rand"
	"encoding/json"
	"flag"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

func main() {
	if len(os.Args) < 2 {
		log.Fatalf("usage: momo-kora <register-connection|validate-auth|balance|validate-account-holder|request-to-pay|request-status|request-history|import-request|sync-statuses|simulate-receivables>")
	}
	switch os.Args[1] {
	case "register-connection":
		runRegisterConnection(os.Args[2:])
	case "validate-auth":
		runValidateAuth(os.Args[2:])
	case "balance":
		runBalance(os.Args[2:])
	case "validate-account-holder":
		runValidateAccountHolder(os.Args[2:])
	case "request-to-pay":
		runRequestToPay(os.Args[2:])
	case "request-status":
		runRequestStatus(os.Args[2:])
	case "request-history":
		runRequestHistory(os.Args[2:])
	case "import-request":
		runImportRequest(os.Args[2:])
	case "sync-statuses":
		runSyncStatuses(os.Args[2:])
	case "simulate-receivables":
		runSimulateReceivables(os.Args[2:])
	default:
		log.Fatalf("unknown command %q", os.Args[1])
	}
}

func runRegisterConnection(args []string) {
	flags := flag.NewFlagSet("register-connection", flag.ExitOnError)
	baseURL := flags.String("base-url", env("KORA_INTEGRATIONS_URL", "http://localhost:8080"), "Kora integrations server base URL")
	orgID := flags.String("organization-id", env("KORA_ORGANIZATION_ID", "org_1"), "organization id")
	userID := flags.String("user-id", env("KORA_ACTOR_USER_ID", "u_admin"), "actor user id")
	connectionID := flags.String("connection-id", env("MOMO_DEFAULT_CONNECTION_ID", "conn_momo"), "connector connection id")
	displayName := flags.String("display-name", env("MOMO_SYNC_CONNECTION_DISPLAY_NAME", "MTN MoMo"), "connector display name")
	secretRef := flags.String("secret-ref", env("MOMO_SYNC_CONNECTION_SECRET_REF", "secret://org_1/momo"), "connector secret reference")
	environment := flags.String("environment", env("MOMO_TARGET_ENVIRONMENT", "sandbox"), "connector environment")
	_ = flags.Parse(args)

	mustPost(*baseURL, "/v1/integrations/connections", map[string]any{
		"actor": actor(*userID, *orgID, "ORG_ADMIN"),
		"connection": map[string]any{
			"id":              *connectionID,
			"organization_id": *orgID,
			"kind":            "MOMO",
			"display_name":    *displayName,
			"secret_ref":      *secretRef,
			"active":          true,
			"config": map[string]string{
				"environment": *environment,
			},
		},
	})
}

func runValidateAuth(args []string) {
	flags := flag.NewFlagSet("validate-auth", flag.ExitOnError)
	baseURL := flags.String("base-url", env("KORA_INTEGRATIONS_URL", "http://localhost:8080"), "Kora integrations server base URL")
	orgID := flags.String("organization-id", env("KORA_ORGANIZATION_ID", "org_1"), "organization id")
	userID := flags.String("user-id", env("KORA_ACTOR_USER_ID", "u_admin"), "actor user id")
	_ = flags.Parse(args)

	mustPost(*baseURL, "/v1/integrations/momo/validate-auth", map[string]any{
		"actor": actor(*userID, *orgID, "ORG_ADMIN"),
	})
}

func runBalance(args []string) {
	flags := flag.NewFlagSet("balance", flag.ExitOnError)
	baseURL := flags.String("base-url", env("KORA_INTEGRATIONS_URL", "http://localhost:8080"), "Kora integrations server base URL")
	orgID := flags.String("organization-id", env("KORA_ORGANIZATION_ID", "org_1"), "organization id")
	userID := flags.String("user-id", env("KORA_ACTOR_USER_ID", "u_admin"), "actor user id")
	_ = flags.Parse(args)

	mustPost(*baseURL, "/v1/integrations/momo/balance", map[string]any{
		"actor": actor(*userID, *orgID, "ORG_ADMIN"),
	})
}

func runValidateAccountHolder(args []string) {
	flags := flag.NewFlagSet("validate-account-holder", flag.ExitOnError)
	baseURL := flags.String("base-url", env("KORA_INTEGRATIONS_URL", "http://localhost:8080"), "Kora integrations server base URL")
	orgID := flags.String("organization-id", env("KORA_ORGANIZATION_ID", "org_1"), "organization id")
	userID := flags.String("user-id", env("KORA_FINANCE_USER_ID", "u_fin"), "actor user id")
	partyIDType := flags.String("party-id-type", "MSISDN", "party id type")
	partyID := flags.String("party-id", "", "party id value")
	_ = flags.Parse(args)

	if strings.TrimSpace(*partyID) == "" {
		log.Fatal("party-id is required")
	}

	mustPost(*baseURL, "/v1/integrations/momo/validate-account-holder", map[string]any{
		"actor":         actor(*userID, *orgID, "FINANCE_LEAD"),
		"party_id_type": *partyIDType,
		"party_id":      *partyID,
	})
}

func runRequestToPay(args []string) {
	flags := flag.NewFlagSet("request-to-pay", flag.ExitOnError)
	baseURL := flags.String("base-url", env("KORA_INTEGRATIONS_URL", "http://localhost:8080"), "Kora integrations server base URL")
	orgID := flags.String("organization-id", env("KORA_ORGANIZATION_ID", "org_1"), "organization id")
	userID := flags.String("user-id", env("KORA_FINANCE_USER_ID", "u_fin"), "actor user id")
	connectionID := flags.String("connection-id", env("MOMO_DEFAULT_CONNECTION_ID", "conn_momo"), "connector connection id")
	callbackURL := flags.String("callback-url", "", "optional explicit callback URL override")
	referenceID := flags.String("reference-id", "", "request reference id")
	amount := flags.String("amount", "", "request amount")
	currency := flags.String("currency", env("MOMO_DEFAULT_CURRENCY", "EUR"), "request currency")
	externalID := flags.String("external-id", "", "external invoice or business id")
	payerMSISDN := flags.String("payer-msisdn", "", "payer MSISDN")
	payerMessage := flags.String("payer-message", "Kora request to pay", "payer message")
	payeeNote := flags.String("payee-note", "Kora sandbox collection", "payee note")
	_ = flags.Parse(args)

	if *referenceID == "" {
		generated, err := newUUIDv4()
		if err != nil {
			log.Fatal(err)
		}
		*referenceID = generated
	}
	if strings.TrimSpace(*amount) == "" || strings.TrimSpace(*externalID) == "" || strings.TrimSpace(*payerMSISDN) == "" {
		log.Fatal("amount, external-id, and payer-msisdn are required")
	}

	mustPost(*baseURL, "/v1/integrations/momo/request-to-pay", map[string]any{
		"actor":         actor(*userID, *orgID, "FINANCE_LEAD"),
		"connection_id": *connectionID,
		"callback_url":  *callbackURL,
		"reference_id":  *referenceID,
		"amount":        *amount,
		"currency":      *currency,
		"external_id":   *externalID,
		"payer_msisdn":  *payerMSISDN,
		"payer_message": *payerMessage,
		"payee_note":    *payeeNote,
	})
}

func runRequestStatus(args []string) {
	flags := flag.NewFlagSet("request-status", flag.ExitOnError)
	baseURL := flags.String("base-url", env("KORA_INTEGRATIONS_URL", "http://localhost:8080"), "Kora integrations server base URL")
	orgID := flags.String("organization-id", env("KORA_ORGANIZATION_ID", "org_1"), "organization id")
	userID := flags.String("user-id", env("KORA_FINANCE_USER_ID", "u_fin"), "actor user id")
	referenceID := flags.String("reference-id", "", "request reference id")
	_ = flags.Parse(args)

	if strings.TrimSpace(*referenceID) == "" {
		log.Fatal("reference-id is required")
	}

	mustPost(*baseURL, "/v1/integrations/momo/request-to-pay/status", map[string]any{
		"actor":        actor(*userID, *orgID, "FINANCE_LEAD"),
		"reference_id": *referenceID,
	})
}

func runRequestHistory(args []string) {
	flags := flag.NewFlagSet("request-history", flag.ExitOnError)
	baseURL := flags.String("base-url", env("KORA_INTEGRATIONS_URL", "http://localhost:8080"), "Kora integrations server base URL")
	orgID := flags.String("organization-id", env("KORA_ORGANIZATION_ID", "org_1"), "organization id")
	userID := flags.String("user-id", env("KORA_FINANCE_USER_ID", "u_fin"), "actor user id")
	referenceID := flags.String("reference-id", "", "request reference id")
	_ = flags.Parse(args)

	if strings.TrimSpace(*referenceID) == "" {
		log.Fatal("reference-id is required")
	}

	mustPost(*baseURL, "/v1/integrations/momo/request-to-pay/history", map[string]any{
		"actor":        actor(*userID, *orgID, "FINANCE_LEAD"),
		"reference_id": *referenceID,
	})
}

func runImportRequest(args []string) {
	flags := flag.NewFlagSet("import-request", flag.ExitOnError)
	baseURL := flags.String("base-url", env("KORA_INTEGRATIONS_URL", "http://localhost:8080"), "Kora integrations server base URL")
	orgID := flags.String("organization-id", env("KORA_ORGANIZATION_ID", "org_1"), "organization id")
	userID := flags.String("user-id", env("KORA_ACTOR_USER_ID", "u_admin"), "actor user id")
	connectionID := flags.String("connection-id", env("MOMO_DEFAULT_CONNECTION_ID", "conn_momo"), "connector connection id")
	referenceID := flags.String("reference-id", "", "request reference id")
	sourceName := flags.String("source-name", "momo-request-to-pay", "import source name")
	windowStart := flags.String("window-start", "", "import window start")
	windowEnd := flags.String("window-end", time.Now().UTC().Format(time.RFC3339), "import window end")
	syncCursor := flags.String("sync-cursor", "", "sync cursor")
	idempotencyKey := flags.String("idempotency-key", "", "idempotency key")
	_ = flags.Parse(args)

	if strings.TrimSpace(*referenceID) == "" {
		log.Fatal("reference-id is required")
	}
	if *syncCursor == "" {
		*syncCursor = *referenceID
	}
	if *idempotencyKey == "" {
		*idempotencyKey = "idem-import-" + *referenceID
	}

	mustPost(*baseURL, "/v1/integrations/momo/request-to-pay/import", map[string]any{
		"actor":        actor(*userID, *orgID, "ORG_ADMIN"),
		"reference_id": *referenceID,
		"input": map[string]any{
			"organization_id": *orgID,
			"connection_id":   *connectionID,
			"source_name":     *sourceName,
			"window_start":    *windowStart,
			"window_end":      *windowEnd,
			"sync_cursor":     *syncCursor,
			"idempotency_key": *idempotencyKey,
		},
	})
}

func runSyncStatuses(args []string) {
	flags := flag.NewFlagSet("sync-statuses", flag.ExitOnError)
	baseURL := flags.String("base-url", env("KORA_INTEGRATIONS_URL", "http://localhost:8080"), "Kora integrations server base URL")
	orgID := flags.String("organization-id", env("KORA_ORGANIZATION_ID", "org_1"), "organization id")
	userID := flags.String("user-id", env("KORA_ACTOR_USER_ID", "u_admin"), "actor user id")
	connectionID := flags.String("connection-id", env("MOMO_DEFAULT_CONNECTION_ID", "conn_momo"), "connector connection id")
	referenceIDs := flags.String("reference-ids", "", "comma-separated request reference ids")
	sourceName := flags.String("source-name", "momo-status-sync", "sync source name")
	windowStart := flags.String("window-start", "", "sync window start")
	windowEnd := flags.String("window-end", time.Now().UTC().Format(time.RFC3339), "sync window end")
	syncCursor := flags.String("sync-cursor", "", "sync cursor")
	idempotencyKey := flags.String("idempotency-key", "idem-momo-sync", "idempotency key prefix")
	autoImport := flags.Bool("auto-import", true, "auto import successful requests")
	_ = flags.Parse(args)

	var refs []string
	for _, item := range strings.Split(*referenceIDs, ",") {
		item = strings.TrimSpace(item)
		if item != "" {
			refs = append(refs, item)
		}
	}

	mustPost(*baseURL, "/v1/integrations/momo/request-to-pay/sync-statuses", map[string]any{
		"actor": actor(*userID, *orgID, "ORG_ADMIN"),
		"input": map[string]any{
			"organization_id": *orgID,
			"connection_id":   *connectionID,
			"source_name":     *sourceName,
			"window_start":    *windowStart,
			"window_end":      *windowEnd,
			"sync_cursor":     *syncCursor,
			"idempotency_key": *idempotencyKey,
		},
		"reference_ids": refs,
		"auto_import":   *autoImport,
	})
}

type scenarioCase struct {
	UserID      string `json:"user_id"`
	Category    string `json:"category"`
	ReferenceID string `json:"reference_id"`
	ExternalID  string `json:"external_id"`
	PayerMSISDN string `json:"payer_msisdn"`
	Amount      string `json:"amount"`
	Currency    string `json:"currency"`
	RequestOK   bool   `json:"request_ok"`
	Status      string `json:"status"`
	Imported    bool   `json:"imported"`
	Error       string `json:"error,omitempty"`
}

type scenarioSummary struct {
	Mode                 string         `json:"mode"`
	Count                int            `json:"count"`
	Categories           map[string]int `json:"categories"`
	RequestAcceptedCount int            `json:"request_accepted_count"`
	SuccessfulCount      int            `json:"successful_count"`
	ImportedCount        int            `json:"imported_count"`
	FailedCount          int            `json:"failed_count"`
	DurationSeconds      int            `json:"duration_seconds"`
	Cases                []scenarioCase `json:"cases"`
	Notes                []string       `json:"notes"`
}

func runSimulateReceivables(args []string) {
	flags := flag.NewFlagSet("simulate-receivables", flag.ExitOnError)
	baseURL := flags.String("base-url", env("KORA_INTEGRATIONS_URL", "http://localhost:8080"), "Kora integrations server base URL")
	orgID := flags.String("organization-id", env("KORA_ORGANIZATION_ID", "org_1"), "organization id")
	adminUserID := flags.String("admin-user-id", env("KORA_ACTOR_USER_ID", "u_admin"), "admin actor user id")
	financeUserID := flags.String("finance-user-id", env("KORA_FINANCE_USER_ID", "u_fin"), "finance actor user id")
	connectionID := flags.String("connection-id", env("MOMO_DEFAULT_CONNECTION_ID", "conn_momo"), "connector connection id")
	connectionDisplayName := flags.String("display-name", env("MOMO_SYNC_CONNECTION_DISPLAY_NAME", "MTN MoMo"), "connector display name")
	secretRef := flags.String("secret-ref", env("MOMO_SYNC_CONNECTION_SECRET_REF", "secret://org_1/momo"), "connector secret reference")
	environment := flags.String("environment", env("MOMO_TARGET_ENVIRONMENT", "sandbox"), "connector environment")
	count := flags.Int("count", 20, "number of simulated receivable cases")
	payersArg := flags.String("payer-msisdns", env("MOMO_TEST_MSISDNS", "250780000000"), "comma-separated sandbox MSISDNs")
	currency := flags.String("currency", env("MOMO_DEFAULT_CURRENCY", "EUR"), "collection currency")
	pollSeconds := flags.Int("poll-seconds", 3, "seconds between status polls")
	maxPolls := flags.Int("max-polls", 6, "maximum status polls per case")
	ensureConnection := flags.Bool("ensure-connection", true, "register the MoMo connection before running the scenario")
	_ = flags.Parse(args)

	if *count <= 0 {
		log.Fatal("count must be greater than zero")
	}
	payers := splitCSV(*payersArg)
	if len(payers) == 0 {
		log.Fatal("at least one payer-msisdn is required")
	}

	started := time.Now().UTC()
	if *ensureConnection {
		_, body, err := postJSON(*baseURL, "/v1/integrations/connections", map[string]any{
			"actor": actor(*adminUserID, *orgID, "ORG_ADMIN"),
			"connection": map[string]any{
				"id":              *connectionID,
				"organization_id": *orgID,
				"kind":            "MOMO",
				"display_name":    *connectionDisplayName,
				"secret_ref":      *secretRef,
				"active":          true,
				"config": map[string]string{
					"environment": *environment,
				},
			},
		})
		if err != nil && !strings.Contains(string(body), "already exists") {
			log.Fatalf("ensure connection failed: %v\n%s", err, string(body))
		}
	}

	categories := []string{"invoice", "premium", "installment", "other_receivable"}
	summary := scenarioSummary{
		Mode:       "sandbox_live",
		Count:      *count,
		Categories: map[string]int{},
		Cases:      make([]scenarioCase, 0, *count),
		Notes: []string{
			"This is a live MTN sandbox simulation through Kora, not production traffic.",
			"Sandbox may reuse one or more test MSISDNs rather than twenty distinct real customer wallets.",
			"Business categories are simulated as receivable scenarios: invoice, premium, installment, and other_receivable.",
		},
	}

	for i := 0; i < *count; i++ {
		category := categories[i%len(categories)]
		summary.Categories[category]++
		refID, err := newUUIDv4()
		if err != nil {
			log.Fatal(err)
		}
		caseItem := scenarioCase{
			UserID:      fmt.Sprintf("sim-user-%02d", i+1),
			Category:    category,
			ReferenceID: refID,
			ExternalID:  fmt.Sprintf("%s-%03d", category, i+1),
			PayerMSISDN: payers[i%len(payers)],
			Amount:      scenarioAmount(i + 1),
			Currency:    *currency,
		}

		_, body, err := postJSON(*baseURL, "/v1/integrations/momo/request-to-pay", map[string]any{
			"actor":         actor(*financeUserID, *orgID, "FINANCE_LEAD"),
			"connection_id": *connectionID,
			"reference_id":  caseItem.ReferenceID,
			"amount":        caseItem.Amount,
			"currency":      caseItem.Currency,
			"external_id":   caseItem.ExternalID,
			"payer_msisdn":  caseItem.PayerMSISDN,
			"payer_message": "Kora " + strings.ReplaceAll(category, "_", " ") + " collection",
			"payee_note":    "Kora sandbox collection",
		})
		if err != nil {
			caseItem.Error = string(body)
			summary.FailedCount++
			summary.Cases = append(summary.Cases, caseItem)
			continue
		}
		caseItem.RequestOK = true
		summary.RequestAcceptedCount++

		for poll := 0; poll < *maxPolls; poll++ {
			time.Sleep(time.Duration(*pollSeconds) * time.Second)
			_, statusBody, statusErr := postJSON(*baseURL, "/v1/integrations/momo/request-to-pay/status", map[string]any{
				"actor":        actor(*financeUserID, *orgID, "FINANCE_LEAD"),
				"reference_id": caseItem.ReferenceID,
			})
			if statusErr != nil {
				caseItem.Error = string(statusBody)
				continue
			}
			var statusResp struct {
				Status string `json:"status"`
			}
			if err := json.Unmarshal(statusBody, &statusResp); err != nil {
				caseItem.Error = err.Error()
				continue
			}
			caseItem.Status = statusResp.Status
			if strings.EqualFold(statusResp.Status, "SUCCESSFUL") || strings.EqualFold(statusResp.Status, "FAILED") {
				break
			}
		}

		if strings.EqualFold(caseItem.Status, "SUCCESSFUL") {
			summary.SuccessfulCount++
			_, importBody, importErr := postJSON(*baseURL, "/v1/integrations/momo/request-to-pay/import", map[string]any{
				"actor":        actor(*adminUserID, *orgID, "ORG_ADMIN"),
				"reference_id": caseItem.ReferenceID,
				"input": map[string]any{
					"organization_id": *orgID,
					"connection_id":   *connectionID,
					"source_name":     "momo-receivables-simulation",
					"window_end":      time.Now().UTC().Format(time.RFC3339),
					"sync_cursor":     caseItem.ReferenceID,
					"idempotency_key": "scenario-import-" + caseItem.ReferenceID,
				},
			})
			if importErr != nil {
				caseItem.Error = string(importBody)
				summary.FailedCount++
			} else {
				caseItem.Imported = true
				summary.ImportedCount++
			}
		} else {
			summary.FailedCount++
			if caseItem.Error == "" && caseItem.Status == "" {
				caseItem.Error = "status did not reach a terminal state within polling window"
			}
		}

		summary.Cases = append(summary.Cases, caseItem)
	}

	summary.DurationSeconds = int(time.Since(started).Seconds())
	printJSON(summary)
}

func mustPost(baseURL string, path string, payload any) {
	_, responseBody, err := postJSON(baseURL, path, payload)
	if err != nil {
		log.Fatalf("request failed: %v\n%s", err, string(responseBody))
	}
	printPretty(responseBody)
}

func actor(userID string, organizationID string, role string) map[string]any {
	return map[string]any{
		"UserID":         userID,
		"OrganizationID": organizationID,
		"Roles":          []string{role},
	}
}

func env(key string, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

func newUUIDv4() (string, error) {
	var data [16]byte
	if _, err := rand.Read(data[:]); err != nil {
		return "", err
	}
	data[6] = (data[6] & 0x0f) | 0x40
	data[8] = (data[8] & 0x3f) | 0x80
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		uint32(data[0])<<24|uint32(data[1])<<16|uint32(data[2])<<8|uint32(data[3]),
		uint16(data[4])<<8|uint16(data[5]),
		uint16(data[6])<<8|uint16(data[7]),
		uint16(data[8])<<8|uint16(data[9]),
		uint64(data[10])<<40|uint64(data[11])<<32|uint64(data[12])<<24|uint64(data[13])<<16|uint64(data[14])<<8|uint64(data[15]),
	), nil
}

func postJSON(baseURL string, path string, payload any) (int, []byte, error) {
	body, err := json.Marshal(payload)
	if err != nil {
		return 0, nil, err
	}
	request, err := http.NewRequest(http.MethodPost, strings.TrimRight(baseURL, "/")+path, bytes.NewReader(body))
	if err != nil {
		return 0, nil, err
	}
	request.Header.Set("Content-Type", "application/json")
	client := &http.Client{Timeout: 30 * time.Second}
	response, err := client.Do(request)
	if err != nil {
		return 0, nil, err
	}
	defer response.Body.Close()
	responseBody, err := io.ReadAll(response.Body)
	if err != nil {
		return response.StatusCode, nil, err
	}
	if response.StatusCode >= 400 {
		return response.StatusCode, responseBody, fmt.Errorf("%s", response.Status)
	}
	return response.StatusCode, responseBody, nil
}

func printPretty(responseBody []byte) {
	var pretty bytes.Buffer
	if err := json.Indent(&pretty, responseBody, "", "  "); err == nil {
		fmt.Println(pretty.String())
		return
	}
	fmt.Println(string(responseBody))
}

func printJSON(value any) {
	payload, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println(string(payload))
}

func splitCSV(input string) []string {
	out := make([]string, 0)
	for _, item := range strings.Split(input, ",") {
		item = strings.TrimSpace(item)
		if item != "" {
			out = append(out, item)
		}
	}
	return out
}

func scenarioAmount(index int) string {
	switch index % 4 {
	case 1:
		return "1"
	case 2:
		return "2"
	case 3:
		return "3"
	default:
		return "4"
	}
}
