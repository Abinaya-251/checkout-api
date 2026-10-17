# Checkout API

The Go API uses only the standard library and listens on port `8088` by default.
Run the following commands from the repository root:

```powershell
cd backend
go run .
```

In another terminal, run the backend tests from `backend/`:

```powershell
go test ./...
```

Set `PORT` to use a different listening port, for example `$env:PORT = "8090"`
in PowerShell before running `go run .`.

## Endpoints

- `GET /api/health` returns `{"status":"ok"}`.
- `GET /api/products` returns the server's product catalog. Prices are
  `pricePaise` integer values; `100` paise equals ₹1.
- `POST /api/checkout` accepts JSON in this shape:

  ```json
  {
    "items": [
      { "productId": "notebook", "quantity": 1 }
    ],
    "couponCode": "SAVE10"
  }
  ```

  `couponCode` is optional. The server looks up product prices itself, so
  checkout requests must not include client-supplied prices or totals.

Checkout responses contain `subtotalPaise`, `discountPaise`, and `totalPaise`.
`SAVE10` takes 10% off and rounds the discount down to a whole paise.
`FLAT100` takes ₹100 off, capped at the subtotal so the total cannot be
negative. An invalid coupon returns HTTP `400` with a JSON `error` field.

Checkout requests must use `Content-Type: application/json`. Request bodies are
limited to 1 MiB; carts are limited to 50 lines, 99 units per line, and 500 units
overall. The API allows browser requests from Vite's `http://localhost:5174`
and `http://127.0.0.1:5174` origins.
<!-- 
#backend run using go run main.go
#frontend run using npm run dev -->
