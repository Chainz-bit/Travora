package booking

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha512"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"
)

const (
	midtransSandboxBaseURL    = "https://api.sandbox.midtrans.com"
	midtransProductionBaseURL = "https://api.midtrans.com"
)

// MidtransChargeInput berisi data untuk membuat transaksi QRIS di Midtrans Core API.
type MidtransChargeInput struct {
	OrderID      string
	GrossAmount  int64
	CustomerName string
	Phone        string
	ExpiryMinute int
}

// MidtransChargeResult berisi hasil transaksi QRIS dari Midtrans.
type MidtransChargeResult struct {
	OrderID           string
	TransactionStatus string
	QRISURL           string
	ExpiresAt         time.Time
}

// MidtransStatusResult berisi status transaksi dari GET /v2/{order_id}/status.
type MidtransStatusResult struct {
	OrderID           string
	StatusCode        string
	GrossAmount       string
	TransactionStatus string
	SettlementTime    string
}

// MidtransClient mendefinisikan kontrak komunikasi dengan Midtrans Core API v2.
type MidtransClient interface {
	IsConfigured() bool
	IsProduction() bool
	ChargeQRIS(ctx context.Context, input MidtransChargeInput) (*MidtransChargeResult, error)
	GetTransactionStatus(ctx context.Context, orderID string) (*MidtransStatusResult, error)
	VerifySignature(orderID, statusCode, grossAmount, signatureKey string) bool
}

type httpMidtransClient struct {
	serverKey    string
	signatureKey string
	isProduction bool
	baseURL      string
	httpClient   *http.Client
}

// NewMidtransClient membuat client HTTP standar untuk Midtrans Core API v2 (tanpa library eksternal).
// signatureKey bersifat opsional; jika kosong, otomatis menggunakan serverKey.
func NewMidtransClient(serverKey string, isProduction bool, signatureKey ...string) MidtransClient {
	baseURL := midtransSandboxBaseURL
	if isProduction {
		baseURL = midtransProductionBaseURL
	}
	srvKey := strings.TrimSpace(serverKey)
	sigKey := srvKey
	if len(signatureKey) > 0 && strings.TrimSpace(signatureKey[0]) != "" {
		sigKey = strings.TrimSpace(signatureKey[0])
	}
	return &httpMidtransClient{
		serverKey:    srvKey,
		signatureKey: sigKey,
		isProduction: isProduction,
		baseURL:      baseURL,
		httpClient: &http.Client{
			Timeout: 15 * time.Second,
		},
	}
}

func (c *httpMidtransClient) IsConfigured() bool {
	return c.serverKey != ""
}

func (c *httpMidtransClient) IsProduction() bool {
	return c.isProduction
}

func (c *httpMidtransClient) authHeader() string {
	encoded := base64.StdEncoding.EncodeToString([]byte(c.serverKey + ":"))
	return "Basic " + encoded
}

// ChargeQRIS memanggil POST /v2/charge pada Midtrans Core API untuk menghasilkan kode QRIS dinamis.
func (c *httpMidtransClient) ChargeQRIS(ctx context.Context, input MidtransChargeInput) (*MidtransChargeResult, error) {
	if !c.IsConfigured() {
		return nil, ErrMidtransNotConfigured
	}

	expiryMinutes := input.ExpiryMinute
	if expiryMinutes <= 0 {
		expiryMinutes = QRISExpiryMinutes
	}

	payload := map[string]any{
		"payment_type": "qris",
		"transaction_details": map[string]any{
			"order_id":     input.OrderID,
			"gross_amount": input.GrossAmount,
		},
		"qris": map[string]any{
			"acquirer": "gopay",
		},
		"custom_expiry": map[string]any{
			"expiry_duration": expiryMinutes,
			"unit":            "minute",
		},
		"customer_details": map[string]any{
			"first_name": input.CustomerName,
			"phone":      input.Phone,
		},
	}

	bodyBytes, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("gagal serialisasi payload Midtrans: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, c.baseURL+"/v2/charge", bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("gagal membuat request Midtrans: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", c.authHeader())

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("gagal menghubungi Midtrans API: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 1048576))
	if err != nil {
		return nil, fmt.Errorf("gagal membaca respons Midtrans: %w", err)
	}

	var parsed struct {
		StatusCode        string   `json:"status_code"`
		StatusMessage     string   `json:"status_message"`
		ErrorMessages     []string `json:"error_messages"`
		OrderID           string   `json:"order_id"`
		TransactionStatus string   `json:"transaction_status"`
		ExpiryTime        string   `json:"expiry_time"`
		Actions           []struct {
			Name string `json:"name"`
			URL  string `json:"url"`
		} `json:"actions"`
	}

	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return nil, fmt.Errorf("respons Midtrans bukan JSON valid (HTTP %d): %w", resp.StatusCode, err)
	}

	if parsed.StatusCode != "201" && parsed.StatusCode != "200" {
		detail := parsed.StatusMessage
		if detail == "" && len(parsed.ErrorMessages) > 0 {
			detail = strings.Join(parsed.ErrorMessages, "; ")
		}
		if detail == "" {
			detail = strings.TrimSpace(string(respBody))
		}
		code := parsed.StatusCode
		if code == "" {
			code = fmt.Sprintf("HTTP %d", resp.StatusCode)
		}
		return nil, fmt.Errorf("Midtrans menolak transaksi QRIS (%s): %s", code, detail)
	}

	qrisURL := ""
	for _, action := range parsed.Actions {
		if action.Name == "generate-qr-code" {
			qrisURL = action.URL
			break
		}
		if action.Name == "generate-qr-code-v2" && qrisURL == "" {
			qrisURL = action.URL
		}
	}

	if qrisURL == "" {
		return nil, fmt.Errorf("Midtrans tidak mengembalikan URL gambar QRIS")
	}

	expiresAt := time.Now().Add(time.Duration(expiryMinutes) * time.Minute)
	if parsed.ExpiryTime != "" {
		if t, parseErr := parseMidtransTime(parsed.ExpiryTime); parseErr == nil {
			expiresAt = t
		}
	}

	return &MidtransChargeResult{
		OrderID:           parsed.OrderID,
		TransactionStatus: parsed.TransactionStatus,
		QRISURL:           qrisURL,
		ExpiresAt:         expiresAt,
	}, nil
}

// GetTransactionStatus memeriksa status transaksi terkini langsung ke Midtrans Core API.
func (c *httpMidtransClient) GetTransactionStatus(ctx context.Context, orderID string) (*MidtransStatusResult, error) {
	if !c.IsConfigured() {
		return nil, ErrMidtransNotConfigured
	}

	url := fmt.Sprintf("%s/v2/%s/status", c.baseURL, orderID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("gagal membuat request status Midtrans: %w", err)
	}
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", c.authHeader())

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("gagal menghubungi Midtrans status API: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(io.LimitReader(resp.Body, 1048576))
	if err != nil {
		return nil, fmt.Errorf("gagal membaca respons status Midtrans: %w", err)
	}

	var parsed struct {
		StatusCode        string `json:"status_code"`
		StatusMessage     string `json:"status_message"`
		OrderID           string `json:"order_id"`
		GrossAmount       string `json:"gross_amount"`
		TransactionStatus string `json:"transaction_status"`
		SettlementTime    string `json:"settlement_time"`
	}

	if err := json.Unmarshal(respBody, &parsed); err != nil {
		return nil, fmt.Errorf("respons status Midtrans bukan JSON valid: %w", err)
	}

	if parsed.StatusCode == "404" {
		return nil, ErrBookingNotFound
	}

	return &MidtransStatusResult{
		OrderID:           parsed.OrderID,
		StatusCode:        parsed.StatusCode,
		GrossAmount:       parsed.GrossAmount,
		TransactionStatus: parsed.TransactionStatus,
		SettlementTime:    parsed.SettlementTime,
	}, nil
}

// VerifySignature memvalidasi signature_key webhook Midtrans menggunakan SHA-512 secara constant-time.
// Rumus resmi Midtrans: SHA512(order_id + status_code + gross_amount + SignatureKey)
func (c *httpMidtransClient) VerifySignature(orderID, statusCode, grossAmount, signatureKey string) bool {
	if c.signatureKey == "" || signatureKey == "" {
		return false
	}

	raw := orderID + statusCode + grossAmount + c.signatureKey
	sum := sha512.Sum512([]byte(raw))
	expectedHex := hex.EncodeToString(sum[:])

	return hmac.Equal([]byte(strings.ToLower(expectedHex)), []byte(strings.ToLower(strings.TrimSpace(signatureKey))))
}

func parseMidtransTime(raw string) (time.Time, error) {
	loc, err := time.LoadLocation("Asia/Jakarta")
	if err != nil {
		loc = time.FixedZone("WIB", 7*3600)
	}
	if t, err := time.ParseInLocation("2006-01-02 15:04:05", raw, loc); err == nil {
		return t, nil
	}
	return time.Parse(time.RFC3339, raw)
}
