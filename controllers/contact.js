const asyncHandler = require('../utils/asyncHandler');
const { httpError } = require('../middleware/errorHandler');
const sendEmail = require('../utils/sendEmail');
const { logAction } = require('../utils/securityLogger');

const MAX_MESSAGE = 5000;

/**
 * POST /api/contact  (CRM-1)
 * Public contact form. Sends the message to CONTACT_TO with Reply-To set to
 * the visitor, so replying in a normal mail client just works.
 */
exports.submitContact = asyncHandler(async (req, res) => {
  const { name, email, message } = req.body || {};
  if (!name || !String(name).trim()) throw httpError(400, 'Name is required.');
  const emailNorm = String(email || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) throw httpError(400, 'A valid email is required.');
  const body = String(message || '').trim();
  if (!body) throw httpError(400, 'Message is required.');
  if (body.length > MAX_MESSAGE) throw httpError(400, `Message must be under ${MAX_MESSAGE} characters.`);

  const to = process.env.CONTACT_TO || 'jason@flxcompass.com';
  const result = await sendEmail({
    to,
    replyTo: `${String(name).trim()} <${emailNorm}>`,
    subject: `[flxvacations.com] Contact form: ${String(name).trim()}`,
    text: `From: ${String(name).trim()} <${emailNorm}>\n\n${body}`,
  });

  if (result?.skipped) {
    // SMTP unconfigured (dev) — treat as success for the visitor but log it.
    console.log('[contact] message NOT delivered (SMTP unconfigured):', { name, email: emailNorm });
  }
  logAction('contact-form', { success: true, detail: { email: emailNorm } });
  res.json({ message: "Thanks — we got your message and we'll get back to you soon." });
});
