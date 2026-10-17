# Fieldnotes checkout

A responsive React storefront and checkout page for the checkout API. It loads
the product catalogue from `http://localhost:8088/api/products`, keeps cart
quantities in the browser, and asks the backend to validate coupons and
calculate checkout totals.

## Run locally

Start the API from the repository's `backend` directory, using port `8088`:

```powershell
$env:PORT = "8088"
go run .
```

In another terminal, start the frontend from this directory:

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite (normally `http://localhost:5173`). The
backend allows requests from that development origin. To verify the frontend
build and lint rules, run `npm run build` and `npm run lint`.

## Main files

- `src/App.jsx` contains the catalogue, cart, coupon flow, and backend checkout
  requests.
- `src/App.css` contains the storefront layout and responsive component styles.
- `src/index.css` contains global resets and base typography.
- `index.html` sets the browser page title and application entry point.
