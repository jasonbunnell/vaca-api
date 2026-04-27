const { S3Client, PutObjectCommand, DeleteObjectCommand } = require('@aws-sdk/client-s3');
const mongoose = require('mongoose');
const Property = require('../models/Property');
const { logAction } = require('../utils/securityLogger');
const { assertPropertyAccess } = require('../utils/propertyAccess');
const asyncHandler = require('../utils/asyncHandler');
const { httpError } = require('../middleware/errorHandler');

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
 * Derive Spaces object key from a full CDN URL (e.g. for delete).
 * Keys are always "properties/photo_xxx_xx.ext". If pathname contains "properties/", use from there so custom CDN paths work.
 */
function keyFromImageUrl(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return null;
  try {
    const u = new URL(imageUrl);
    const path = u.pathname.replace(/^\//, '');
    const propertiesIdx = path.indexOf('properties/');
    const key = propertiesIdx >= 0 ? path.slice(propertiesIdx) : path;
    return key || null;
  } catch {
    return null;
  }
}

/**
 * Delete an object from Spaces by key. No-op if client not configured.
 */
async function deleteFromSpaces(key) {
  const client = getS3Client();
  if (!client) return;
  await client.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/**
 * POST /api/upload/image
 * Multipart form: image (file), propertyId (required).
 * Uploads to DO Spaces: properties/photo_{propertyId}_{01..50}.{ext}, appends to property.images.
 * Caller must be host or admin of the property.
 */
exports.uploadImage = asyncHandler(async (req, res) => {
  if (!req.file) {
    throw httpError(400, 'No image file provided');
  }
  if (req.file.size > MAX_SIZE_BYTES) {
    throw httpError(400, 'Image must be 2MB or smaller');
  }
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (!allowedTypes.includes(req.file.mimetype)) {
    throw httpError(400, 'Invalid image type. Use JPG, JPEG, PNG, GIF, or WEBP.');
  }

  const propertyId = req.body && req.body.propertyId;
  if (!propertyId || !mongoose.Types.ObjectId.isValid(propertyId)) {
    throw httpError(400, 'Valid propertyId is required');
  }

  const property = await Property.findById(propertyId);
  if (!property) {
    throw httpError(404, 'Property not found');
  }

  const isAdmin = req.user?.role === 'admin';
  // Older properties may have been created before host was enforced. Only an admin can repair this.
  if (!(property.host || []).length) {
    if (!isAdmin) {
      throw httpError(400, 'Property has no hosts configured. Contact an admin to fix this property before uploading images.');
    }
    property.host = [req.user._id];
  } else {
    assertPropertyAccess(property, req.user);
  }

  if (property.images.length >= 50) {
    throw httpError(400, 'Property already has 50 images. Remove another to add one.');
  }

  const client = getS3Client();
  if (!client) {
    throw httpError(503, 'Image storage not configured');
  }

  const extMap = { 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
  const ext = extMap[req.file.mimetype] || 'jpg';
  const seq = String(property.images.length + 1).padStart(2, '0');
  const key = `properties/photo_${propertyId}_${seq}.${ext}`;

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
  const isMain = property.images.length === 0;
  property.images.push({
    url,
    room: 'Additional Photos',
    caption: '',
    isMain,
  });
  await property.save();

  logAction('image-upload', {
    userId: req.user._id,
    success: true,
    detail: { propertyId: property._id, imageUrl: url },
  });

  const added = property.images[property.images.length - 1];
  res.status(200).json({ url, image: added, propertyId: property._id });
});

/**
 * Delete an image from Spaces by URL. Used by property controller when removing an image.
 */
exports.deleteFromSpacesByUrl = async (imageUrl) => {
  const key = keyFromImageUrl(imageUrl);
  if (!key) return;
  await deleteFromSpaces(key);
};
