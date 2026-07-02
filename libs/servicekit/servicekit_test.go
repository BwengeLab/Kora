package servicekit

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
)

func TestHealthHandlerIncludesDependencies(t *testing.T) {
	t.Setenv("KORA_DEPENDENCIES", "postgres=ok,redis=degraded")
	recorder := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/healthz", nil)

	HealthHandler("gateway")(recorder, request)

	var health Health
	if err := json.Unmarshal(recorder.Body.Bytes(), &health); err != nil {
		t.Fatalf("health json: %v", err)
	}
	if health.Dependencies["postgres"] != "ok" || health.Dependencies["redis"] != "degraded" {
		t.Fatalf("health = %+v env=%s", health, os.Getenv("KORA_DEPENDENCIES"))
	}
}

func TestObservabilityMiddlewarePropagatesTraceAndRecordsMetric(t *testing.T) {
	metrics := NewMetrics()
	next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-Kora-Trace-ID") != "trace-1" {
			t.Fatalf("missing trace on request")
		}
		w.WriteHeader(http.StatusCreated)
	})
	request := httptest.NewRequest(http.MethodPost, "/v1/test", nil)
	request.Header.Set("X-Kora-Trace-ID", "trace-1")
	recorder := httptest.NewRecorder()

	ObservabilityMiddleware("test-service", metrics, next).ServeHTTP(recorder, request)

	if recorder.Header().Get("X-Kora-Trace-ID") != "trace-1" {
		t.Fatalf("missing trace response header")
	}
	snapshot := metrics.Snapshot()
	key := `http_requests_total{method="POST",service="test-service",status="201"}`
	if snapshot[key] != 1 {
		t.Fatalf("metrics = %+v", snapshot)
	}
}

func TestMetricsHandlerRendersCounters(t *testing.T) {
	metrics := NewMetrics()
	metrics.Inc("requests_total", map[string]string{"service": "gateway"})
	recorder := httptest.NewRecorder()

	MetricsHandler(metrics)(recorder, httptest.NewRequest(http.MethodGet, "/metrics", nil))

	if !strings.Contains(recorder.Body.String(), `requests_total{service="gateway"} 1`) {
		t.Fatalf("metrics body = %s", recorder.Body.String())
	}
}
