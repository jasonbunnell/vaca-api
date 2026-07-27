const sharp = require('sharp');

/**
 * Responsive variants for property photos (PRD-summer-26 PERF-1).
 * Convention: properties/photo_X_01.jpg -> properties/photo_X_01_w640.webp, _w1280.webp
 * Small originals are never upscaled (withoutEnlargement), so a variant may be
 * narrower than its nominal width — the srcset descriptor is still correct enough
 * for browser selection at these two breakpoints.
 */
const VARIANT_WIDTHS = [640, 1280];
const CACHE_CONTROL = 'public, max-age=31536000, immutable';

function variantKey(key, width) {
  return key.replace(/\.[a-z0-9]+$/i, `_w${width}.webp`);
}

function isVariantKey(key) {
  return /_w\d+\.webp$/i.test(key);
}

async function buildVariants(buffer) {
  const out = [];
  for (const width of VARIANT_WIDTHS) {
    const data = await sharp(buffer)
      .rotate() // respect EXIF orientation
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toBuffer();
    out.push({ width, data });
  }
  return out;
}

module.exports = { VARIANT_WIDTHS, CACHE_CONTROL, variantKey, isVariantKey, buildVariants };
