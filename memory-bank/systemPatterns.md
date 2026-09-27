# System Patterns

## Architecture

Single-page React app (no SSR). Front-end only; talks to a separate Express REST API via `fetch`.

```
Browser → React Router → Pages → Services (fetch + JWT) → Express API
```

## Directory Structure

```
src/
  assets/         Static images
  components/     Shared UI (DashboardLayout, ProtectedRoute, LoginForm, HeroPanel)
  lib/            Utilities (toast queue, viewport-aware popup-menu hook)
  pages/          Route-level pages (LoginPage, DashboardPage, RentalsPage, …)
  services/       API client functions (auth.js, guests.js, rentals.js)
  App.jsx         Route definitions
  main.jsx        App entry point (StrictMode + BrowserRouter + HeroUI Toast)
```

## Key Patterns

### 1. Protected Routing

`ProtectedRoute` wraps dashboard pages and checks `hasAccessToken()`. Redirects to `/login` if no access token or refresh token exists. If the access token is expired, `hasRefreshToken()` allows the route to render while `authFetch` automatically renews the token.

### 1b. Split-screen auth layout (login)

`LoginPage` renders `<main class="auth-page">` = CSS grid `1.05fr 0.95fr` with `HeroPanel` (visual column, `.auth-visual`) + `<section class="auth-form-panel">` wrapping `LoginForm`. The visual column is a branded deep-teal panel (`#0f766e → #0c4a6e`) containing a **pure-CSS product-preview mock** (reuses `.status-chip` variants for the rental rows) — no image assets beyond `assets/hero.png` used as the brand mark. Both columns are presentational only; all auth logic stays in `LoginPage`/`auth.js`.

### 2. Services Layer & Automatic Token Renewal (`authFetch`)

Each service calls `authFetch` from `src/services/auth.js`.

- **JWT Expiration Detection**: Decodes `exp` via `parseJwt()` and checks if the token is expired or expiring within 30 seconds (`isTokenExpired()`).
- **Auto-Renewal via Refresh Token**: Proactively calls `POST /auth/refresh` (`{ refreshToken }`) before dispatching requests if the token is expired, and reactively refreshes and retries the request once if a `401 Unauthorized` response is received.
- **Race Condition Prevention**: Employs a singleton `refreshPromise` so concurrent API requests share a single refresh request.
- **Automatic Logout**: If `POST /auth/refresh` returns 401/403, `clearAuthSession()` removes stored tokens and redirects to `/login`.
- `normalize*` helpers unwrap common response shapes (`data`, `guests`, `rentals`, `rental`).
- List endpoints normalize `payload.rentals || payload.data || payload` and return `{ items, total, limit, offset, ... }`.

### 3. Pages: "List Management" pattern

Used by both `DashboardPage` (guests) and `RentalsPage`. Each implements:

- **State**: `data` array, `total`, `loading`, `error`, `searchTerm`, filters, `page`, open popup menu id, confirm action, busy ids, and create/edit modal state + forms.
- **Effects**: a `useEffect` keyed on `[page, filters]` that fetches with an `active` flag for cleanup.
- **Memorized filtering**: `useMemo` for search-filtered rows.
- **Table**: sticky-header `<table>` inside a scrollable `.guest-table-wrap`.
- **Row actions**: a 3-dot `guest-menu-trigger` opening a portal-based popup menu (`guest-menu`) kept inside the viewport via `useMenuInViewport` (`src/lib/popupMenu.js`), with an outside-click handler.
- **Modals**: `confirm-overlay` + `confirm-dialog` for confirm; `create-dialog` for create/edit forms.
- **Toasts**: `toast.success/danger/info` from `src/lib/toast.js` (custom HeroUI queue).

### 4. Empty / Error / Loading states

Render conditional paragraphs: `Loading...`, `No records found.`, `No records match your filters.`, or `form-error` message.

### 5. Stats strip (Rentals only)

`statCards` = ordered array of `{ key, label, type }` filtered against the `stats` object from the API. `type: "amount"` renders currency, `type: "count"` renders a number.

## Component Relationships

- `main.jsx` → `<App/>` (Routes)
- `App.jsx` → `DashboardLayout` (via each page) + `ProtectedRoute` wrapper
- `DashboardLayout` renders the left vertical sidebar (logo, navigation links, user/account section) and main canvas (header, `{children}` content, footer)
- Pages import service functions and render modals via `createPortal` for the row-action menus

## Critical Implementation Paths

1. **Login**: `LoginForm` → `loginRequest` (POST `/auth/login`) → `saveAuthSession` stores `accessToken`, `refreshToken`, `user` in localStorage.
2. **Load rental list**: `RentalsPage` effect → `fetchRentals` (GET `/rentals?...status=&month=&offset=&limit=`) → set state → render.
3. **Record payment**: row menu → confirm → `recordRentalPayment` (POST `/:id/payments`) → set row status to `paid`. Also: selecting **Paid** in the status-chip dropdown → `recordRentalPayment` (POST `/:id/payments`) with `{ amount, paymentDate }` (month filter / current month + dueDate day) → row status `paid`.
4. **Refresh status**: row menu → `fetchRentalStatus` (GET `/:id/status`) → update row `paymentStatus`.
5. **Manual status change**: status-chip dropdown → `Pending`/`Unpaid` use `updateRentalStatus` (`PUT /rentals/:id/status` with `{ status }`); `Paid` uses the payment endpoint (see #3).

## Important Note on Data Shapes

`roomId`, `tenantId`, and potentially `createdBy` can be returned as **populated objects** (e.g. `{ _id, number }`) or `null`. Never render these directly as React children — always pass through `formatReference()` (renders `number || name || title || code || _id`).
