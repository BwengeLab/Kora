package servicekit

import (
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
	"sync"
	"time"
)

type Health struct {
	Service      string            `json:"service"`
	Status       string            `json:"status"`
	Version      string            `json:"version"`
	Dependencies map[string]string `json:"dependencies,omitempty"`
}

type Metrics struct {
	mu       sync.Mutex
	counters map[string]int64
}

func NewMetrics() *Metrics {
	return &Metrics{counters: map[string]int64{}}
}

func (m *Metrics) Inc(name string, labels map[string]string) {
	if m == nil || strings.TrimSpace(name) == "" {
		return
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	m.counters[metricKey(name, labels)]++
}

func (m *Metrics) Snapshot() map[string]int64 {
	if m == nil {
		return map[string]int64{}
	}
	m.mu.Lock()
	defer m.mu.Unlock()
	out := map[string]int64{}
	for key, value := range m.counters {
		out[key] = value
	}
	return out
}

func ListenAndServe(serviceName string) error {
	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", HealthHandler(serviceName))

	addr := ":" + env("PORT", "8080")
	log.Printf("%s listening on %s", serviceName, addr)
	return http.ListenAndServe(addr, mux)
}

func HealthHandler(serviceName string) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		_ = json.NewEncoder(w).Encode(Health{
			Service:      serviceName,
			Status:       "ok",
			Version:      version(),
			Dependencies: dependencyStatus(),
		})
	}
}

func MetricsHandler(metrics *Metrics) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain; version=0.0.4")
		for key, value := range metrics.Snapshot() {
			_, _ = w.Write([]byte(key + " " + strconv.FormatInt(value, 10) + "\n"))
		}
	}
}

func ObservabilityMiddleware(serviceName string, metrics *Metrics, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		traceID := r.Header.Get("X-Kora-Trace-ID")
		if traceID == "" {
			traceID = newTraceID()
		}
		r.Header.Set("X-Kora-Trace-ID", traceID)
		w.Header().Set("X-Kora-Trace-ID", traceID)
		recorder := &statusRecorder{ResponseWriter: w, status: http.StatusOK}
		next.ServeHTTP(recorder, r)
		if metrics != nil {
			metrics.Inc("http_requests_total", map[string]string{"service": serviceName, "method": r.Method, "status": strconv.Itoa(recorder.status)})
		}
		log.Printf(`{"trace_id":%q,"service":%q,"method":%q,"path":%q,"status":%d,"duration_ms":%d}`,
			traceID, serviceName, r.Method, r.URL.Path, recorder.status, time.Since(start).Milliseconds())
	})
}

type statusRecorder struct {
	http.ResponseWriter
	status int
}

func (r *statusRecorder) WriteHeader(status int) {
	r.status = status
	r.ResponseWriter.WriteHeader(status)
}

func env(key, fallback string) string {
	value := os.Getenv(key)
	if value == "" {
		return fallback
	}
	return value
}

func version() string {
	return env("KORA_VERSION", "dev")
}

func dependencyStatus() map[string]string {
	raw := os.Getenv("KORA_DEPENDENCIES")
	if raw == "" {
		return nil
	}
	out := map[string]string{}
	for _, item := range strings.Split(raw, ",") {
		parts := strings.SplitN(item, "=", 2)
		if len(parts) == 2 && strings.TrimSpace(parts[0]) != "" {
			out[strings.TrimSpace(parts[0])] = strings.TrimSpace(parts[1])
		}
	}
	return out
}

func metricKey(name string, labels map[string]string) string {
	if len(labels) == 0 {
		return name
	}
	keys := make([]string, 0, len(labels))
	for key := range labels {
		keys = append(keys, key)
	}
	for i := 1; i < len(keys); i++ {
		for j := i; j > 0 && keys[j] < keys[j-1]; j-- {
			keys[j], keys[j-1] = keys[j-1], keys[j]
		}
	}
	var b strings.Builder
	b.WriteString(name)
	b.WriteString("{")
	for index, key := range keys {
		if index > 0 {
			b.WriteString(",")
		}
		b.WriteString(key)
		b.WriteString(`="`)
		b.WriteString(strings.ReplaceAll(labels[key], `"`, `\"`))
		b.WriteString(`"`)
	}
	b.WriteString("}")
	return b.String()
}

func newTraceID() string {
	var value [16]byte
	if _, err := rand.Read(value[:]); err != nil {
		return strconv.FormatInt(time.Now().UnixNano(), 16)
	}
	return hex.EncodeToString(value[:])
}
