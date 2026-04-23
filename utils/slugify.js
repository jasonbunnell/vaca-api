/**
 * URL-safe slug from display text (aligned with Property title slugify).
 */
function slugifyDisplay(text) {
  if (!text) return '';
  return String(text)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

module.exports = { slugifyDisplay };
