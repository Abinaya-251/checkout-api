package main

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHealthAndProductsRoutes(t *testing.T) {
	router := newRouter()

	healthResponse := httptest.NewRecorder()
	router.ServeHTTP(healthResponse, httptest.NewRequest(http.MethodGet, "/api/health", nil))

	if healthResponse.Code != http.StatusOK {
		t.Fatalf("health status = %d, want %d", healthResponse.Code, http.StatusOK)
	}
	var health map[string]string
	if err := json.Unmarshal(healthResponse.Body.Bytes(), &health); err != nil {
		t.Fatalf("decode health response: %v", err)
	}
	if health["status"] != "ok" {
		t.Errorf("health status value = %q, want %q", health["status"], "ok")
	}

	productsResponse := httptest.NewRecorder()
	router.ServeHTTP(productsResponse, httptest.NewRequest(http.MethodGet, "/api/products", nil))

	if productsResponse.Code != http.StatusOK {
		t.Fatalf("products status = %d, want %d", productsResponse.Code, http.StatusOK)
	}
	var products []Product
	if err := json.Unmarshal(productsResponse.Body.Bytes(), &products); err != nil {
		t.Fatalf("decode products response: %v", err)
	}
	if len(products) != 3 {
		t.Errorf("product count = %d, want 3", len(products))
	}
	for _, product := range products {
		if product.ID == "" || product.PricePaise <= 0 {
			t.Errorf("product has invalid ID or price: %+v", product)
		}
	}
}

func TestCheckoutRouteValidatesJSONAndReturnsConsistentErrors(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		wantStatus int
		wantError  string
	}{
		{
			name:       "client cannot provide a price",
			body:       `{"items":[{"productId":"notebook","quantity":1,"pricePaise":1}]}`,
			wantStatus: http.StatusBadRequest,
			wantError:  "invalid JSON request",
		},
		{
			name:       "invalid coupon",
			body:       `{"items":[{"productId":"notebook","quantity":1}],"couponCode":"BAD"}`,
			wantStatus: http.StatusBadRequest,
			wantError:  "invalid coupon code",
		},
		{
			name:       "malformed JSON",
			body:       `{"items":`,
			wantStatus: http.StatusBadRequest,
			wantError:  "invalid JSON request",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			request := httptest.NewRequest(http.MethodPost, "/api/checkout", strings.NewReader(test.body))
			request.Header.Set("Content-Type", "application/json")
			response := httptest.NewRecorder()
			newRouter().ServeHTTP(response, request)

			if response.Code != test.wantStatus {
				t.Fatalf("status = %d, want %d", response.Code, test.wantStatus)
			}

			var body ErrorResponse
			if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
				t.Fatalf("decode error response: %v", err)
			}
			if body.Error != test.wantError {
				t.Errorf("error = %q, want %q", body.Error, test.wantError)
			}
		})
	}
}

func TestCORSPreflightAllowsLocalViteOrigin(t *testing.T) {
	request := httptest.NewRequest(http.MethodOptions, "/api/checkout", nil)
	request.Header.Set("Origin", "http://localhost:5173")
	response := httptest.NewRecorder()

	newRouter().ServeHTTP(response, request)

	if response.Code != http.StatusNoContent {
		t.Fatalf("status = %d, want %d", response.Code, http.StatusNoContent)
	}
	if got := response.Header().Get("Access-Control-Allow-Origin"); got != "http://localhost:5173" {
		t.Errorf("Access-Control-Allow-Origin = %q, want %q", got, "http://localhost:5173")
	}
}
