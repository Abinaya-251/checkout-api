package main

import (
	"strings"
	"testing"
)

func TestCalculateCheckoutDiscounts(t *testing.T) {
	tests := []struct {
		name         string
		request      CheckoutRequest
		wantSubtotal int64
		wantDiscount int64
		wantTotal    int64
		wantCoupon   string
	}{
		{
			name: "SAVE10 rounds down to a whole paise",
			request: CheckoutRequest{
				Items:      []CheckoutItemRequest{{ProductID: "notebook", Quantity: 1}},
				CouponCode: "SAVE10",
			},
			wantSubtotal: 4999,
			wantDiscount: 499,
			wantTotal:    4500,
			wantCoupon:   "SAVE10",
		},
		{
			name: "FLAT100 applies the fixed discount",
			request: CheckoutRequest{
				Items:      []CheckoutItemRequest{{ProductID: "bag", Quantity: 1}},
				CouponCode: "FLAT100",
			},
			wantSubtotal: 129900,
			wantDiscount: 10000,
			wantTotal:    119900,
			wantCoupon:   "FLAT100",
		},
		{
			name: "FLAT100 cannot reduce the total below zero",
			request: CheckoutRequest{
				Items:      []CheckoutItemRequest{{ProductID: "notebook", Quantity: 1}},
				CouponCode: "FLAT100",
			},
			wantSubtotal: 4999,
			wantDiscount: 4999,
			wantTotal:    0,
			wantCoupon:   "FLAT100",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := calculateCheckout(test.request)
			if err != nil {
				t.Fatalf("calculateCheckout() error = %v", err)
			}

			if got.SubtotalPaise != test.wantSubtotal {
				t.Errorf("SubtotalPaise = %d, want %d", got.SubtotalPaise, test.wantSubtotal)
			}
			if got.DiscountPaise != test.wantDiscount {
				t.Errorf("DiscountPaise = %d, want %d", got.DiscountPaise, test.wantDiscount)
			}
			if got.TotalPaise != test.wantTotal {
				t.Errorf("TotalPaise = %d, want %d", got.TotalPaise, test.wantTotal)
			}
			if got.CouponCode != test.wantCoupon {
				t.Errorf("CouponCode = %q, want %q", got.CouponCode, test.wantCoupon)
			}
		})
	}
}

func TestCalculateCheckoutRejectsInvalidRequests(t *testing.T) {
	tests := []struct {
		name        string
		request     CheckoutRequest
		wantMessage string
	}{
		{
			name:        "empty cart",
			request:     CheckoutRequest{},
			wantMessage: "cart must contain at least one item",
		},
		{
			name: "unknown product",
			request: CheckoutRequest{
				Items: []CheckoutItemRequest{{ProductID: "missing", Quantity: 1}},
			},
			wantMessage: "unknown product ID",
		},
		{
			name: "zero quantity",
			request: CheckoutRequest{
				Items: []CheckoutItemRequest{{ProductID: "notebook", Quantity: 0}},
			},
			wantMessage: "quantity must be at least 1",
		},
		{
			name: "negative quantity",
			request: CheckoutRequest{
				Items: []CheckoutItemRequest{{ProductID: "notebook", Quantity: -1}},
			},
			wantMessage: "quantity must be at least 1",
		},
		{
			name: "quantity above per-item limit",
			request: CheckoutRequest{
				Items: []CheckoutItemRequest{{ProductID: "notebook", Quantity: maxQuantityPerItem + 1}},
			},
			wantMessage: "quantity exceeds the per-item limit",
		},
		{
			name: "quantity above total limit",
			request: CheckoutRequest{
				Items: []CheckoutItemRequest{
					{ProductID: "notebook", Quantity: maxQuantityPerItem},
					{ProductID: "mug", Quantity: maxQuantityPerItem},
					{ProductID: "bag", Quantity: maxQuantityPerItem},
					{ProductID: "notebook", Quantity: maxQuantityPerItem},
					{ProductID: "mug", Quantity: maxQuantityPerItem},
					{ProductID: "bag", Quantity: maxQuantityPerItem},
				},
			},
			wantMessage: "cart quantity exceeds the total limit",
		},
		{
			name: "invalid coupon",
			request: CheckoutRequest{
				Items:      []CheckoutItemRequest{{ProductID: "notebook", Quantity: 1}},
				CouponCode: "NOT-A-COUPON",
			},
			wantMessage: "invalid coupon code",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			_, err := calculateCheckout(test.request)
			if err == nil {
				t.Fatal("calculateCheckout() error = nil, want an error")
			}
			if !strings.Contains(err.Error(), test.wantMessage) {
				t.Errorf("error = %q, want it to contain %q", err, test.wantMessage)
			}
		})
	}
}
