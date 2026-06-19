package authmw

import (
	"context"
	"encoding/json"
	"net/http"
	"strings"
	"time"

	"github.com/kora-finance/kora/libs/auth"
)

type contextKey string

const claimsKey contextKey = "kora.auth.claims"

func Middleware(secret []byte, next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		header := r.Header.Get("Authorization")
		if !strings.HasPrefix(header, "Bearer ") {
			writeAuthError(w, "missing bearer token")
			return
		}
		claims, err := auth.VerifyJWT(strings.TrimPrefix(header, "Bearer "), secret, now())
		if err != nil {
			writeAuthError(w, err.Error())
			return
		}
		ctx := context.WithValue(r.Context(), claimsKey, claims)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func ClaimsFromContext(ctx context.Context) (auth.Claims, bool) {
	claims, ok := ctx.Value(claimsKey).(auth.Claims)
	return claims, ok
}

var now = time.Now

func writeAuthError(w http.ResponseWriter, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusUnauthorized)
	_ = json.NewEncoder(w).Encode(map[string]string{"error": message})
}
