# Amenity icons

Outline SVG icons for each amenity slug live in the **frontend** repo:

- **Path:** `flxvacations.com/public/icons/amenities/{amenity-name}.svg`
- **Naming:** `{amenity-name}` = `Amenity.name` (same as the first column in [amenities.md](amenities.md))

Icons use **`stroke="currentColor"`**, **no fill background**, **viewBox `0 0 24 24`**, so they inherit text color from CSS.

## Regenerate from source

```bash
cd ../flxvacations.com
npm run icons:amenities
```

Generator script: `flxvacations.com/scripts/generate-amenity-icons.js`.

## Optional: `Amenity.icon` field

You can store a public path such as `/icons/amenities/wifi.svg` in the `icon` string on each amenity document for the UI to resolve.
