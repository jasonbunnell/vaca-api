const Property = require('../models/Property');
const asyncHandler = require('../utils/asyncHandler');

const SITE_URL = (process.env.PUBLIC_SITE_URL || 'https://flxvacations.com').replace(/\/+$/, '');

/**
 * Lake slugs mirror docs/PRD-updated.md Appendix A. "Other" is excluded —
 * properties tagged Other don't have a public lake landing page.
 */
const LAKE_SLUGS = [
  'conesus-lake',
  'hemlock-lake',
  'canadice-lake',
  'honeoye-lake',
  'canandaigua-lake',
  'keuka-lake',
  'seneca-lake',
  'cayuga-lake',
  'owasco-lake',
  'skaneateles-lake',
  'otisco-lake',
];

const STATIC_PAGES = [
  { path: '/', changefreq: 'monthly', priority: '1.0' },
  { path: '/homes', changefreq: 'daily', priority: '0.9' },
  { path: '/pricing', changefreq: 'monthly', priority: '0.6' },
  { path: '/experiences', changefreq: 'weekly', priority: '0.7' },
  { path: '/about', changefreq: 'yearly', priority: '0.4' },
  { path: '/partner', changefreq: 'yearly', priority: '0.4' },
  { path: '/contact', changefreq: 'yearly', priority: '0.3' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.3' },
  { path: '/documentation', changefreq: 'yearly', priority: '0.3' },
];

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry({ loc, lastmod, changefreq, priority }) {
  const parts = [`    <loc>${escapeXml(loc)}</loc>`];
  if (lastmod) parts.push(`    <lastmod>${lastmod}</lastmod>`);
  if (changefreq) parts.push(`    <changefreq>${changefreq}</changefreq>`);
  if (priority) parts.push(`    <priority>${priority}</priority>`);
  return `  <url>\n${parts.join('\n')}\n  </url>`;
}

function isoDay(date) {
  if (!date) return undefined;
  const d = date instanceof Date ? date : new Date(date);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().split('T')[0];
}

// @desc    Generate sitemap.xml for SEO crawlers
// @route   GET /sitemap.xml
// @access  Public
exports.getSitemap = asyncHandler(async (req, res) => {
  const properties = await Property.find({})
    .select('slug updatedAt')
    .sort({ updatedAt: -1 })
    .lean();

  const entries = [];

  for (const page of STATIC_PAGES) {
    entries.push(
      urlEntry({
        loc: `${SITE_URL}${page.path}`,
        changefreq: page.changefreq,
        priority: page.priority,
      })
    );
  }

  for (const slug of LAKE_SLUGS) {
    entries.push(
      urlEntry({
        loc: `${SITE_URL}/homes/${slug}`,
        changefreq: 'weekly',
        priority: '0.8',
      })
    );
  }

  for (const property of properties) {
    if (!property.slug) continue;
    entries.push(
      urlEntry({
        loc: `${SITE_URL}/properties/${property.slug}`,
        lastmod: isoDay(property.updatedAt),
        changefreq: 'weekly',
        priority: '0.7',
      })
    );
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries.join('\n')}\n</urlset>\n`;

  res.set('Content-Type', 'application/xml; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=3600');
  res.send(body);
});

// @desc    Serve robots.txt that references the sitemap
// @route   GET /robots.txt
// @access  Public
exports.getRobotsTxt = (req, res) => {
  const body = `User-agent: *\nAllow: /\nDisallow: /api/\n\nSitemap: ${SITE_URL}/sitemap.xml\n`;
  res.set('Content-Type', 'text/plain; charset=utf-8');
  res.set('Cache-Control', 'public, max-age=86400');
  res.send(body);
};
