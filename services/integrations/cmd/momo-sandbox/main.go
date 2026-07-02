package main

import (
	"context"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/kora-finance/kora/libs/connectors/momo"
)

func main() {
	if len(os.Args) < 2 {
		log.Fatalf("usage: momo-sandbox <provision|token|balance>")
	}
	switch os.Args[1] {
	case "provision":
		runProvision(os.Args[2:])
	case "token":
		runToken(os.Args[2:])
	case "balance":
		runBalance(os.Args[2:])
	default:
		log.Fatalf("unknown command %q", os.Args[1])
	}
}

func runProvision(args []string) {
	flags := flag.NewFlagSet("provision", flag.ExitOnError)
	subscriptionKey := flags.String("subscription-key", os.Getenv("MOMO_COLLECTION_SUBSCRIPTION_KEY"), "MTN MoMo collection subscription key")
	referenceID := flags.String("reference-id", os.Getenv("MOMO_COLLECTION_API_USER"), "UUID to use as the API user id")
	callbackHost := flags.String("callback-host", env("MOMO_COLLECTION_CALLBACK_HOST", "example.com"), "provider callback host for sandbox provisioning")
	baseURL := flags.String("base-url", env("MOMO_BASE_URL", "https://sandbox.momodeveloper.mtn.com"), "MoMo base URL")
	_ = flags.Parse(args)

	client := mustClient(momo.Config{
		BaseURL:              *baseURL,
		SubscriptionKey:      *subscriptionKey,
		ProviderCallbackHost: *callbackHost,
	})
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if *referenceID == "" {
		log.Fatal("reference-id is required and should be a UUID")
	}
	if err := client.CreateAPIUser(ctx, *referenceID); err != nil {
		log.Fatal(err)
	}
	apiKey, err := client.CreateAPIKey(ctx, *referenceID)
	if err != nil {
		log.Fatal(err)
	}
	printJSON(map[string]string{
		"api_user":      *referenceID,
		"api_key":       apiKey,
		"callback_host": *callbackHost,
	})
}

func runToken(args []string) {
	flags := flag.NewFlagSet("token", flag.ExitOnError)
	subscriptionKey := flags.String("subscription-key", os.Getenv("MOMO_COLLECTION_SUBSCRIPTION_KEY"), "MTN MoMo collection subscription key")
	apiUser := flags.String("api-user", os.Getenv("MOMO_COLLECTION_API_USER"), "MTN MoMo API user")
	apiKey := flags.String("api-key", os.Getenv("MOMO_COLLECTION_API_KEY"), "MTN MoMo API key")
	baseURL := flags.String("base-url", env("MOMO_BASE_URL", "https://sandbox.momodeveloper.mtn.com"), "MoMo base URL")
	_ = flags.Parse(args)

	client := mustClient(momo.Config{
		BaseURL:         *baseURL,
		SubscriptionKey: *subscriptionKey,
		APIUser:         *apiUser,
		APIKey:          *apiKey,
	})
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	token, err := client.CreateAccessToken(ctx)
	if err != nil {
		log.Fatal(err)
	}
	printJSON(token)
}

func runBalance(args []string) {
	flags := flag.NewFlagSet("balance", flag.ExitOnError)
	subscriptionKey := flags.String("subscription-key", os.Getenv("MOMO_COLLECTION_SUBSCRIPTION_KEY"), "MTN MoMo collection subscription key")
	apiUser := flags.String("api-user", os.Getenv("MOMO_COLLECTION_API_USER"), "MTN MoMo API user")
	apiKey := flags.String("api-key", os.Getenv("MOMO_COLLECTION_API_KEY"), "MTN MoMo API key")
	baseURL := flags.String("base-url", env("MOMO_BASE_URL", "https://sandbox.momodeveloper.mtn.com"), "MoMo base URL")
	_ = flags.Parse(args)

	client := mustClient(momo.Config{
		BaseURL:         *baseURL,
		SubscriptionKey: *subscriptionKey,
		APIUser:         *apiUser,
		APIKey:          *apiKey,
	})
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	balance, err := client.GetAccountBalance(ctx)
	if err != nil {
		log.Fatal(err)
	}
	printJSON(balance)
}

func mustClient(config momo.Config) *momo.Client {
	client, err := momo.NewClient(config)
	if err != nil {
		log.Fatal(err)
	}
	return client
}

func printJSON(value any) {
	payload, err := json.MarshalIndent(value, "", "  ")
	if err != nil {
		log.Fatal(err)
	}
	fmt.Println(string(payload))
}

func env(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
