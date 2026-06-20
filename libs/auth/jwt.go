package auth

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"
)

type Claims struct {
	Subject        string   `json:"sub"`
	OrganizationID string   `json:"org"`
	Plane          string   `json:"plane"`
	Roles          []string `json:"roles"`
	Permissions    []string `json:"permissions"`
	ExpiresAt      int64    `json:"exp"`
	IssuedAt       int64    `json:"iat"`
}

func SignJWT(claims Claims, secret []byte) (string, error) {
	if len(secret) == 0 {
		return "", errors.New("jwt secret is required")
	}
	header := map[string]string{"alg": "HS256", "typ": "JWT"}
	headerBytes, err := json.Marshal(header)
	if err != nil {
		return "", err
	}
	claimsBytes, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}
	unsigned := base64.RawURLEncoding.EncodeToString(headerBytes) + "." + base64.RawURLEncoding.EncodeToString(claimsBytes)
	signature := sign(unsigned, secret)
	return unsigned + "." + signature, nil
}

func VerifyJWT(token string, secret []byte, now time.Time) (Claims, error) {
	if len(secret) == 0 {
		return Claims{}, errors.New("jwt secret is required")
	}
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return Claims{}, errors.New("invalid jwt format")
	}
	unsigned := parts[0] + "." + parts[1]
	if !hmac.Equal([]byte(parts[2]), []byte(sign(unsigned, secret))) {
		return Claims{}, errors.New("invalid jwt signature")
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return Claims{}, err
	}
	var claims Claims
	if err := json.Unmarshal(payload, &claims); err != nil {
		return Claims{}, err
	}
	if claims.ExpiresAt <= now.Unix() {
		return Claims{}, errors.New("jwt expired")
	}
	return claims, nil
}

func NewRefreshToken() (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(bytes), nil
}

func HashSecret(secret string, salt string) string {
	sum := sha256.Sum256([]byte(salt + ":" + secret))
	return hex.EncodeToString(sum[:])
}

func NewID(prefix string) (string, error) {
	bytes := make([]byte, 12)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return fmt.Sprintf("%s_%s", prefix, base64.RawURLEncoding.EncodeToString(bytes)), nil
}

func sign(unsigned string, secret []byte) string {
	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(unsigned))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}
