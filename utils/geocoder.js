const NodeGeocoder = require('node-geocoder');

/**
 * Geocode a full address string (e.g. street, city, state, zip) using GEOCODER_PROVIDER / GEOCODER_API_KEY.
 * @param {string} addressString
 * @returns {Promise<object>} location object for Property.location
 */
async function geocodeAddress(addressString) {
  const trimmed = String(addressString || '').trim();
  if (!trimmed) {
    throw new Error('Address is required for geocoding');
  }

  const apiKey = process.env.GEOCODER_API_KEY;
  const provider = process.env.GEOCODER_PROVIDER || 'google';
  if (!apiKey) {
    throw new Error('GEOCODER_API_KEY is not set');
  }

  const geocoder = NodeGeocoder({
    provider,
    apiKey,
  });

  const results = await geocoder.geocode(trimmed);
  if (!results || !results.length) {
    throw new Error('Address could not be geocoded');
  }

  const r = results[0];
  const stateCode =
    r.administrativeLevels?.level1short ||
    r.administrativeLevels?.level2short ||
    '';

  return {
    coordinates: {
      latitude: r.latitude,
      longitude: r.longitude,
    },
    country: r.country || '',
    countryCode: r.countryCode || '',
    city: r.city || '',
    zipcode: r.zipcode || '',
    streetName: r.streetName || '',
    streetNumber: r.streetNumber || '',
    stateCode,
    formattedAddress: r.formattedAddress || trimmed,
  };
}

module.exports = { geocodeAddress };
