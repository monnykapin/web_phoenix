# Progress

## What Works

- **Authentication**: Login flow (JWT), logout with confirm dialog, protected routes, stored session in localStorage.
  - **Login screen is a split-screen auth layout** (`/login`): branded visual panel on the left (`.auth-visual` — brand mark, headline, product-preview mock with status chips, feature pills) and the sign-in card on the right (`.auth-form-panel` → `.login-form`: email + password with show/hide toggle, inline `role="alert"` error, gradient primary CTA). Stacks to one column at ≤900px (preview hidden); feature pills hidden when the viewport is shorter than 800px.
- **Dashboard shell**: Sidebar navigation (Monetary Contribution, Rental Rooms, Reservations, Reports, Settings), navbar with user + logout, footer.
- **Monetary Contribution page** (`/dashboard`): list + pagination, search, status filter, create, update status, delete, toast/confirm. (Pre-existing; working.)
- **Rental Rooms page** (`/dashboard/rentals`) — newly added:
  - List with search, status filter (`?status=`), month filter (`?month=YYYY-MM`), pagination. Filter bar is a responsive flex container (wrapping, stretching items, no horizontal scroll).
  - Stats strip (Total Rentals, Collected Rent, Expected Rent, Outstanding Rent, Paid, Pending, Overdue).
  - Create / Edit / Delete, Record Payment (`→ paid`), Refresh Status (real-time).
  - Manual status change: Status cell is a button → dropdown (Pending / Unpaid / Paid). `Pending`/`Unpaid` → `updateRentalStatus` (`PUT /rentals/:id/status`) with `{ status }`. **`Paid` → `recordRentalPayment` (`POST /rentals/:id/payments`) with `{ amount, paymentDate }`** — amount from `rentAmount`; `paymentDate` from the month filter (or current month) + dueDate day (or today).
  - Table columns: Room, Move In, Move Out, Rent, Due Date, **Payment Date**, Status, Actions (Tenant column removed).

  - Confirm dialogs and toast notifications.
  - Handles populated `roomId`/`tenantId` objects safely via `formatReference()`.
  - Popup menus (row actions, status chip) stay on-screen via `useMenuInViewport` (`src/lib/popupMenu.js`): anchored to the trigger button, right-edge aligned, flip **above** when the button is too low, clamped to the viewport.

- **Settings & Dark Mode**:
  - `ThemeProvider` and `useTheme` context supporting `light`, `dark`, and `system` preferences with persistence in `localStorage` (`phoenix_theme`).
  - Comprehensive dark mode theme styling with deep atmospheric slate/teal surfaces, elevated cards, translucent borders, and high-contrast tables.
  - Interactive Settings page (`/dashboard/settings`) with selectable theme cards (Light, Dark, System) and account/workspace info.
  - Quick theme toggle button in the vertical sidebar account section for 1-click switching.
- **Projects**:
  - Project list page (`/dashboard/projects`): searchable by name or ID, status filter, creation modal, responsive card.
  - Project details page (`/dashboard/projects/:id`): accessed by tapping any project item or name link; displays full project scope, task list, team members, metadata grid, and system identifiers with a back link to project list.
- **Placeholder pages**: Reservations and Reports render a simple placeholder card.
- **Build**: `npm run build` passes (Vite/Rolldown). `npm run lint` passes with 0 errors.

## What's Left to Build

- Reservations and Reports page content (currently placeholders).
- A proper **error boundary** (recommended — currently a render crash = blank page).
- **Test setup** (Vitest + Testing Library) — none exists.
- Optional: dev-only `public/env.js` to silence the `/env.js` 404.

## Current Status

- The Rental Rooms feature is implemented and builds cleanly.
- The last reported blank-page issue was fixed: the page was crashing because `roomId`/`tenantId` are returned as **populated objects** (`{ _id, number }`), which were being rendered directly as React children. Fixed with `formatReference()`.

## Known Issues

1. **API rate limiting**: 100 requests / 15 min. On exceed, returns `429` without CORS headers → browser `Failed to fetch` (now caught and shown as a clearer message). Wait ~15 min to recover.
2. **Token expiry**: Handled automatically. If the JWT access token expires or is within 30 seconds of expiry, `authFetch` proactively renews it using `POST /auth/refresh` (`{ refreshToken }`). If an API call receives a 401, it also attempts renewal and retries once. If the refresh token itself is invalid or expired, the session is cleared and the user is redirected to `/login`.
3. **`/env.js` 404 in dev**: harmless; app falls back to `import.meta.env.BASE_API_URL`.
4. **`fetchRentalStats`** (the `GET /rentals/stats` service function) is exported but **unused** — the page uses the embedded `stats` from the list response. Could be removed or wired up if backend changes.

## Evolution of Decisions

- Rental stats were moved from a dedicated `/stats` call to the **embedded `stats` field** in the list response (fewer requests, respects rate limit).
- Month filtering changed from client-side to **server-side** `?month=YYYY-MM` to match the API and enable accurate stats per month.
- Identified the need to handle **populated reference fields** (`roomId`/`tenantId` as objects) after a production-style crash.
