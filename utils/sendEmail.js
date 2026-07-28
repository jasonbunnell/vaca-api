const nodemailer = require('nodemailer');

/**
 * Transactional email via SMTP (CRM-1). Provider-agnostic: prod points at
 * Brevo (smtp-relay.brevo.com), dev may point at a Mailtrap sandbox or stay
 * unconfigured — when unconfigured, sends are skipped with a console warning
 * and callers get { skipped: true } so features degrade gracefully.
 *
 * Env: SMTP_HOST, SMTP_PORT (default 587), SMTP_EMAIL, SMTP_PASSWORD,
 *      FROM_EMAIL, FROM_NAME, REPLY_TO (optional default Reply-To)
 */
let transporter = null;

function isConfigured() {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_EMAIL && process.env.SMTP_PASSWORD);
}

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASSWORD,
      },
    });
  }
  return transporter;
}

async function sendEmail({ to, subject, text, html, replyTo }) {
  if (!isConfigured()) {
    console.warn(`[email] SMTP not configured — skipped "${subject}" to ${to}`);
    return { skipped: true };
  }
  const from = `${process.env.FROM_NAME || 'FLX Vacations'} <${process.env.FROM_EMAIL || 'noreply@flxvacations.com'}>`;
  return getTransporter().sendMail({
    from,
    to,
    subject,
    text,
    html,
    replyTo: replyTo || process.env.REPLY_TO || undefined,
  });
}

module.exports = sendEmail;
module.exports.isConfigured = isConfigured;
