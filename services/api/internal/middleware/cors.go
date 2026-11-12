package middleware

import (
	"net/http"
	"strings"
)

// CORSOptions menyimpan opsi konfigurasi middleware Cross-Origin Resource Sharing.
type CORSOptions struct {
	AllowedOrigins []string
	AllowedMethods []string
	AllowedHeaders []string
	MaxAgeSeconds  int
}

// DefaultCORSOptions mengembalikan konfigurasi default yang aman dan terarah untuk frontend Vite.
func DefaultCORSOptions() CORSOptions {
	return CORSOptions{
		AllowedOrigins: []string{
			"http://localhost:5173",
			"http://127.0.0.1:5173",
			"http://localhost:3000",
		},
		AllowedMethods: []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders: []string{"Content-Type", "Authorization", "Accept", "X-Requested-With"},
		MaxAgeSeconds:  86400,
	}
}

// CORS mengembalikan middleware HTTP untuk mengelola header CORS secara ketat dan aman.
func CORS(opts CORSOptions) func(http.Handler) http.Handler {
	methodsHeader := strings.Join(opts.AllowedMethods, ", ")
	headersHeader := strings.Join(opts.AllowedHeaders, ", ")

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			origin := r.Header.Get("Origin")

			// Periksa apakah origin diizinkan secara eksplisit
			isAllowed := false
			for _, allowed := range opts.AllowedOrigins {
				if allowed == "*" || allowed == origin {
					isAllowed = true
					break
				}
			}

			if isAllowed && origin != "" {
				w.Header().Set("Access-Control-Allow-Origin", origin)
				w.Header().Set("Access-Control-Allow-Methods", methodsHeader)
				w.Header().Set("Access-Control-Allow-Headers", headersHeader)
				w.Header().Set("Access-Control-Allow-Credentials", "true")
				w.Header().Set("Access-Control-Max-Age", "86400")
			}

			// Tangani HTTP OPTIONS preflight request
			if r.Method == http.MethodOptions {
				w.WriteHeader(http.StatusNoContent)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

