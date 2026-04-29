const { logAction } = require('../utils/securityLogger');

/**
 * Honeypot field check. Returns middleware that rejects requests with a
 * non-empty value in the named "trap" field. The frontend renders this field
 * as a CSS-hidden input that real users never see; bots scrape every input
 * from the form and fill it. A non-empty value is therefore strong evidence
 * of an automated client.
 *
 * The response is a generic 400 — don't tell the bot which field tripped.
 *
 * @param {string} fieldName  Name of the honeypot field. Default 'website'.
 */
function honeypot(fieldName = 'website') {
  return (req, res, next) => {
    const value = req.body?.[fieldName];
    const filled = value !== undefined && value !== null && String(value).trim() !== '';
    if (filled) {
      logAction('honeypot-triggered', {
        success: true,
        detail: {
          field: fieldName,
          ip: req.ip,
          path: req.originalUrl,
          // Truncate so a malicious payload can't blow up the log line.
          value: String(value).slice(0, 80),
        },
      });
      return res.status(400).json({ error: 'Invalid request.' });
    }
    next();
  };
}

module.exports = { honeypot };
