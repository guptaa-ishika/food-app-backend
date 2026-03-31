# Food Delivery API (Express + MongoDB + JWT + Cloudinary)

## Setup

1. Copy `.env.example` to `.env` and fill values (never commit `.env`).
2. `npm install`
3. `npm run dev` (or `npm start`)

Required env:

- `MONGODB_URI` — Atlas connection string (database name in path, e.g. `/food-app`)
- `JWT_SECRET` — long random string
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `CLIENT_URL` — Vite app origin for CORS (e.g. `http://localhost:5173`)
- **Stripe:** `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, optional `STRIPE_CURRENCY` (default `inr`). Publishable key is **frontend-only** (`VITE_STRIPE_PUBLISHABLE_KEY`).

### First admin user

Public registration only allows `customer` or `vendor`. Create an admin by either:

- Updating a user in MongoDB: `db.users.updateOne({ email: "..." }, { $set: { role: "admin" } })`, or  
- Registering a user, then using Atlas / Compass to set `role: "admin"`.

---

## Folder layout

| Path | Role |
|------|------|
| `config/db.js` | Mongoose connection |
| `config/cloudinary.js` | Cloudinary SDK config |
| `models/` | User, Restaurant, MenuItem, Order |
| `controllers/` | HTTP handlers (thin — delegate to services where useful) |
| `services/` | Order pricing/build, Cloudinary upload/delete |
| `routes/` | Route definitions + validators |
| `middleware/` | JWT `protect`, `authorize`, optional auth, errors, Multer |
| `validators/` | express-validator rules |
| `utils/` | JWT, ApiError, async handler, response helper |

---

## Auth flow

1. **Register** `POST /api/auth/register` → `{ user, token }`
2. **Login** `POST /api/auth/login` → `{ user, token }`
3. Send **`Authorization: Bearer <token>`** on protected routes.

Roles: `customer`, `vendor`, `admin`.

---

## Image upload flow

1. **Upload file** `POST /api/upload/image` (auth required)  
   - `multipart/form-data` field name: **`image`**  
   - Optional: `folder` = `avatar` | `restaurant` | `menu` (stored under `food-delivery/...` in Cloudinary)
2. Response: `{ url, publicId }`
3. **Persist** `url` + `publicId` on User / Restaurant / MenuItem via PATCH/POST bodies (`avatar`, `coverImage`, `image` objects).
4. **Updates**: when replacing an image, send the new `publicId`; the API deletes the previous `publicId` on the resource (see controllers).

---

## Order flow (happy path)

1. Customer lists approved restaurants: `GET /api/restaurants` (no auth) or with token.
2. Menu: `GET /api/restaurant/:restaurantId/menu-items` (optional auth).
3. **Place order** `POST /api/orders` (customer) — body includes `restaurantId`, `items: [{ menuItemId, qty }]`, `deliveryAddress`, optional `paymentMethod`.
4. Service validates items belong to restaurant, computes subtotal, tax (5%), delivery fee, total; status `pending`.
5. Vendor lists: `GET /api/orders/restaurant/:restaurantId`
6. Vendor/admin updates: `PATCH /api/orders/:id/status` with `status` (`accepted`, `rejected`, `preparing`, `out_for_delivery`, `delivered`, etc.).
7. Customer may **cancel** only while `pending`: `PATCH .../status` with `cancelled` (customer role).

---

## Main endpoints (summary)

| Method | Path | Notes |
|--------|------|--------|
| POST | `/api/auth/register` | customer/vendor |
| POST | `/api/auth/login` | |
| GET | `/api/auth/me` | auth |
| PATCH | `/api/users/me` | profile, password, avatar object |
| GET | `/api/users` | admin |
| GET/ PATCH/ DELETE | `/api/users/:id` | admin |
| GET | `/api/restaurants` | optional auth |
| POST | `/api/restaurants` | vendor/admin |
| GET/PATCH/DELETE | `/api/restaurants/:id` | optional auth GET; owner/admin PATCH |
| GET | `/api/restaurant/:restaurantId/menu-items` | optional auth |
| POST | `/api/restaurant/:restaurantId/menu-items` | vendor (owner) |
| GET/PATCH/DELETE | `/api/menu-items/:itemId` | |
| POST | `/api/orders` | customer |
| GET | `/api/orders/me` | customer |
| GET | `/api/orders/restaurant/:restaurantId` | vendor |
| GET | `/api/orders/admin/all` | admin |
| GET | `/api/orders/:id` | participant |
| PATCH | `/api/orders/:id/status` | |
| POST | `/api/upload/image` | multipart `image` |
| POST | `/api/payment/create-intent` | auth — `{ orderId, amount }` (amount = minor units, must match order total) |
| POST | `/webhook` | Stripe webhooks — **raw body**, not under `/api` |

---

## Stripe (Payment Intents + webhooks)

1. Create an order with `paymentMethod: "stripe"` — `paymentStatus` is `pending`, `status` is `pending`.
2. `POST /api/payment/create-intent` with JWT — server creates a PaymentIntent, stores `stripePaymentIntentId` on the order, returns `clientSecret`. **Amount is validated** against `order.total` (minor units, e.g. paise for INR).
3. Client confirms with Stripe.js (`confirmCardPayment`).
4. Stripe sends **`payment_intent.succeeded`** to `POST /webhook` — signature verified with `STRIPE_WEBHOOK_SECRET`. Handler sets `paymentStatus: "paid"` and stores `stripePaymentId` (charge id).

**Local webhook testing:** install [Stripe CLI](https://stripe.com/docs/stripe-cli), then:

```bash
stripe listen --forward-to localhost:5000/webhook
```

Use the CLI’s webhook signing secret as `STRIPE_WEBHOOK_SECRET` in `.env` while developing.

---

## Response shape

Success: `{ success: true, message?, data?, meta? }`  
Error: `{ success: false, message, details? }`

---

## Security notes

- Passwords hashed with **bcrypt** (pre-save hook on User).
- **JWT** for APIs; no secrets in client code.
- **Helmet** + **CORS** + input validation (express-validator).
- Rotate any credentials that were pasted into chat or committed by mistake.
