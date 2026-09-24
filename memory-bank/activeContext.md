# Active Context

## Current Focus
Split-screen **login / auth screen** redesign (`/login`). The Rental Rooms page (`/dashboard/rentals`) remains the most recent feature work before this.

## Recent Changes (this session)
1. **Login screen redesigned as a split-screen auth layout** (`/login`):
   - `src/pages/LoginPage.jsx`: wrapper classes changed from `login-page`/`form-panel` → **`auth-page`** (grid `1.05fr 0.95fr`) + **`auth-form-panel`**. Logic unchanged (redirect if `hasAccessToken()`, `loginRequest` → `saveAuthSession` → `/dashboard`).
   - `src/components/HeroPanel.jsx` (left column = visual panel, rebuilt): brand mark (`hero.png` in a rounded white tile) + "Phoenix Dashboard" wordmark, kicker/headline/subtext, a **product-preview mock** (browser chrome dots + `phoenix / rentals` mono URL, 3 stat tiles, 3 rental rows reusing the real `.status-chip--paid/pending/overdue` colors), and 3 feature pills. All markup/CSS — no new assets or dependencies.
   - `src/components/LoginForm.jsx` (right column = form card, rebuilt): header (kicker + `h2` "Sign in" + subtext), grouped `.login-field` email + password inputs, **password show/hide toggle** (`.login-password-toggle`, inline SVG eye icons, `aria-pressed`), inline `.form-error` with `role="alert"` + `id="login-error"`, inputs wired with `aria-invalid` / `aria-describedby`, `autoComplete` + `name` attributes, `email.trim()` on submit, and the gradient primary CTA `.login-submit`.
   - `src/App.css`: replaced the old login block (`.login-page`, `.hero-panel`, `.hero-art`, `.form-panel`) with an `/* Auth screen (split layout) */` section: `.auth-page`, `.auth-visual` (same teal `#0f766e` → `#0c4a6e` gradient as the CTA, with amber/mint auras), `.auth-brand*`, `.auth-preview*`, `.auth-features`, `.auth-form-panel`, `.login-form*`, `.login-password*`, `.login-submit`, `.login-form-note`. Removed the now-unused `.hero-art` rules; kept `.hero-kicker` / `.hero-subtext` (still shared with `DashboardLayout`).
   - Responsive: `@media (max-width: 900px)` stacks to one column, hides `.auth-preview`, tightens paddings. New `@media (min-width: 901px) and (max-height: 800px)` hides `.auth-features` so the visual panel never clips on short laptops.
   - Validated with `npm run build` (passes) and a temporary SSR render smoke test (`vite` `ssrLoadModule` + `react-dom/server`) — all markup/labels verified; temp script deleted afterwards.

1. **Added `src/services/rentals.js`** — API client covering all rental endpoints:
   - `fetchRentals` — `GET /rentals` with `offset`, `limit`, `status`, `month`; returns `{ rentals, total, limit, offset, stats }`.
   - `fetchRental` — `GET /rentals/:id`.
   - `fetchRentalStatus` — `GET /rentals/:id/status` (real-time).
   - `createRental` — `POST /rentals`.
   - `updateRental` — `PUT /rentals/:id`.
   - `recordRentalPayment` — `POST /rentals/:id/payments` → sets status to `paid`.
   - `fetchRentalStats` — `GET /rentals/stats` (currently unused by the page; stats now come embedded in the list response).
   - `deleteRental` — `DELETE /rentals/:id`.

2. **Added `src/pages/RentalsPage.jsx`** — full CRUD management page:
   - Dashboard shell via `DashboardLayout`.
   - **Stats strip** rendered from `stats` embedded in the list response (Total Rentals, Collected Rent, Expected Rent, Outstanding Rent, Paid, Pending, Overdue). Amounts formatted as currency; counts as numbers.
   - **Filters**: Search (client-side), Status (server-side `?status=`), Month (server-side `?month=YYYY-MM`). The filter bar auto-wraps (`repeat(auto-fit, minmax(min(190px, 100%), 1fr))`) so it never overflows on small screens.
   - **Table** columns: Room, Move In, Move Out, Rent, Due Date, Payment Date, Status, Actions. (Tenant column removed.)
   - **Row actions** (popup menu): Record Payment, Refresh Status, Edit, Delete.
   - **Create modal** (auto status), **Edit modal** (PUT recomputes status), and **Confirm dialogs**.
   - **Pagination** driven by `total`.

3. **Registered the route** `/dashboard/rentals` in `src/App.jsx`.

4. **Added sidebar menu item** "Rental Rooms" in `src/components/DashboardLayout.jsx`.

5. **Added CSS** in `src/App.css`: status chip variants (`--paid/--pending/--overdue`), stats strip styles, `.guest-table--rentals` (wider min-width), `.rental-filters` (responsive auto-wrapping flex filter bar).

6. **Added manual status update** in the rental table: the **Status** column is now an interactive button that opens a portal popup with `Pending`, `Unpaid`, `Paid`. Selecting one calls `updateRental` (`PUT /rentals/:id`) with `{ status }` (not `paymentStatus`) and updates the row in place. Added `--unpaid` chip variant + `.status-chip-btn` styles.

7. **"Paid" from the status chip now records a real payment** — selecting `Paid` from the status-chip dropdown calls `recordRentalPayment` (`POST /rentals/:id/payments`) with `{ amount, paymentDate }` instead of `PUT /rentals/:id { status }`:
   - `amount` = the rental's `rentAmount`.
   - `paymentDate` = `YYYY-MM-DD` where `YYYY-MM` comes from the **month filter** (`?month=`) or the **current month** when no filter is set, and `DD` comes from the rental's **dueDate day** (falling back to today's day). Implemented via the `getPaymentDate(monthFilter, rental)` + `extractDayPart()` helpers. `Pending`/`Unpaid` use `updateRentalStatus` (see item 9).

8. **Table columns changed**: removed the **Tenant** column; added a **Payment Date** column (renders `rental.paymentDate`) between Due Date and Status.

9. **Unpaid/Pending now use the dedicated status endpoint** — selecting `Unpaid` or `Pending` from the status-chip dropdown calls `updateRentalStatus` (`PUT /rentals/:id/status`) with `{ status: "unpaid" | "pending" }` (added to `src/services/rentals.js`), instead of `PUT /rentals/:id` with `{ status }`.

10. **Popup menus now stay inside the viewport** — added `useMenuInViewport` (`src/lib/popupMenu.js`): a shared hook that measures each portal popup (row-action menu + status-chip menu, also the dashboard action menu) in a `useLayoutEffect` and positions it with `position: fixed`. It is **anchored to the trigger button itself** (the refs moved from the wrapping `.guest-actions` div to the buttons) so the popup's **right edge aligns with the button's right edge** like a native dropdown. Vertically it opens **below** but flips **above** when the button is in the lower half of the screen (or lacks room below). **Key bug fixed**: the menu is now taken out of document flow (`position: fixed`) *before* measuring, so its width is the shrink-to-fit content width — previously it measured the full body width (portal renders it statically), which clamped the popup to the far-left of the screen. Replaced the old click-time `top: rect.bottom + 8 / right: vw - rect.right` math. Removed `popupMenuStyle`/`statusMenuStyle` state entirely.

11. **Rental filter bar is a responsive flex container** — `.rental-filters` uses `display: flex; flex-wrap: wrap; gap: 12px; align-items: stretch` with stretching items (`.rental-filters > * { flex: 1 1 190px; min-width: 0 }`). It **auto-wraps** to fit any screen width with no horizontal scroll: 4 items on one row on desktop, 3+1 / 2+2 on tablets, single column on phones. (Replaced the rigid `minmax(240px, 1fr) 180px 180px auto` grid that overflowed ~900–1100px viewports.) The Clear Filter button uses `align-self: flex-end` + `padding: 12px 14px` (matching the inputs) so its height equals the search/status/month input heights instead of stretching with the row.

12. **Room number input is numeric-only** — the "Number" field in the Add Room modal strips non-digit characters on input (`event.target.value.replace(/\D/g, "")`) and uses `inputMode="numeric"` for a numeric mobile keyboard.

13. **Dev workflow notifies Watchtower** — added a "Notify Watchtower" step to `.github/workflows/docker-development.yml` (after Build and push): `if: success() && github.event_name != 'pull_request'`, curls `https://watchtower.monnykapin.com/v1/update?container=api-dev` with `secrets['WATCHTOWER_TOKEN']`.

## Key Decisions & Considerations
- **Stats come from the list response** (embedded `stats` field), not a separate `/stats` call. This reduces requests (helpful given API rate limits).
- **Month filter is server-side** via `?month=YYYY-MM` (matches the API). `<input type="month">` produces `YYYY-MM` natively.
- **`roomId`/`tenantId` can be populated objects** (`{ _id, number }`) — a `formatReference()` helper safely renders a display string. This was a crash fix.
- `fetchRentalStats` (the `/stats` endpoint function) is exported but **not used** by the page — it can be removed or used later if the backend moves stats to a dedicated endpoint.

## Learnings & Project Insights
- **API rate limit**: The backend limits to **100 requests / 15 min**. When exceeded it returns `429` WITHOUT CORS headers, so the browser shows a cryptic `Failed to fetch`. The `fetchRentals` function now catches this and shows a clearer message.
- **Dev port drift**: `index.html` references `/env.js` (generated by `env.sh` in Docker), which 404s in local dev — harmless; the app falls back to `import.meta.env.BASE_API_URL`.
- **No test framework** exists yet (no Vitest/Jest, no test script, no test files). Only `npm run lint` and `npm run build` are available.
- React has **no error boundary** — any render crash (e.g., a `ReferenceError` or rendering an object) unmounts the whole app → blank page. Careful with async data shapes.

## Next Steps
- Confirm the Rental Rooms page works end-to-end against the live API with a valid token.
- Consider adding an error boundary (recommended) so future render crashes don't produce blank pages.
- Consider adding a test setup (Vitest + Testing Library) if unit tests are desired.
- Optionally add `public/env.js` in dev to silence the `/env.js` 404.
