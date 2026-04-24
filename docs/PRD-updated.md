# Product Requirements Document — FLX Vacations

**Version:** 0.7 (Draft)
**First draft:** Feb 12, 2026
**This revision:** Apr 24, 2026
**Owner:** Jason

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Solution Overview](#3-solution-overview)
4. [Technical Architecture](#4-technical-architecture)
5. [Data Models](#5-data-models)
6. [Features](#6-features)
   - [F-01 Critical Bug Fixes](#f-01-critical-bug-fixes)
   - [F-02 Pricing Page Correction](#f-02-pricing-page-correction)
   - [F-03 Amenities — Fix Display & Grouped Component](#f-03-amenities--fix-display--grouped-component)
   - [F-04 Search Bar Component](#f-04-search-bar-component)
   - [F-05 Google Maps on /homes](#f-05-google-maps-on-homes)
   - [F-06 Stripe Billing & Subscriptions](#f-06-stripe-billing--subscriptions)
   - [F-07 Host Dashboard](#f-07-host-dashboard)
   - [F-08 OwnerRez Integration (Pro Tier)](#f-08-ownerrez-integration-pro-tier)
   - [F-09 Experiences Directory](#f-09-experiences-directory)
   - [F-10 SEO & Structured Data](#f-10-seo--structured-data)
7. [Recommended Implementation Order](#7-recommended-implementation-order)
8. [Known Bugs](#8-known-bugs)

---

## 1. Executive Summary

FLX Vacations is a short-term vacation rental directory focused exclusively on the Finger Lakes region of New York. Property owners (hosts) list their properties; travelers (guests) browse, filter, and book. The site is built on a Node/Express/MongoDB API (`vaca-api`) and a Vue/Nuxt frontend. This revision covers all outstanding features, active bugs, and planned improvements as of April 2026.

---

## 2. Problem Statement

**For hosts:** AirBnB and VRBO charge commissions exceeding 13% and lack regional focus or local insight. FLX Vacations offers flat-rate listing with no commissions and direct booking capability via OwnerRez integration for Pro hosts.

**For guests:** No comprehensive, locally curated directory of Finger Lakes short-term rentals exists. FLX Vacations fills that gap with regional search, map browsing, and local experiences.

---

## 3. Solution Overview

### 3.1 Personas

| Persona | Description |
|---|---|
| Guest | Traveler browsing and booking Finger Lakes vacation rentals |
| Host | Property owner listing one or more properties in the Finger Lakes |
| Experience Provider | Individual or company offering local experiences (wine tours, fishing guides, boat cruises, etc.) — can be a Host or a registered User |
| Admin | FLX Vacations staff with full CRUD access to all data |

### 3.2 Host Subscription Tiers

Subscriptions are **per property**. A host with three properties holds three independent subscriptions. Stripe is the payment processor.

| | Free | Boost | Pro |
|---|---|---|---|
| **Launch price** | $0 | $100/yr | $200/yr or $600 lifetime |
| **Standard price** | $0 | $150/yr | $300/yr |
| **Lifetime option** | No | No | Yes ($600 one-time, locks price for that property forever) |
| Property profile page | ✓ | ✓ | ✓ |
| Photos | Up to 15 | Up to 30 | Up to 60 |
| Description & amenities | ✓ | ✓ | ✓ |
| Lake & city search visibility | ✓ | ✓ | ✓ |
| Host contact info displayed | — | ✓ | ✓ |
| AirBnB / VRBO links on profile | — | ✓ | ✓ |
| Rate range displayed | — | ✓ | ✓ |
| OwnerRez calendar integration | — | — | ✓ |
| Direct booking via OwnerRez | — | — | ✓ |
| Dynamic pricing displayed | — | — | ✓ |
| Priority in search & map results | — | — | ✓ |

**Guest booking path by tier:**
- **Free:** No booking or contact path. Guest sees the property but has no way to contact the host through FLX Vacations.
- **Boost:** Host email and phone number are displayed on the property profile. AirBnB and VRBO links are shown if the host has provided them. Booking happens off-platform.
- **Pro:** Direct booking through OwnerRez integration. Calendar availability and pricing pulled from OwnerRez.

---

## 4. Technical Architecture

### 4.1 Backend (`vaca-api`)
- **Runtime:** Node.js / Express
- **Database:** MongoDB (Mongoose)
- **Storage:** DigitalOcean Spaces (property images)
- **Hosting:** DigitalOcean
- **Auth:** JWT (Bearer token), bcrypt password hashing
- **Payment:** Stripe (subscriptions, one-time charges, customer portal)
- **PMS Integration:** OwnerRez API

### 4.2 Frontend (`vaca-nuxt` or equivalent)
- **Framework:** Vue / Nuxt
- **Styling:** Tailwind CSS (responsive: sm / md / lg)
- **Maps:** Google Maps JavaScript API (browser-restricted key)
- **Geocoding:** Google Geocoding API (server-restricted key, backend only)

### 4.3 Environment Variables

| Variable | Used by | Purpose |
|---|---|---|
| `GEOCODER_API_KEY` | Backend | Google Geocoding API (server-restricted) |
| `NUXT_PUBLIC_GOOGLE_MAPS_API_KEY` | Frontend | Google Maps JS API (browser-restricted by referrer) |
| `STRIPE_SECRET_KEY` | Backend | Stripe API secret key |
| `STRIPE_WEBHOOK_SECRET` | Backend | Stripe webhook signature verification |
| `NUXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Frontend | Stripe.js publishable key |
| `OWNERREZ_API_KEY` | Backend | OwnerRez API credentials |
| `JWT_SECRET` | Backend | JWT signing secret |
| `DATABASE_URL` | Backend | MongoDB connection string |
| `SPACES_KEY`, `SPACES_SECRET` | Backend | DigitalOcean Spaces credentials |

### 4.4 Route Security Reference

| Route | Method | Access |
|---|---|---|
| `/api/health` | GET | Public |
| `/api/auth/login` | POST | Public |
| `/api/auth/forgot-password` | POST | Public |
| `/api/auth/reset-password` | POST | Public |
| `/api/users` | POST | Public (registration) |
| `/api/properties` | GET | Public |
| `/api/properties/:id` | GET | Public |
| `/api/amenities` | GET | Public (`includeInactive=true` requires admin JWT) |
| `/api/amenities` | POST | Admin only |
| `/api/amenities/:id` | PUT, DELETE | Admin only |
| `/api/experiences` | GET | Public |
| `/api/experiences/:id` | GET | Public |
| `/api/auth/me` | GET | Authenticated |
| `/api/auth/change-password` | POST | Authenticated |
| `/api/properties/my` | GET | Authenticated (host list) |
| `/api/users/:id` | GET, PUT | Self or admin |
| `/api/users` | GET | Admin only |
| `/api/users/:id` | DELETE | Admin only |
| `/api/properties` | POST | Host or admin |
| `/api/properties/:id` | PUT, DELETE | Host or admin |
| `/api/upload/image` | POST | Host or admin |
| `/api/properties/:id/views` | POST | Public (anonymous view tracking) |
| `/api/subscriptions` | GET | Authenticated (host sees own) |
| `/api/subscriptions` | POST | Authenticated (host creates) |
| `/api/subscriptions/:id/cancel` | POST | Host (owner) or admin |
| `/api/subscriptions/webhook` | POST | Public (Stripe webhook, verified by signature) |
| `/api/ownerrez/connect` | POST | Host or admin |
| `/api/ownerrez/sync/:propertyId` | POST | Host (owner) or admin |
| `/api/ownerrez/availability/:propertyId` | GET | Public |
| `/api/experiences` | POST | Authenticated (host or user) |
| `/api/experiences/:id` | PUT, DELETE | Owner or admin |

---

## 5. Data Models

### 5.1 Property (existing — additions noted)

| Field | Type | Notes |
|---|---|---|
| title | String | Required |
| slug | String | Unique URL slug |
| bedrooms | Number | Required |
| bathrooms | Number | Required |
| beds | Number | Required |
| guests | Number | Required |
| squareFeet | Number | Min 1, max 50000 |
| totalRooms | Number | Total rooms including non-bedrooms |
| description | String | Required |
| address | String | Required; geocoded on save |
| location | Object | Generated by geocode |
| location.formattedAddress | String | |
| location.street | String | |
| location.city | String | Required |
| location.state | String | |
| location.zipcode | String | |
| location.country | String | |
| location.coordinates | [lng, lat] | GeoJSON Point for map queries |
| lake | String | Required; enum of all 11 Finger Lakes |
| amenities | ObjectId[] | References to Amenity collection |
| airBnb | String | URL to AirBnB listing |
| vrbo | String | URL to VRBO listing |
| pms | Object | PMS connection info |
| pms.provider | String | Enum: `ownerrez` |
| pms.externalId | String | OwnerRez property ID |
| pms.connected | Boolean | Default false |
| pms.lastSync | Date | Last successful sync timestamp |
| images | Object[] | See §4.1 (existing) |
| host | ObjectId[] | Array of User IDs (existing) |
| subscription | ObjectId | Reference to Subscription document |
| views | Number | **NEW** Running total of profile page views |
| createdAt | Date | |
| updatedAt | Date | |

### 5.2 User (existing — additions noted)

| Field | Type | Notes |
|---|---|---|
| firstName | String | Required |
| lastName | String | Required |
| email | String | Required, unique |
| phone | String | Optional |
| role | String | Enum: `user`, `host`, `admin` |
| stripeCustomerId | String | **NEW** Set when first Stripe subscription is created |
| password | String | Hashed, required |
| createdAt | Date | |
| updatedAt | Date | |

### 5.3 Amenity (existing)

| Field | Type | Notes |
|---|---|---|
| displayName | String | Required — human readable, e.g. "Air conditioning" |
| name | String | Required, unique slug, e.g. `air-conditioning` |
| category | String | Required enum: `location`, `essentials`, `kitchen`, `outside`, `entertainment`, `luxury`, `environmentally-friendly` |
| description | String | Optional |
| color | String | Optional, hex |
| icon | String | Optional |
| isActive | Boolean | Default true; soft-delete by setting false |
| createdAt | Date | |
| updatedAt | Date | |

### 5.4 Subscription (NEW)

Tracks the plan for a single property. One Subscription document per property.

| Field | Type | Notes |
|---|---|---|
| propertyId | ObjectId | Reference to Property; required, unique |
| hostId | ObjectId | Reference to User (the billing owner); required |
| plan | String | Enum: `free`, `boost`, `pro`; required |
| billingType | String | Enum: `annual`, `lifetime`; null for free |
| isLifetime | Boolean | True if $600 one-time Pro purchase |
| stripeSubscriptionId | String | Null for free and lifetime plans |
| stripeCustomerId | String | Stripe Customer ID |
| stripePriceId | String | Stripe Price ID used for this subscription |
| status | String | Enum: `active`, `canceled`, `past_due`, `incomplete`, `trialing`; `active` for free/lifetime |
| currentPeriodStart | Date | Null for free/lifetime |
| currentPeriodEnd | Date | Null for free/lifetime |
| cancelAtPeriodEnd | Boolean | Default false; set true when host requests cancellation |
| canceledAt | Date | Timestamp when cancellation was requested |
| createdAt | Date | |
| updatedAt | Date | |

### 5.5 PropertyView (NEW)

Tracks daily view counts per property for host dashboard metrics.

| Field | Type | Notes |
|---|---|---|
| propertyId | ObjectId | Reference to Property |
| date | Date | The calendar date of the view (truncated to midnight UTC) |
| count | Number | Number of views that day; default 1 |

Index on `{ propertyId: 1, date: -1 }` for efficient dashboard queries.

### 5.6 PropertyAvailability (NEW)

Stores blocked/unavailable date ranges synced from OwnerRez. Used for search filtering without real-time OwnerRez API calls.

| Field | Type | Notes |
|---|---|---|
| propertyId | ObjectId | Reference to Property |
| startDate | Date | First unavailable date (inclusive) |
| endDate | Date | Last unavailable date (inclusive) |
| source | String | Enum: `ownerrez`; extensible for future PMS |
| syncedAt | Date | When this record was last synced |

Index on `{ propertyId: 1, startDate: 1, endDate: 1 }`.

### 5.7 Experience (NEW)

| Field | Type | Notes |
|---|---|---|
| title | String | Required |
| slug | String | Unique URL slug; auto-generated from title |
| description | String | Required |
| category | String | Enum: `wine-tour`, `boat-cruise`, `fishing`, `hiking`, `cycling`, `food-tour`, `brewery-tour`, `kayaking`, `scenic-flight`, `other` |
| createdBy | ObjectId | Reference to User; required |
| images | Object[] | Same structure as Property images |
| location | Object | City, lake, coordinates |
| lake | String | Nearest Finger Lake (optional) |
| priceFrom | Number | Starting price per person (optional) |
| duration | String | e.g. "2 hours", "Full day" (optional) |
| website | String | URL (optional) |
| phone | String | Optional |
| email | String | Optional |
| isActive | Boolean | Default true |
| createdAt | Date | |
| updatedAt | Date | |

---

## 6. Features

Each feature section is divided into **Backend** tasks and **Frontend** tasks. Tasks are written to be actionable for Claude Code.

---

### F-01 Critical Bug Fixes

**Priority: P0 — Fix before any other feature work.**

These bugs are currently visible to guests on the live site.

#### Backend

- **B-01.1 — Amenity population on property reads:** ~~Add `.populate('amenities', ...)` to all property read queries.~~ **Fixed (pre-existing).** All property reads already call `.populate('amenities', 'name displayName category color icon description isActive')`.

- **B-01.2 — Admin property authorization:** ~~Fix admin permission check on property PUT/DELETE.~~ **Fixed (pre-existing).** `updateProperty` and `deleteProperty` both check `req.user.role === 'admin'`.

- **B-01.3 — Admin image upload authorization:** ~~Fix "Not authorized" on admin image upload.~~ **Fixed (pre-existing).** `uploadImage` checks `isAdmin` and allows upload regardless of host membership.

- **B-01.4 — Dev-mode initial fetch failures:** ~~Investigate and fix the intermittent `Failed to fetch` errors on initial load at `GET /api/properties` and `GET /api/properties/:slug` in development mode.~~ **Fixed Apr 24, 2026.** Root cause: Nuxt SSR renders `/homes`, `/homes/[slug]`, and `/properties/[id]` before the API on port 7000 finishes connecting to MongoDB, so the first server-side `useFetch` call fails. Fix: added `onMounted(() => { if (error.value) refresh() })` to all three pages so the fetch is retried on the client when SSR errored.

#### Frontend

- **F-01.1 — Amenity display on property profile page:** ~~Renders raw ObjectId strings.~~ **Fixed Apr 24, 2026.** Profile page now uses a `groupedAmenities` computed that filters nulls, groups by category in the fixed PRD order, and renders `amenity.displayName` under category headers (Essentials, Location, Kitchen, Outside, Entertainment, Luxury, Eco-Friendly).

- **F-01.2 — Guest reviews zero state:** ~~Displays `0.0` scores when no reviews.~~ **Fixed Apr 24, 2026.** Rating bars are wrapped in `v-if="reviews.length > 0"`. Zero state shows "No reviews yet — be the first to stay!"

- **F-01.3 — Footer broken links:** ~~Replace all `href="#"` footer links with either real URLs or remove the link.~~ **Fixed Apr 23, 2026.** All footer links now route to real pages. "Community forum" was removed. "Help center" was replaced with "Documentation" (`/documentation`). "Contact us" routes to `/contact`, "Privacy policy" routes to `/privacy`. All three are placeholder pages using the default layout.

- **F-01.4 — Footer lake links:** The footer's Finger Lakes section links to the top 4 lakes by listing volume (Seneca, Cayuga, Keuka, Canandaigua). The remaining 7 lakes will not be added to the footer until listing volume justifies them. All 11 lakes remain accessible via the /homes lake selector. See F-10.7 for internal linking strategy.

---

### F-02 Pricing Page Correction

**Priority: P1 — ~~Correct before running any marketing.~~ Fixed Apr 23, 2026.**

~~The live pricing page at `/pricing` does not match the source-of-truth `pricing.md`. The Free tier incorrectly advertises contact info, AirBnB/VRBO links, direct bookings, and rate info as Free features; these are Boost features.~~

The pricing page has been rewritten to match the tier breakdown below. Boost and Pro CTAs remain "Coming soon" pending Stripe billing (F-06).

#### Frontend

- **F-02.1 — Rewrite pricing page to match `pricing.md`:**

  **Free ($0, always free):**
  - Property profile page
  - Photos (up to 15)
  - Description
  - Amenities list
  - Lake & city search visibility

  **Boost ($100/yr launch → $150/yr standard, no lifetime):**
  - Everything in Free
  - Photos (up to 30)
  - Host email & phone displayed on profile
  - AirBnB and VRBO profile links on property page
  - Rate range displayed

  **Pro ($200/yr launch → $300/yr standard, or $600 one-time lifetime):**
  - Everything in Boost
  - Photos (up to 60)
  - OwnerRez calendar integration
  - Direct booking via OwnerRez
  - Dynamic pricing displayed
  - Profile prioritized in search results and map

- **F-02.2 — "Coming soon" CTA buttons:** Boost and Pro plan CTAs should remain "Coming soon" until Stripe billing (F-06) is live. Once billing is live, replace with "Upgrade to Boost" / "Upgrade to Pro" buttons that initiate the Stripe checkout flow.

- **F-02.3 — Lifetime pricing callout:** Add a callout within the Pro card that clearly explains the lifetime option: "Lock in Pro access for this property forever for a one-time $600 payment. Available at launch pricing only."

---

### F-03 Amenities — Fix Display & Grouped Component

**Depends on: F-01 (B-01.1 must be complete first)**

#### Backend

- **B-03.1 — Seed Amenities collection:** **Done (pre-existing).** Seed script exists at `scripts/seed-amenities.js` and has been run in production.

- **B-03.2 — `GET /api/amenities` — grouped response:** **Done (pre-existing).** `?grouped=true` is fully implemented in the amenity controller, returning categories in the fixed display order.

- **B-03.3 — Property amenity validation:** On `POST /api/properties` and `PUT /api/properties/:id`, validate that all submitted `amenities` values are ObjectIds that correspond to active Amenity documents. Return a clear validation error listing any invalid IDs.

#### Frontend

- **F-03.1/F-03.2/F-03.3 — Amenity components:** **Done Apr 24, 2026.** Built as a single `AmenitiesGroupList.vue` component (combines Pill + Group + List responsibilities). Fetches `GET /api/amenities?grouped=true` on mount, renders all amenities grouped by category as toggle buttons. Deselected: white bg, grey border/text. Selected: blue bg, white text. Accepts `selectedIds: string[]` prop, emits `update:selectedIds`. Separate AmenityPill and AmenityGroup components can be split out when F-04 filter bar is built.

- **F-03.4 — Property create/edit form — amenities section:** **Done Apr 24, 2026.** Replaced the hardcoded 18-item checkbox list in both `create.vue` and `edit/[id].vue` with `<AmenitiesGroupList v-model:selectedIds="form.amenities" />`. Edit form watch handler now correctly extracts `_id` strings from populated Amenity objects to prevent data corruption on save.

- **F-03.5 — Property profile page — grouped amenities display:** **Done Apr 24, 2026.** See F-01.1 above — profile page groups and displays amenities by category in display-only mode.

---

### F-04 Search Bar Component

**The homepage already has a search bar UI. This feature defines the component, wires its behavior, and makes it reusable across the homepage and /homes.**

#### Backend

- **B-04.1 — `GET /api/properties` — search params:** Extend the public properties endpoint to accept the following optional query parameters. **Done Apr 24, 2026** for `where`, `guests`, `minBedrooms`, `minBeds`, `minBathrooms`, and `amenities`; `checkIn`/`checkOut` availability filtering is pending OwnerRez integration (F-08).
  - `where` (string): case-insensitive text match against `location.city` OR `lake`. Example: `?where=Seneca` matches properties on Seneca Lake. `?where=Penn Yan` matches properties in Penn Yan. **Done.**
  - `checkIn` (ISO date string): first night of stay. **Pending** (requires PropertyAvailability data from OwnerRez sync).
  - `checkOut` (ISO date string): last night of stay. When both `checkIn` and `checkOut` are provided, exclude properties that have a `PropertyAvailability` record overlapping the requested range. Properties without any availability records (i.e., non-OwnerRez properties) are **not** excluded — they are always shown. **Pending.**
  - `guests` (integer): filter to properties where `property.guests >= guests`. **Done.**
  - `minBedrooms` (integer): filter to properties where `property.bedrooms >= minBedrooms`. **Done.**
  - `minBeds` (integer): filter to properties where `property.beds >= minBeds`. **Done.**
  - `minBathrooms` (integer): filter to properties where `property.bathrooms >= minBathrooms`. **Done.**
  - `amenities` (comma-separated slugs): filter by one or more amenity slugs, e.g. `?amenities=wifi,pets-allowed`. The `amenityMatch` param controls AND (`all`) vs OR (`any`) logic; default is `all`. **Done (pre-existing).**
  - All existing filters (`lake`, `amenityMatch`) remain supported and combinable with the new params.
  - Pagination: `page` and `limit` (default limit 20).

#### Frontend

- **F-04.1 — `SearchBar` component:** Create a single reusable `SearchBar.vue` component used on both the homepage and /homes. Contains four fields:
  - **WHERE** — text input. Placeholder: "City or lake name". Searches as the user types (debounced 300ms) or on form submission.
  - **CHECK IN** — date picker. No past dates selectable. Minimum check-out is one day after check-in.
  - **CHECK OUT** — date picker. Always ≥ check-in + 1 day.
  - **GUESTS** — number stepper or dropdown (1–16). Displays "Add guests" until a value is selected.
  - None of these fields are required.
  - A **Search** button triggers navigation to `/homes` with current field values as query params: `?where=...&checkIn=...&checkOut=...&guests=...`.
  - On the /homes page, the component reads these query params on mount and populates the fields, triggering a filtered fetch.

- **F-04.2 — Homepage search bar:** Replace or wire the existing homepage search bar to use the `SearchBar` component. On submit, navigate to `/homes` with query params.

- **F-04.3 — /homes page search bar:** Mount the `SearchBar` component at the top of the /homes page. On mount, read URL query params and populate fields. On field change or submit, update query params and re-fetch properties. The filter bar (lake selector, amenity filters) and the search bar coexist and their filters are combined.

- **F-04.4 — Quick category filter pills (homepage):** The existing horizontal pill row (🏡 All, 🌊 Lakefront, 🍷 Vineyard, etc.) filters by amenity or lake. These should remain and combine with the search bar filters. Clicking a pill sets the appropriate filter param.

- **F-04.5 — Filter Panel (sliding panel on /homes and /homes/[slug]):** **Done Apr 24, 2026.** A `FilterPanel.vue` component slides up from the bottom of the screen when the Filter button in the `SearchBar` is tapped. Design:
  - **Layout:** Full-screen on mobile (95vh), partial-screen on desktop (up to 82vh). Drag handle, header with title "Filters" and X close button, scrollable body, sticky footer "Filter" button.
  - **Trigger:** Filter button (funnel icon, blue square) appears to the right of the search bar white card on `/homes` and `/homes/[slug]` pages only (controlled by `showFilter` prop on `SearchBar`). A badge on the button shows the active filter count.
  - **Clear all:** A "Clear all" text link appears to the right of the filter button when `filterCount > 0`. Removes all filter params from the URL while preserving `where` and `guests`.
  - **Applied Filters section:** At the top of the scrollable body (visible when any filter is active). Renders one blue chip per active filter (amenity slugs shown with their `displayName`, room minimums shown as "2+ Bedrooms" etc.). Each chip has an × to remove that individual filter immediately without closing the panel.
  - **Top Amenities:** Four large-pill quick-select buttons displayed in a 2×2 grid (4-column on sm+) with colored icon + label:
    - Pets allowed (amber, paw icon)
    - Free parking (green, P icon)
    - Self check-in (purple, key icon)
    - WiFi (blue, wifi icon)
    Selecting a top amenity also reflects in and is linked to the grouped amenities section below (both use the same `selectedSlugs` ref keyed on amenity `name` slug).
  - **Rooms & Beds:** Three steppers — Bedrooms, Beds, Bathrooms. Display "Any" when value is 0; increment/decrement buttons; max 8.
  - **Grouped Amenities:** Fetches `GET /api/amenities?grouped=true` on mount. Same category order as `AmenitiesGroupList`. Toggle buttons use `amenity.name` (slug) as the selection key so state serializes cleanly to URL.
  - **Apply:** "Filter" button builds a URL query from internal state (preserving `where` / `guests`), calls `navigateTo` to the same path with updated params, and emits `close`. The parent pages watch these query params and re-fetch via `useFetch`.
  - **Filter count:** `amenities` comma-list length + 1 per room minimum > 0. Displayed in badge on filter button.
  - **URL persistence:** All filter state is stored in URL query params: `amenities=wifi,pets-allowed&minBedrooms=2&minBeds=3&minBathrooms=1`. This means filter state survives page refresh and is shareable via URL.
  - **Backend:** `minBedrooms`, `minBeds`, `minBathrooms` query params added to `GET /api/properties` (see B-04.1). The `amenities` slug-based filter was pre-existing via `resolveAmenityFilterTokens`.
  - **Amenity seed:** `pets-allowed` and `free-parking` added to DB via `scripts/add-filter-amenities.js`. Seed data file updated.

- **F-04.6 — Google Maps Map ID:** **Done Apr 24, 2026.** Created a Google Cloud Map ID (`18963ad839ddf1d520a72b2d`, type: JavaScript/Raster) in Google Cloud Console → Maps Platform → Map Management. Set `NUXT_PUBLIC_GOOGLE_MAPS_MAP_ID` in `ecosystem.config.cjs`. `HomesMap.vue` reverted to `AdvancedMarkerElement` with the `mapId` prop. `gmp-click` event used (required for AdvancedMarkerElement). InfoWindow opens on pin click.

---

### F-05 Google Maps on /homes

**Depends on: `NUXT_PUBLIC_GOOGLE_MAPS_API_KEY` set in production environment.**

#### Backend

- **B-05.1 — Coordinates on property reads:** Ensure `GET /api/properties` returns `location.coordinates` (GeoJSON `[lng, lat]` array) for each property. This is needed for map pin placement. Verify geocoding on property create/update populates `location.coordinates`.

#### Frontend

- **F-05.1 — Fix `NUXT_PUBLIC_GOOGLE_MAPS_API_KEY`:** **Done Apr 24, 2026.** Key set in `ecosystem.config.cjs` PM2 env block and baked into the production build. Map no longer shows the "Set key" fallback message.

- **F-05.2 — /homes two-column layout:** **Done (desktop) Apr 24, 2026.** Two-column layout implemented: sticky map sidebar (right, 480px wide) + scrollable card grid (left). Root cause of blank grey map (zero-height `mapEl` due to CSS `h-full` circular dependency) fixed Apr 25, 2026 by replacing `lg:h-full` with concrete `lg:h-[520px]` on the map container. Mobile map toggle ("Show map" / "Show list") not yet implemented.

- **F-05.3 — Map pins:** **Partially done Apr 24, 2026.** Properties are plotted as blue circle pins (`google.maps.Marker` with `SymbolPath.CIRCLE`). Hovering a pin enlarges it and darkens the color. Clicking a pin opens a Google Maps `InfoWindow` overlay with property image, title, beds, city, and a "View listing" link. **Pending:** Migrate to custom house-icon pins (see F-05.3a below).

- **F-05.3a — Custom map pins (NEW):** Replace the current blue circle marker with a custom house-icon SVG pin. Design requirements:
  - Default state: white or light-blue teardrop/pin shape with a small house icon inside. Matches brand colors.
  - Hovered/active: pin grows slightly, adds shadow, changes to brand blue fill with white icon.
  - Implementation: custom SVG passed as `icon` on `google.maps.Marker`, or migrate to `google.maps.marker.AdvancedMarkerElement` with custom HTML content (requires a Google Maps Map ID configured in Cloud Console).
  - Keep InfoWindow click behavior (image, title, beds, city, "View listing" link).

- **F-05.4 — Map + list sync:** **Done Apr 24, 2026.** Hovering a card in the list highlights the corresponding map pin (and vice versa) via shared `hoveredId` ref. `VacaRentSumCard` applies `ring-blue-400 shadow-md` when hovered.

- **F-05.5 — /homes/[lake] map:** **Done Apr 24, 2026.** Lake-specific pages pre-center the map using a `LAKE_CENTERS` lookup for all 11 Finger Lakes. `centerLake` prop passed to `HomesMap`.

---

### F-06 Stripe Billing & Subscriptions

**Subscriptions are per-property. Each property has exactly one Subscription document.**

#### Backend

- **B-06.1 — Stripe setup:** Install `stripe` npm package. Add `STRIPE_SECRET_KEY` and `STRIPE_WEBHOOK_SECRET` to environment. Create Stripe Products and Prices for:
  - Boost Annual Launch ($100/yr)
  - Boost Annual Standard ($150/yr)
  - Pro Annual Launch ($200/yr)
  - Pro Annual Standard ($300/yr)
  - Pro Lifetime Launch ($600 one-time)
  - Store Price IDs in environment or a config file (not hardcoded in route logic).

- **B-06.2 — Stripe Customer creation:** When a host initiates a paid subscription for the first time, create a Stripe Customer and save `stripeCustomerId` on the User document. If the user already has a `stripeCustomerId`, reuse it.

- **B-06.3 — `POST /api/subscriptions` — create or upgrade subscription:**
  - Request body: `{ propertyId, plan, billingType }`.
  - Access: Authenticated host (must be in property.host array) or admin.
  - If upgrading from Free to Boost or Pro: create Stripe Checkout Session for the chosen Price ID, return the session URL for frontend redirect.
  - If `billingType === 'lifetime'`: create a Stripe one-time Payment Intent for $600, return client secret for frontend confirmation.
  - On success (confirmed via webhook — see B-06.5): create or update the Subscription document.

- **B-06.4 — `POST /api/subscriptions/:id/cancel` — cancel subscription:**
  - Access: The host whose User._id === subscription.hostId, or admin.
  - For annual plans: call Stripe `subscriptions.update({ cancel_at_period_end: true })`. Set `cancelAtPeriodEnd: true` on the Subscription document. The property keeps its plan until `currentPeriodEnd`.
  - For lifetime plans: lifetime subscriptions cannot be canceled (return 400 with message "Lifetime subscriptions cannot be canceled").
  - For free plans: return 400 with message "Free listings cannot be canceled".

- **B-06.5 — Stripe webhook handler `POST /api/subscriptions/webhook`:**
  - Access: Public but verified using `stripe.webhooks.constructEvent` with `STRIPE_WEBHOOK_SECRET`.
  - Handle these events:
    - `checkout.session.completed`: Create/activate the Subscription document; update `property.subscription`.
    - `invoice.payment_succeeded`: Update `currentPeriodStart`, `currentPeriodEnd`, set `status: 'active'`.
    - `invoice.payment_failed`: Set `status: 'past_due'`. (Consider email notification — out of scope for now.)
    - `customer.subscription.deleted`: Set `status: 'canceled'`, downgrade property plan to `free`.
    - `payment_intent.succeeded` (for lifetime): Activate lifetime Subscription document.

- **B-06.6 — Update payment method:** Do not build a custom payment UI. Use the Stripe Customer Portal.
  - `POST /api/subscriptions/portal-session`: Creates a Stripe Billing Portal session for the authenticated host's `stripeCustomerId`. Returns a redirect URL. The Stripe portal allows the host to update payment method, view invoices, and manage subscriptions.

- **B-06.7 — Plan enforcement on property reads:** When serving property data, the API should gate plan-specific fields. If `subscription.plan === 'free'`: omit `host.email`, `host.phone`, `airBnb`, `vrbo`, and rate fields. If `subscription.plan === 'boost'`: include contact info, AirBnB/VRBO links, and rate range. If `subscription.plan === 'pro'`: include all fields including OwnerRez booking and calendar data.

- **B-06.8 — `GET /api/subscriptions` — host's own subscriptions:**
  - Access: Authenticated.
  - Returns all Subscription documents where `hostId === req.user._id`, populated with property title and main image.

#### Frontend

- **F-06.1 — Upgrade flow:** On the pricing page, once billing is live (replacing "Coming soon"), clicking "Upgrade to Boost" or "Upgrade to Pro" opens a modal or page that:
  1. If the host has multiple properties, asks which property to upgrade.
  2. Shows a plan summary (price, features).
  3. Redirects to Stripe Checkout (annual) or shows a Stripe Elements card form (lifetime one-time).

- **F-06.2 — Stripe Customer Portal link:** In the host dashboard (see F-07), provide a "Manage billing" button per property subscription. Clicking it calls `POST /api/subscriptions/portal-session` and redirects to the Stripe Customer Portal. The portal handles: update card, view invoices, cancel (for annual plans that aren't already set to cancel).

- **F-06.3 — Subscription status on property cards in dashboard:** Each property card in the host dashboard shows its current plan badge (Free / Boost / Pro), billing renewal date (for annual), or "Lifetime" badge. If `cancelAtPeriodEnd: true`, show "Cancels on [date]" in orange.

- **F-06.4 — Downgrade messaging:** If a subscription is canceled and the property reverts to Free, the host should see a notification banner on their dashboard: "Your [Property Name] subscription ended. Upgrade to Boost or Pro to restore premium features."

---

### F-07 Host Dashboard

**Depends on: F-06 (subscription data) and F-03 (amenity display)**

The host dashboard is the authenticated area where a host manages all their properties and sees metrics.

#### Backend

- **B-07.1 — Property view tracking `POST /api/properties/:id/views`:**
  - Access: Public (no auth required — guests don't have accounts).
  - Upserts a `PropertyView` document: find the record for this `propertyId` + today's date (UTC midnight), increment `count` by 1. If no record exists, create one with `count: 1`.
  - Also increment `property.views` by 1 for the running total.
  - To prevent bot inflation: implement basic rate limiting per IP (max 5 view increments per property per IP per hour).

- **B-07.2 — `GET /api/properties/my/metrics`:**
  - Access: Authenticated host.
  - Returns, for each property the host owns:
    - `totalViews`: `property.views` running total.
    - `viewsLast30Days`: sum of `PropertyView.count` for this property over the last 30 days.
    - `viewsLast7Days`: sum for last 7 days.
    - `dailyViews`: array of `{ date, count }` for the last 30 days (for sparkline chart).
  - For Pro properties with OwnerRez connected: include `upcomingBookings` count (pulled from OwnerRez — see F-08).

#### Frontend

- **F-07.1 — Host dashboard page `/dashboard`:**
  - Access: Authenticated hosts only. Redirect non-hosts to homepage.
  - Layout: Page header "My Properties" with a "+ Add Property" button that links to `/properties/create`.
  - Displays one card per property the host owns.

- **F-07.2 — Property card in dashboard:** Each card shows:
  - Main image (3:2 aspect ratio thumbnail).
  - Property title (links to property profile page).
  - City, lake.
  - Beds / baths.
  - Plan badge: "Free", "Boost", or "Pro" with appropriate color (gray / blue / gold).
  - Renewal or status line: "Renews Jan 15, 2027" / "Lifetime" / "Cancels Apr 30, 2026" (in orange) / "Past due" (in red).
  - **Views this month** metric (number + small sparkline chart if > 0 data).
  - Action buttons: "Edit listing" → `/properties/edit/[id]`, "View profile" → `/properties/[slug]`, "Manage billing" → Stripe portal (F-06.2).

- **F-07.3 — Add another property:** The "+ Add Property" button on the dashboard links to `/properties/create`. When the host creates a new property, they are redirected back to the dashboard where the new property card appears. The new property starts on the Free plan by default.

- **F-07.4 — Dashboard summary row (multi-property hosts):** At the top of the dashboard, above the property cards, show a summary row:
  - Total properties.
  - Total views this month (sum across all properties).
  - For hosts with any Pro property: total upcoming bookings (sum from OwnerRez).

- **F-07.5 — View tracking trigger:** On every `GET /api/properties/:id` page load (the public property profile page), fire a background `POST /api/properties/:id/views` request from the frontend. Do this without blocking page render — fire-and-forget in `onMounted`.

---

### F-08 OwnerRez Integration (Pro Tier)

**Access: Pro tier properties only. Hosts must have an OwnerRez account.**

#### Backend

- **B-08.1 — OwnerRez API authentication:** Store OwnerRez API credentials in environment variables (`OWNERREZ_API_KEY`). Reference: [OwnerRez API Overview](https://www.ownerrez.com/support/articles/api-overview). Use Basic Auth with the host's OwnerRez API key. Each Pro host will need to provide their own OwnerRez API key; store it encrypted on the User document or a separate OwnerRezConnection document.

- **B-08.2 — `POST /api/ownerrez/connect` — connect a property to OwnerRez:**
  - Access: Host (must be in property.host) or admin.
  - Request body: `{ propertyId, ownerRezPropertyId, ownerRezApiKey }`.
  - Validate by making a test call to OwnerRez API to confirm the credentials and property ID are valid.
  - On success: set `property.pms.provider = 'ownerrez'`, `property.pms.externalId = ownerRezPropertyId`, `property.pms.connected = true`. Store the encrypted API key. Trigger an initial availability sync (B-08.3).

- **B-08.3 — `POST /api/ownerrez/sync/:propertyId` — sync availability:**
  - Access: Host (owner) or admin. Also called internally on connect and by a scheduled job.
  - Calls the OwnerRez API to get all blocked/booked date ranges for the property (typically the Bookings or Availability endpoint).
  - Upserts `PropertyAvailability` records for this property: delete all existing records for this property, insert new ones from the OwnerRez response.
  - Updates `property.pms.lastSync = new Date()`.
  - Schedule this sync to run automatically every 6 hours for all connected properties (use a cron job or DigitalOcean scheduled function).

- **B-08.4 — `GET /api/ownerrez/availability/:propertyId` — get availability calendar:**
  - Access: Public.
  - Returns all `PropertyAvailability` records for the property for the next 12 months as an array of `{ startDate, endDate }` objects. Used by the frontend calendar widget.

- **B-08.5 — `GET /api/ownerrez/pricing/:propertyId` — get pricing:**
  - Access: Public.
  - Calls the OwnerRez API to get nightly rate / rate range for the property.
  - Cache the response for 1 hour (in-memory or Redis) to avoid excessive OwnerRez API calls.
  - Returns: `{ rateFrom, rateTo, currency }`.

- **B-08.6 — `POST /api/ownerrez/booking` — create booking:**
  - Access: Public (guest submits booking request).
  - Request body: `{ propertyId, guestFirstName, guestLastName, guestEmail, guestPhone, checkIn, checkOut, guests }`.
  - Validate: check-in must be before check-out; date range must not overlap any `PropertyAvailability` record for this property.
  - Post the booking to the OwnerRez API using the property's stored credentials.
  - On success: trigger a sync (B-08.3) to update availability, return booking confirmation details.
  - On failure (OwnerRez API error or conflict): return clear error message to the guest.

- **B-08.7 — OwnerRez reviews (future/optional):** If the OwnerRez API provides guest review data, expose a `GET /api/ownerrez/reviews/:propertyId` endpoint. This is a placeholder — implement only if the OwnerRez API supports review retrieval. Reviews, if available, should be displayed on the Pro property profile page.

#### Frontend

- **F-08.1 — OwnerRez connect flow (host dashboard / edit property):**
  - On the property edit page (`/properties/edit/[id]`), for Pro properties, add an "OwnerRez Integration" section.
  - If not connected: show a form with fields "OwnerRez Property ID" and "OwnerRez API Key" with a "Connect" button. On submit, call `POST /api/ownerrez/connect`. Show success/error notification.
  - If connected: show "Connected ✓" badge and last sync time. Show a "Sync now" button that calls `POST /api/ownerrez/sync/:propertyId`. Show a "Disconnect" button (sets `pms.connected = false`, removes credentials).

- **F-08.2 — Availability calendar on property profile (Pro only):** On the property profile page for connected Pro properties, display an availability calendar. Blocked dates (from `PropertyAvailability`) are visually grayed out. Use the date range data from `GET /api/ownerrez/availability/:propertyId`. The calendar shows the current month and the next month by default, with prev/next month navigation.

- **F-08.3 — Pricing on property profile (Pro only):** Display the nightly rate or rate range from `GET /api/ownerrez/pricing/:propertyId`. Format: "From $X/night" or "$X–$Y/night". Show this below the property title on the profile page. For Boost properties: show the manually entered rate range (from the property record). For Free properties: show nothing.

- **F-08.4 — Booking form on property profile (Pro only):** Below the availability calendar, display a booking widget:
  - Check-in / Check-out date pickers (blocked dates from availability are unselectable).
  - Number of guests stepper.
  - Guest name, email, phone fields.
  - "Request to Book" button.
  - On submit: call `POST /api/ownerrez/booking`. On success: show a confirmation message "Your booking request has been submitted. You'll receive a confirmation from the host." On error: show the error message clearly.

- **F-08.5 — Boost property profile — contact & links section:** For Boost properties, display a "Contact the host" section:
  - Host phone number (tel: link).
  - Host email (mailto: link).
  - "Book on AirBnB" button (if `property.airBnb` is set).
  - "Book on VRBO" button (if `property.vrbo` is set).

- **F-08.6 — Reviews on property profile (Pro + OwnerRez, if available):** If B-08.7 is implemented and the property has reviews, display them in a "Guest reviews" section with star ratings, reviewer name, date, and review text. Replace the current `0.0` placeholders.

---

### F-09 Experiences Directory

**Any authenticated User or Host can create an Experience listing. No booking or inquiry flow — directory only.**

#### Backend

- **B-09.1 — Experience model and collection:** Create the Experience model as defined in §5.7.

- **B-09.2 — `GET /api/experiences` — list experiences:**
  - Access: Public.
  - Optional query params: `category`, `lake`, `page`, `limit` (default 20).
  - Returns paginated list of active experiences with main image, title, category, location, price.

- **B-09.3 — `GET /api/experiences/:id` — single experience:**
  - Access: Public.
  - Returns full experience document.

- **B-09.4 — `POST /api/experiences` — create experience:**
  - Access: Authenticated (any user or host).
  - Sets `createdBy` to `req.user._id`.
  - Validates required fields: `title`, `description`, `category`.
  - Auto-generates `slug` from `title`.

- **B-09.5 — `PUT /api/experiences/:id` — update experience:**
  - Access: The user whose `_id === experience.createdBy`, or admin.

- **B-09.6 — `DELETE /api/experiences/:id` — delete experience:**
  - Access: The user whose `_id === experience.createdBy`, or admin.
  - Soft delete: set `isActive: false`.

- **B-09.7 — Image upload for experiences:** Reuse the existing image upload infrastructure (`POST /api/upload/image`). Add an `experienceId` param option alongside `propertyId`. Images stored in Spaces under `experiences/` folder. Naming convention: `photo_[Experience ID]_XX.[ext]`.

#### Frontend

- **F-09.1 — `/experiences` page — directory listing:**
  - Page heading: "Finger Lakes Experiences".
  - Subheading: "Guided tours, lake adventures, wine experiences, and more."
  - Filter bar at top: filter by `category` (pill selectors) and `lake` (dropdown). These are optional.
  - Grid of Experience cards (2 or 3 columns depending on screen size).

- **F-09.2 — Experience card:** Shows main image (3:2 aspect ratio), title (H3), category badge, lake (if set), "From $X/person" price line (if `priceFrom` is set), short description (truncated to 2 lines). Links to `/experiences/[slug]`.

- **F-09.3 — `/experiences/[slug]` — experience detail page:**
  - Main image full-width or collage if multiple images.
  - Title (H1), category, lake, duration, price.
  - Full description.
  - Contact section: website link, phone, email (show only fields that are populated).
  - "Back to Experiences" breadcrumb.

- **F-09.4 — Create / edit experience form `/experiences/create` and `/experiences/edit/[id]`:**
  - Access: Authenticated users and hosts only.
  - Fields: Title, Description (textarea), Category (dropdown using enum list), Lake (dropdown of 11 lakes, optional), Duration (text, optional), Price From (number, optional), Website (URL, optional), Phone (optional), Email (optional), Images (same upload component used for properties, max 10 images, 2MB limit).
  - On submit: `POST /api/experiences`. On success: redirect to the new experience's detail page.
  - Edit: pre-populate fields from existing experience. On submit: `PUT /api/experiences/:id`.

- **F-09.5 — Experiences in main navigation:** The "Experiences" link in the main nav is already present. Ensure it routes to `/experiences`. Add an "Add an experience" link in the nav dropdown for authenticated users (alongside "Become a host").

- **F-09.6 — Homepage experiences teaser (optional future):** Consider a small "Explore Experiences" section on the homepage below "Explore the Finger Lakes." Not required for initial launch of this feature but reserve the section slot.

---

### F-10 SEO & Structured Data

**These tasks improve Google discoverability and search rankings for terms like "Finger Lakes vacation rentals," "[Lake name] vacation rentals," etc.**

#### Backend

- **B-10.1 — Sitemap endpoint `GET /sitemap.xml`:**
  - Dynamically generates an XML sitemap.
  - Includes: all public pages (`/`, `/homes`, `/pricing`, `/experiences`, `/homes/[lake-slug]` for all 11 lakes), all active property profile pages (`/properties/[slug]`), all active experience pages (`/experiences/[slug]`).
  - Sets `<lastmod>` to `property.updatedAt` / `experience.updatedAt` for dynamic pages.
  - Sets `<changefreq>` appropriately: `weekly` for property pages, `monthly` for static pages.
  - Submit the sitemap URL to Google Search Console after deployment.

- **B-10.2 — Robots.txt:** Serve a `robots.txt` at the root that allows all crawlers and references the sitemap URL.

#### Frontend

- **F-10.1 — Page-level meta tags:** Use Nuxt's `useHead` or `useSeoMeta` composable to set `<title>` and `<meta name="description">` on every page:
  - Homepage: title "Finger Lakes Vacation Rentals — FLX Vacations", description "Browse lakefront cottages, vineyard retreats, and cabin rentals in the Finger Lakes region of New York. No commission booking."
  - `/homes`: title "Finger Lakes Vacation Homes | FLX Vacations", description "Search all vacation rentals across the Finger Lakes — Seneca, Cayuga, Keuka, Canandaigua, and more."
  - `/homes/[lake]`: title "[Lake Name] Vacation Rentals | FLX Vacations", description "Find vacation rentals on [Lake Name] in the Finger Lakes, NY."
  - Property profile: title "[Property Title] — [City], NY | FLX Vacations", description First 155 characters of `property.description`.
  - `/experiences`: title "Finger Lakes Experiences — Wine Tours, Boat Cruises & More | FLX Vacations"
  - `/pricing`: title "Host Pricing — List Your Finger Lakes Property | FLX Vacations"

- **F-10.2 — Open Graph and Twitter Card tags:** On all pages, add:
  - `og:title`, `og:description`, `og:url`, `og:image` (property main image for property pages; site hero image for static pages), `og:type` (`website` for static, `article` for listing pages).
  - `twitter:card`, `twitter:title`, `twitter:description`, `twitter:image`.
  - These enable rich previews when links are shared on social media.

- **F-10.3 — JSON-LD structured data on property profile pages:** Inject a `<script type="application/ld+json">` block on every property page using the `LodgingBusiness` schema type:
  ```json
  {
    "@context": "https://schema.org",
    "@type": "LodgingBusiness",
    "name": "[property.title]",
    "description": "[property.description]",
    "image": ["[main image URL]"],
    "address": {
      "@type": "PostalAddress",
      "streetAddress": "[location.street]",
      "addressLocality": "[location.city]",
      "addressRegion": "NY",
      "postalCode": "[location.zipcode]",
      "addressCountry": "US"
    },
    "numberOfRooms": "[property.bedrooms]",
    "url": "https://flxvacations.com/properties/[slug]"
  }
  ```
  Add `"aggregateRating"` only when review data is available (F-08.7).

- **F-10.4 — JSON-LD on homepage:** Add `Organization` schema:
  ```json
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "FLX Vacations",
    "url": "https://flxvacations.com",
    "description": "Finger Lakes vacation rental directory — short-term rentals with no commission.",
    "areaServed": "Finger Lakes, New York"
  }
  ```

- **F-10.5 — Canonical tags:** Add `<link rel="canonical" href="[page URL]">` on all pages to prevent duplicate content issues (important for `/homes?where=...` URL variants).

- **F-10.6 — Image alt text audit:** Audit all `<img>` tags site-wide. Every image must have a descriptive `alt` attribute. For property images: use `image.description` if set, otherwise fall back to `"[property.title] — [roomType]"`. For experience images: use `"[experience.title] experience in the Finger Lakes"`.

- **F-10.7 — Internal linking — lake pages in footer:** All 11 lake pages must be linked in the footer under "The Finger Lakes" (this also satisfies F-01.4). This is important for Google to discover and index all lake-specific landing pages.

---

## 7. Recommended Implementation Order

Implement in this sequence. Each step builds on or enables the next.

| Step | Feature | Rationale |
|---|---|---|
| 1 | **F-01** Critical Bug Fixes | Fixes guest-visible bugs (ObjectId amenities, admin auth). Must be first. |
| 2 | **F-02** Pricing Page Correction | Quick win; corrects misleading information before any marketing. |
| 3 | **F-03** Amenities Fix & Grouped Component | Fixes broken display; `AmenitiesGroupList` is reused in F-04 and F-07. |
| 4 | **F-04** Search Bar Component | Builds the reusable `SearchBar` component; needed on /homes (F-05). |
| 5 | **F-05** Google Maps | Requires coordinates (B-05.1) and search bar (F-04) to be wired. |
| 6 | **F-06** Stripe Billing | Unlocks monetization; plan data is required by F-07 and F-08. |
| 7 | **F-07** Host Dashboard | Requires subscription data (F-06) and view tracking. |
| 8 | **F-08** OwnerRez Integration | Pro-tier only; requires billing (F-06) to gate access. |
| 9 | **F-09** Experiences Directory | Independent feature; can begin after F-01–F-03 are stable. |
| 10 | **F-10** SEO & Structured Data | Can be layered in throughout but fully implemented last for completeness. |

---

## 8. Known Bugs

| ID | Description | Status | Feature |
|---|---|---|---|
| BUG-01 | Property amenities display raw MongoDB ObjectIds on all property profile pages | **Fixed Apr 24, 2026** | F-01, F-03 |
| BUG-02 | Admin users receive "You don't have permission" error when attempting to edit any property | **Fixed (pre-existing)** | F-01 |
| BUG-03 | Admin users receive "Not authorized, user not found" when uploading images to a property | **Fixed (pre-existing)** | F-01 |
| BUG-04 | Dev mode: intermittent `Failed to fetch` on initial page load for `/api/properties` and `/api/properties/[slug]` — resolves on refresh | **Fixed Apr 24, 2026** — `onMounted` client-side retry added to `/homes`, `/homes/[slug]`, and `/properties/[id]` pages | F-01 |
| BUG-05 | Guest review section displays `0.0` scores instead of a no-reviews message | **Fixed Apr 24, 2026** | F-01 |
| BUG-06 | Pricing page advertises Free tier features that belong to Boost | **Fixed Apr 23, 2026** | F-02 |
| BUG-07 | Footer links for "Host resources", "Community forum", "Help center", "Contact us", "Privacy policy" all route to `#` | **Fixed Apr 23, 2026** | F-01 |
| BUG-08 | Footer only links to 4 of 11 Finger Lakes | **By design** — footer permanently links to the top 4 lakes (Seneca, Cayuga, Keuka, Canandaigua) by listing volume; remaining 7 lakes accessible via /homes lake selector | F-01, F-10 |
| BUG-09 | Google Map missing on `/homes` and `/homes/[lake]` pages | **Fixed Apr 25, 2026** — API key set in PM2 env; hover sync, InfoWindow, and lake centering implemented; blank grey map caused by zero-height CSS circular dependency (`lg:h-full` with `self-start` parent) fixed with `lg:h-[520px]` | F-05 |

---

## Appendix

### A. Finger Lakes Reference

All 11 lakes and their URL slugs:

| Lake | Slug |
|---|---|
| Conesus Lake | `conesus-lake` |
| Hemlock Lake | `hemlock-lake` |
| Canadice Lake | `canadice-lake` |
| Honeoye Lake | `honeoye-lake` |
| Canandaigua Lake | `canandaigua-lake` |
| Keuka Lake | `keuka-lake` |
| Seneca Lake | `seneca-lake` |
| Cayuga Lake | `cayuga-lake` |
| Owasco Lake | `owasco-lake` |
| Skaneateles Lake | `skaneateles-lake` |
| Otisco Lake | `otisco-lake` |

### B. Amenity Category Display Order

Fixed order for grouped UI display (F-03, F-10):
`essentials` → `location` → `kitchen` → `outside` → `entertainment` → `luxury` → `environmentally-friendly`

### C. Stripe Price ID Configuration

Store Stripe Price IDs in a config file or environment variables — never hardcode in route logic. Example structure:

```
STRIPE_PRICE_BOOST_ANNUAL_LAUNCH=price_xxxx
STRIPE_PRICE_BOOST_ANNUAL_STANDARD=price_xxxx
STRIPE_PRICE_PRO_ANNUAL_LAUNCH=price_xxxx
STRIPE_PRICE_PRO_ANNUAL_STANDARD=price_xxxx
STRIPE_PRICE_PRO_LIFETIME_LAUNCH=price_xxxx
```

### D. Changelog

| Date | Version | Author | Changes |
|---|---|---|---|
| Feb 12, 2026 | 0.1 | Jason | Initial scaffolding |
| Apr 22, 2026 | 0.2 | Jason | Full rewrite: added F-01 through F-10, Stripe billing, OwnerRez, Experiences, SEO, host dashboard, search bar component, Google Maps, amenity grouped component. Separated backend/frontend tasks throughout. |
| Apr 23, 2026 | 0.3 | Jason | Marked F-02 fixed. Marked F-01.3 (footer links) fixed: "Community forum" removed, "Help center" replaced with "Documentation", Contact and Privacy pages created. BUG-06 and BUG-07 closed. |
| Apr 24, 2026 | 0.4 | Jason | F-01.1 fixed (amenity display with grouping). F-01.2 fixed (reviews zero state). B-01.1–B-01.3 confirmed pre-existing fixes. F-03 frontend complete: AmenitiesGroupList component built, wired to create/edit forms and profile page. F-05 Google Maps implemented: API key configured, hover sync, InfoWindow click overlays, lake pre-centering. GA4 (G-WXSET9QNSD) added via nuxt.config.ts head scripts. BUG-01, BUG-02, BUG-03, BUG-05, BUG-09 closed. BUG-08 deferred. |
| Apr 25, 2026 | 0.5 | Jason | F-05 map fully working in production: root cause of blank grey map (zero-height `mapEl` due to `lg:h-full` CSS circular dependency with `self-start` flex parent) identified and fixed. API key moved to `ecosystem.config.cjs` PM2 env block. F-05.3a custom map pins added as next pending task. BUG-09 updated with full fix details. |
| Apr 24, 2026 | 0.6 | Jason | B-01.4 fixed: `onMounted` client-side retry added to `/homes`, `/homes/[slug]`, and `/properties/[id]` pages to recover from dev-mode SSR fetch failures. BUG-04 closed. F-01.4 updated to document the deliberate decision to link only the top 4 lakes in the footer. BUG-08 closed as by design. All F-01 items are now resolved. |
| Apr 24, 2026 | 0.7 | Jason | F-04 Filter Panel complete: `FilterPanel.vue` built and wired into `/homes` and `/homes/[slug]`. Applied filter chips, top amenity quick-selects (pets, parking, check-in, wifi), room/bed steppers (max 8), grouped amenities (slug-keyed), URL-persisted filter state, filter count badge, clear all. B-04.1 extended: `minBedrooms`, `minBeds`, `minBathrooms` added to `GET /api/properties`. `pets-allowed` and `free-parking` amenities seeded to production DB. F-04.5 and F-04.6 added to PRD. Google Maps Map ID created and documented. `SearchBar.vue` filter button infrastructure added. Unused lake dropdown state removed from `/homes`. |
