# Google Cloud: Geocoding + Maps (FLXvacations / vaca-api)

This project uses **two different Google surfaces** for different purposes:

| Use | API | Where the key runs | Typical key restriction |
|-----|-----|-------------------|-------------------------|
| **Server geocoding** (address → lat/lng, `node-geocoder`) | **Geocoding API** | Node server (vaca-api) — requests from **server IP**, no browser | **IP addresses** (production server) or **None** (local dev only) |
| **Map on website** (§5.3) | **Maps JavaScript API** | User’s browser | **HTTP referrers** (`https://flxvacations.com/*`, `http://localhost:*`) |

Using **one key** with **HTTP referrer** restrictions for **both** server and browser will make **server geocoding fail** (Google sees no `Referer` from Node). Prefer **two API keys** (recommended) or one unrestricted key only for development.

---

## 1. Project & billing

1. [Google Cloud Console](https://console.cloud.google.com/) → select or create a project.
2. **Billing** must be linked to the project (Maps Platform requires it).
3. Enable APIs (APIs & Services → **Library**):
   - **Geocoding API** — required for `GEOCODER_API_KEY` / server-side geocode.
   - **Maps JavaScript API** — required when you embed a map on flxvacations.com (§5.3).

(Optional later: Places, Static Maps, etc., only if you add those features.)

---

## 2. API key(s): Credentials

APIs & Services → **Credentials** → **Create credentials** → **API key**.

### Key A — Server (geocoding)

- **Name:** e.g. `vaca-api-geocoding`
- **Application restrictions:**  
  - **Local dev:** *None* (easiest), or **IP addresses** with your home/office egress IP if you know it.  
  - **Production:** **IP addresses** — add the **outbound** IP of the server that runs vaca-api (your VPS/load balancer), not the MongoDB host.
- **API restrictions:** Restrict key → select **Geocoding API** (minimum).  
  Do **not** use “HTTP referrers” for this key.

Copy the key into **`GEOCODER_API_KEY`** (and `GEOCODER_PROVIDER=google`) in vaca-api `.env`.

### Key B — Browser (Maps JavaScript)

- **Name:** e.g. `flxvacations-maps-js`
- **Application restrictions:** **HTTP referrers (web sites)**  
  Examples: `https://flxvacations.com/*`, `https://www.flxvacations.com/*`, `http://localhost:3000/*`
- **API restrictions:** **Maps JavaScript API** (and any other JS APIs you enable).

Expose to Nuxt as something like **`NUXT_PUBLIC_GOOGLE_MAPS_API_KEY`** (exact name TBD when §5.3 is implemented).

---

## 3. Verify Geocoding API (server)

Replace `YOUR_SERVER_KEY` with the **server** key (referrer restrictions must **not** block server use):

```bash
curl -sS "https://maps.googleapis.com/maps/api/geocode/json?address=1600+Amphitheatre+Parkway,+Mountain+View,+CA&key=YOUR_SERVER_KEY"
```

- **Success:** JSON with `"status": "OK"` and `results[0].geometry.location`.
- **`REQUEST_DENIED`:** Often wrong/missing **Geocoding API** enablement, billing, or **key restriction** (e.g. referrer-only key used from curl).
- **`API_KEY_INVALID`:** Wrong key or typo.
- **`OVER_QUERY_LIMIT`:** Quota; check quotas in Cloud Console.

---

## 4. Common mistakes

1. **Only Maps JavaScript API enabled** — Geocoding still needs **Geocoding API** enabled separately.
2. **Referrer-restricted key in `GEOCODER_API_KEY`** — `curl` and Node will get `REQUEST_DENIED`. Use a **server** key (IP or none).
3. **No billing** — APIs return errors until billing is active.
4. **Wrong API restriction on the key** — Key must list **Geocoding API** if you restrict by API.

---

## 5. Security

- Never commit real keys; use `.env` / secrets manager.
- If a key was committed or pasted in chat, **rotate** it in Credentials (regenerate / create new key, disable old).

---

## 6. PRD cross-references

- Env vars: [new-location-object.md](new-location-object.md) (`GEOCODER_PROVIDER`, `GEOCODER_API_KEY`).
- Homes map: [PRD.md](PRD.md) §5.3.
