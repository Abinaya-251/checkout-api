package main

import (
	"errors"
	"strings"
)

const (
	maxCartItems               = 50
	maxQuantityPerItem         = 99
	maxTotalCartQuantity       = 500
	flat100DiscountPaise int64 = 10000
)

var productsByID = map[string]Product{
	"notebook": {ID: "notebook", Name: "Notebook", PricePaise: 4999},
	"mug":      {ID: "mug", Name: "Coffee Mug", PricePaise: 29900},
	"bag":      {ID: "bag", Name: "Canvas Bag", PricePaise: 129900},
}

func listProducts() []Product {
	return []Product{
		productsByID["notebook"],
		productsByID["mug"],
		productsByID["bag"],
	}
}

func calculateCheckout(request CheckoutRequest) (CheckoutResponse, error) {
	if len(request.Items) == 0 {
		return CheckoutResponse{}, errors.New("cart must contain at least one item")
	}
	if len(request.Items) > maxCartItems {
		return CheckoutResponse{}, errors.New("cart contains too many items")
	}

	var subtotalPaise int64
	totalQuantity := 0

	for _, item := range request.Items {
		if item.Quantity < 1 {
			return CheckoutResponse{}, errors.New("quantity must be at least 1")
		}
		if item.Quantity > maxQuantityPerItem {
			return CheckoutResponse{}, errors.New("quantity exceeds the per-item limit")
		}
		if totalQuantity+item.Quantity > maxTotalCartQuantity {
			return CheckoutResponse{}, errors.New("cart quantity exceeds the total limit")
		}

		product, exists := productsByID[item.ProductID]
		if !exists {
			return CheckoutResponse{}, errors.New("unknown product ID")
		}

		totalQuantity += item.Quantity
		subtotalPaise += product.PricePaise * int64(item.Quantity)
	}

	couponCode := strings.ToUpper(strings.TrimSpace(request.CouponCode))
	var discountPaise int64

	switch couponCode {
	case "":
		couponCode = ""
	case "SAVE10":
		// Percentage discounts round down to the nearest whole paise.
		discountPaise = subtotalPaise / 10
	case "FLAT100":
		discountPaise = flat100DiscountPaise
		if discountPaise > subtotalPaise {
			discountPaise = subtotalPaise
		}
	default:
		return CheckoutResponse{}, errors.New("invalid coupon code")
	}

	totalPaise := subtotalPaise - discountPaise
	if totalPaise < 0 {
		totalPaise = 0
	}

	return CheckoutResponse{
		SubtotalPaise: subtotalPaise,
		DiscountPaise: discountPaise,
		TotalPaise:    totalPaise,
		CouponCode:    couponCode,
	}, nil
}
