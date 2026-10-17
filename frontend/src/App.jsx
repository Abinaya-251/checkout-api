import { useEffect, useState } from 'react'
import './App.css'

const PRODUCTS_URL = 'http://localhost:8088/api/products'
const CHECKOUT_URL = 'http://localhost:8088/api/checkout'

const inr = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  minimumFractionDigits: 2,
})

const productIcons = {
  notebook: '✳',
  mug: '◒',
  bag: '▱',
}

function formatPrice(paise) {
  return inr.format(paise / 100)
}

async function readError(response) {
  try {
    const body = await response.json()
    if (typeof body.error === 'string') return body.error
  } catch {
    // Fall back to the HTTP status when the server does not return JSON.
  }
  return `Request failed (${response.status}). Please try again.`
}

async function fetchProductCatalog(signal) {
  const response = await fetch(PRODUCTS_URL, { signal })
  if (!response.ok) throw new Error(await readError(response))
  const data = await response.json()
  if (
    !Array.isArray(data) ||
    data.some(
      (product) =>
        typeof product.id !== 'string' ||
        typeof product.name !== 'string' ||
        !Number.isFinite(product.pricePaise),
    )
  ) {
    throw new Error('The product catalogue returned an unexpected response.')
  }
  return data
}

function ProductCard({ product, onAdd, disabled, quantity }) {
  return (
    <article className="product-card">
      <div className={`product-art product-art--${product.id}`} aria-hidden="true">
        <span>{productIcons[product.id] || '◇'}</span>
      </div>
      <div className="product-card__details">
        <div>
          <h3>{product.name}</h3>
          <p className="product-price">{formatPrice(product.pricePaise)}</p>
        </div>
        <button
          className={`add-button${quantity ? ' add-button--added' : ''}`}
          type="button"
          onClick={() => onAdd(product)}
          disabled={disabled}
          aria-label={quantity ? `Add another ${product.name}` : `Add ${product.name} to cart`}
        >
          {quantity ? `Add more · ${quantity} in bag` : 'Add to bag'}
          <span aria-hidden="true">+</span>
        </button>
      </div>
    </article>
  )
}

function CartItem({ product, quantity, onQuantityChange, disabled }) {
  return (
    <li className="cart-item">
      <div className={`cart-item__icon product-art--${product.id}`} aria-hidden="true">
        {productIcons[product.id] || '◇'}
      </div>
      <div className="cart-item__info">
        <h3>{product.name}</h3>
        <p>{formatPrice(product.pricePaise)} each</p>
        <div className="quantity-control" aria-label={`Quantity for ${product.name}`}>
          <button
            type="button"
            aria-label={`Decrease ${product.name} quantity`}
            onClick={() => onQuantityChange(product.id, quantity - 1)}
            disabled={disabled}
          >
            −
          </button>
          <span aria-live="polite">{quantity}</span>
          <button
            type="button"
            aria-label={`Increase ${product.name} quantity`}
            onClick={() => onQuantityChange(product.id, quantity + 1)}
            disabled={disabled}
          >
            +
          </button>
        </div>
      </div>
      <strong className="cart-item__total">
        {formatPrice(product.pricePaise * quantity)}
        <span className="sr-only"> line total</span>
      </strong>
    </li>
  )
}

function App() {
  const [products, setProducts] = useState([])
  const [productsLoading, setProductsLoading] = useState(true)
  const [productsError, setProductsError] = useState('')
  const [catalogAttempt, setCatalogAttempt] = useState(0)
  const [cart, setCart] = useState({})
  const [couponInput, setCouponInput] = useState('')
  const [appliedCoupon, setAppliedCoupon] = useState('')
  const [couponError, setCouponError] = useState('')
  const [checkoutError, setCheckoutError] = useState('')
  const [checkoutResult, setCheckoutResult] = useState(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetchProductCatalog(controller.signal).then(
      (data) => {
        setProducts(data)
        setProductsLoading(false)
      },
      (error) => {
        if (error.name !== 'AbortError') {
          setProductsError(error.message || 'Unable to load products. Please try again.')
          setProductsLoading(false)
        }
      },
    )
    return () => controller.abort()
  }, [catalogAttempt])

  function retryProducts() {
    setProductsLoading(true)
    setProductsError('')
    setCatalogAttempt((attempt) => attempt + 1)
  }

  const cartItems = products
    .filter((product) => cart[product.id] > 0)
    .map((product) => ({ product, quantity: cart[product.id] }))
  const cartCount = cartItems.reduce((count, item) => count + item.quantity, 0)

  function invalidateCheckout() {
    setCheckoutResult(null)
    setCheckoutError('')
    setCouponError('')
  }

  function addToCart(product) {
    setCart((current) => ({
      ...current,
      [product.id]: (current[product.id] || 0) + 1,
    }))
    invalidateCheckout()
  }

  function changeQuantity(productId, quantity) {
    setCart((current) => {
      const next = { ...current }
      if (quantity <= 0) delete next[productId]
      else next[productId] = quantity
      return next
    })
    invalidateCheckout()
  }

  async function submitCheckout(couponCode, intent = 'checkout') {
    if (cartItems.length === 0) {
      const message = 'Add at least one item to your bag before continuing.'
      if (intent === 'apply') setCouponError(message)
      else setCheckoutError(message)
      return
    }

    setCheckoutLoading(true)
    setCheckoutResult(null)
    setCheckoutError('')
    setCouponError('')

    try {
      const response = await fetch(CHECKOUT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: cartItems.map(({ product, quantity }) => ({
            productId: product.id,
            quantity,
          })),
          couponCode,
        }),
      })
      if (!response.ok) throw new Error(await readError(response))

      const result = await response.json()
      if (
        !Number.isFinite(result.subtotalPaise) ||
        !Number.isFinite(result.discountPaise) ||
        !Number.isFinite(result.totalPaise)
      ) {
        throw new Error('The checkout service returned an unexpected response.')
      }
      setCheckoutResult(result)

      if (intent === 'apply') {
        const code = result.couponCode || couponCode.trim().toUpperCase()
        setAppliedCoupon(code)
        setCouponInput(code)
      } else if (intent === 'remove') {
        setAppliedCoupon('')
        setCouponInput('')
      }
    } catch (error) {
      if (intent === 'apply') setCouponError(error.message || 'Unable to validate this coupon.')
      else setCheckoutError(error.message || 'Checkout failed. Please try again.')
    } finally {
      setCheckoutLoading(false)
    }
  }

  function applyCoupon(event) {
    event.preventDefault()
    const code = couponInput.trim()
    if (!code) {
      setCouponError('Enter a coupon code to apply it.')
      return
    }
    submitCheckout(code, 'apply')
  }

  return (
    <div className="storefront">
      <header className="topbar">
        <a className="brand" href="#" aria-label="Fieldnotes home">
          <span className="brand-mark" aria-hidden="true">f.</span>
          fieldnotes
        </a>
        <span className="topbar-note">Thoughtful things for everyday</span>
        <a className="bag-link" href="#your-bag">
          Your bag <span>{String(cartCount).padStart(2, '0')}</span>
        </a>
      </header>

      <main>
        <section className="intro" aria-labelledby="page-title">
          <p className="eyebrow">THE GOOD THINGS SHOP</p>
          <h1 id="page-title">A little something<br /><em>for your everyday.</em></h1>
          <p className="intro-copy">Well-made essentials, chosen to bring a little joy to the ordinary.</p>
        </section>

        <div className="shop-layout">
          <section className="catalog" aria-labelledby="catalog-title">
            <div className="section-heading">
              <div>
                <p className="eyebrow">MADE TO BE KEPT</p>
                <h2 id="catalog-title">Shop the collection</h2>
              </div>
              {!productsLoading && !productsError && (
                <span className="item-count">{products.length} essentials</span>
              )}
            </div>

            {productsLoading && (
              <p className="status-message" role="status">Loading the collection…</p>
            )}
            {productsError && (
              <div className="error-panel" role="alert">
                <p>{productsError}</p>
                <button type="button" className="text-button" onClick={retryProducts}>
                  Try again
                </button>
              </div>
            )}
            {!productsLoading && !productsError && products.length === 0 && (
              <p className="status-message">There are no products to show right now.</p>
            )}
            {!productsLoading && !productsError && (
              <div className="product-grid">
                {products.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onAdd={addToCart}
                    disabled={checkoutLoading}
                    quantity={cart[product.id] || 0}
                  />
                ))}
              </div>
            )}
          </section>

          <aside className="checkout-panel" id="your-bag" aria-labelledby="bag-title">
            <div className="bag-heading">
              <div>
                <p className="eyebrow">ALMOST YOURS</p>
                <h2 id="bag-title">Your bag <span>({cartCount})</span></h2>
              </div>
              <span className="bag-sparkle" aria-hidden="true">✳</span>
            </div>

            {cartItems.length === 0 ? (
              <div className="empty-bag">
                <span aria-hidden="true">◌</span>
                <p>Your bag is taking a little breather.</p>
                <small>Add something lovely from the collection.</small>
              </div>
            ) : (
              <ul className="cart-list" aria-label="Items in your bag">
                {cartItems.map(({ product, quantity }) => (
                  <CartItem
                    key={product.id}
                    product={product}
                    quantity={quantity}
                    onQuantityChange={changeQuantity}
                    disabled={checkoutLoading}
                  />
                ))}
              </ul>
            )}

            <form className="coupon-form" onSubmit={applyCoupon} noValidate>
              <label htmlFor="coupon-code">Have a little code?</label>
              <div className="coupon-controls">
                <input
                  id="coupon-code"
                  name="couponCode"
                  type="text"
                  value={couponInput}
                  onChange={(event) => {
                    setCouponInput(event.target.value)
                    setAppliedCoupon('')
                    setCouponError('')
                    setCheckoutResult(null)
                  }}
                  placeholder="Enter coupon code"
                  autoComplete="off"
                  maxLength={32}
                  disabled={checkoutLoading}
                  aria-describedby={couponError ? 'coupon-error' : appliedCoupon ? 'coupon-applied' : undefined}
                  aria-invalid={Boolean(couponError)}
                />
                <button type="submit" className="apply-button" disabled={checkoutLoading}>
                  {checkoutLoading ? 'Wait…' : 'Apply'}
                </button>
              </div>
              {couponError && <p className="form-error" id="coupon-error" role="alert">{couponError}</p>}
              {appliedCoupon && !couponError && (
                <div className="applied-coupon" id="coupon-applied">
                  <span><span aria-hidden="true">✓</span> {appliedCoupon} applied</span>
                  <button
                    type="button"
                    className="text-button"
                    onClick={() => submitCheckout('', 'remove')}
                    disabled={checkoutLoading}
                  >
                    Remove
                  </button>
                </div>
              )}
            </form>

            <div className="summary" aria-live="polite">
              <div className="summary-row">
                <span>Subtotal</span>
                <strong>{checkoutResult ? formatPrice(checkoutResult.subtotalPaise) : '—'}</strong>
              </div>
              <div className="summary-row">
                <span>Discount</span>
                <strong className={checkoutResult?.discountPaise > 0 ? 'discount-value' : ''}>
                  {checkoutResult ? `−${formatPrice(checkoutResult.discountPaise)}` : '—'}
                </strong>
              </div>
              <div className="summary-row summary-total">
                <span>Total</span>
                <strong>{checkoutResult ? formatPrice(checkoutResult.totalPaise) : '—'}</strong>
              </div>
              {!checkoutResult && cartItems.length > 0 && (
                <p className="summary-hint">Your total will be confirmed securely at checkout.</p>
              )}
            </div>

            {checkoutError && <p className="form-error checkout-error" role="alert">{checkoutError}</p>}
            <button
              type="button"
              className="checkout-button"
              onClick={() => submitCheckout(appliedCoupon)}
              disabled={checkoutLoading || cartItems.length === 0}
            >
              {checkoutLoading ? 'Checking out…' : 'Continue to checkout'}
              {!checkoutLoading && <span aria-hidden="true">↗</span>}
            </button>
            <p className="secure-note"><span aria-hidden="true">✳</span> A simple checkout, with no surprises.</p>
          </aside>
        </div>
      </main>

      <footer className="footer">
        <a className="brand" href="#" aria-label="Fieldnotes home">
          <span className="brand-mark" aria-hidden="true">f.</span>
          fieldnotes
        </a>
        <p>Made for the everyday, by fieldnotes.</p>
        <span>GOOD THINGS, WELL CHOSEN. © 2026</span>
      </footer>
    </div>
  )
}

export default App
