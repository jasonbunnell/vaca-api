const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { v4: uuidv4 } = require('uuid');

const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2MB
const BUCKET = process.env.SPACES_BUCKET_NAME || process.env.SPACE_BUCKET_NAME || 'flxvaca';
const REGION = process.env.SPACES_REGION || process.env.SPACE_REGION || 'nyc3';
const SPACES_CDN = process.env.SPACES_CDN_URL || `https://${BUCKET}.${REGION}.digitaloceanspaces.com`;

/**
 * S3/Spaces endpoint must be the region endpoint only (e.g. https://nyc3.digitaloceanspaces.com).
 * The AWS SDK adds the bucket as the host subdomain; if endpoint already contains the bucket you get
 * "flxvaca.flxvaca.nyc3..." and ERR_TLS_CERT_ALTNAME_INVALID.
 */
function getSpacesEndpoint() {
  const raw = process.env.SPACES_ENDPOINT || `https://${REGION}.digitaloceanspaces.com`;
  const bucketPrefix = new RegExp(`^https?://${BUCKET}\\.`, 'i');
  return raw.replace(bucketPrefix, (match) => match.replace(BUCKET + '.', ''));
}

function getS3Client() {
  const accessKeyId = process.env.SPACES_ACCESS_KEY_ID || process.env.DO_SPACES_KEY;
  const secretAccessKey = process.env.SPACES_SECRET_ACCESS_KEY || process.env.DO_SPACES_SECRET;
  if (!accessKeyId || !secretAccessKey) return null;
  const endpoint = getSpacesEndpoint();
  return new S3Client({
    region: 'us-east-1',
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: false,
  });
}

/**
 * POST /api/upload/image
 * Multipart form: image (file), optional propertyId
 * Uploads to DO Spaces: properties/photo_{propertyId}_{XX}.jpg
 */
exports.uploadImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image file provided' });
    }
    if (req.file.size > MAX_SIZE_BYTES) {
      return res.status(400).json({ error: 'Image must be 2MB or smaller' });
    }
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(req.file.mimetype)) {
      return res.status(400).json({ error: 'Invalid image type. Use JPEG, PNG, or WebP.' });
    }

    const client = getS3Client();
    if (!client) {
      return res.status(503).json({ error: 'Image storage not configured' });
    }

    const propertyId = (req.body && req.body.propertyId) || 'new';
    const extMap = { 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
    const ext = extMap[req.file.mimetype] || 'jpg';
    const shortId = uuidv4().slice(0, 8);
    const key = `properties/photo_${propertyId}_${shortId}.${ext}`;

    await client.send(
      new PutObjectCommand({
        Bucket: BUCKET,
        Key: key,
        Body: req.file.buffer,
        ContentType: req.file.mimetype,
        ACL: 'public-read',
      })
    );

    const url = `${SPACES_CDN}/${key}`;
    return res.status(200).json({ url });
  } catch (err) {
    console.error('Upload error:', err);
    return res.status(500).json({ error: 'Failed to upload image' });
  }
};
