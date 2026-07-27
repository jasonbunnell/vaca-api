/**
 * PERF-1 backfill: give every existing Spaces property image a long-lived
 * Cache-Control header and generate _w640/_w1280 webp variants.
 *
 * Dry-run by default (lists planned actions). Run with --apply to execute.
 * Non-destructive: originals are re-put byte-identical with new headers;
 * variants are new objects.
 *
 * Usage: node scripts/backfill-image-cache.js [--apply]
 */
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { S3Client, ListObjectsV2Command, GetObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const { CACHE_CONTROL, variantKey, isVariantKey, buildVariants } = require('../utils/imageVariants');

const APPLY = process.argv.includes('--apply');
const BUCKET = process.env.SPACES_BUCKET_NAME || 'flxvaca';
const REGION = process.env.SPACES_REGION || 'nyc3';
const endpointRaw = process.env.SPACES_ENDPOINT || `https://${REGION}.digitaloceanspaces.com`;
const endpoint = endpointRaw.replace(new RegExp(`^https?://${BUCKET}\\.`, 'i'), (m) => m.replace(BUCKET + '.', ''));

const client = new S3Client({
  region: 'us-east-1',
  endpoint,
  credentials: {
    accessKeyId: process.env.SPACES_ACCESS_KEY_ID,
    secretAccessKey: process.env.SPACES_SECRET_ACCESS_KEY,
  },
});

const CONTENT_TYPES = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };

async function bodyToBuffer(body) {
  const chunks = [];
  for await (const chunk of body) chunks.push(chunk);
  return Buffer.concat(chunks);
}

(async () => {
  const keys = [];
  let token;
  do {
    const page = await client.send(new ListObjectsV2Command({ Bucket: BUCKET, Prefix: 'properties/', ContinuationToken: token }));
    (page.Contents || []).forEach((o) => keys.push({ key: o.Key, size: o.Size }));
    token = page.IsTruncated ? page.NextContinuationToken : undefined;
  } while (token);

  const originals = keys.filter((o) => !isVariantKey(o.key));
  const existing = new Set(keys.map((o) => o.key));
  console.log(`Bucket ${BUCKET}: ${keys.length} objects under properties/, ${originals.length} originals`);

  let headered = 0, variantsMade = 0, skipped = 0, failed = 0;
  for (const { key, size } of originals) {
    const ext = (key.split('.').pop() || '').toLowerCase();
    const contentType = CONTENT_TYPES[ext];
    if (!contentType) { console.log(`SKIP (unknown ext): ${key}`); skipped++; continue; }
    const wanted = [640, 1280].map((w) => variantKey(key, w)).filter((k) => !existing.has(k));
    console.log(`${APPLY ? 'PROCESS' : 'WOULD PROCESS'}: ${key} (${(size / 1024).toFixed(0)}KB) → set headers${wanted.length ? ` + ${wanted.length} variants` : ''}`);
    if (!APPLY) continue;
    try {
      const got = await client.send(new GetObjectCommand({ Bucket: BUCKET, Key: key }));
      const buf = await bodyToBuffer(got.Body);
      await client.send(new PutObjectCommand({
        Bucket: BUCKET, Key: key, Body: buf, ContentType: contentType,
        CacheControl: CACHE_CONTROL, ACL: 'public-read',
      }));
      headered++;
      if (wanted.length) {
        const variants = await buildVariants(buf);
        for (const v of variants) {
          const vk = variantKey(key, v.width);
          if (existing.has(vk)) continue;
          await client.send(new PutObjectCommand({
            Bucket: BUCKET, Key: vk, Body: v.data, ContentType: 'image/webp',
            CacheControl: CACHE_CONTROL, ACL: 'public-read',
          }));
          variantsMade++;
          console.log(`  + ${vk} (${(v.data.length / 1024).toFixed(0)}KB)`);
        }
      }
    } catch (e) {
      failed++;
      console.error(`FAILED: ${key} — ${e.message}`);
    }
  }
  console.log(`\nDone. headers set: ${headered}, variants created: ${variantsMade}, skipped: ${skipped}, failed: ${failed}${APPLY ? '' : ' (dry-run — use --apply)'}`);
})().catch((e) => { console.error('ERR', e.message); process.exit(1); });
