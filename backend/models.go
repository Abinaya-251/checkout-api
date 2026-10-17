package main

type Product struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	PricePaise int64  `json:"pricePaise"`
}

type CheckoutItemRequest struct {
	ProductID string `json:"productId"`
	Quantity  int    `json:"quantity"`
}

type CheckoutRequest struct {
	Items      []CheckoutItemRequest `json:"items"`
	CouponCode string                `json:"couponCode,omitempty"`
}

type CheckoutResponse struct {
	SubtotalPaise int64  `json:"subtotalPaise"`
	DiscountPaise int64  `json:"discountPaise"`
	TotalPaise    int64  `json:"totalPaise"`
	CouponCode    string `json:"couponCode,omitempty"`
}

type ErrorResponse struct {
	Error string `json:"error"`
}
