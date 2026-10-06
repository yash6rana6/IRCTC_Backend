require("dotenv").config();
const sgMail = require("@sendgrid/mail");
const { config } = require("../config/index");

if (!process.env.SENDGRID_API_KEY || !process.env.EMAIL_FROM) {
  console.warn("⚠️  SENDGRID_API_KEY or EMAIL_FROM missing in .env — emails will fail");
}
sgMail.setApiKey(process.env.SENDGRID_API_KEY || "");

const FROM = {
  email: process.env.EMAIL_FROM,
  name: process.env.EMAIL_FROM_NAME || "Buniyad Techz",
};

// Strip HTML for plain-text version (better spam score)
const stripHtml = (html = "") =>
  html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const baseTemplate = ({ title, body, ctaText, ctaUrl }) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;">
          <tr>
            <td style="background:#4f46e5;padding:24px;text-align:center;color:#ffffff;font-size:22px;font-weight:bold;">
              ${FROM.name}
            </td>
          </tr>
          <tr>
            <td style="padding:32px 28px;color:#333333;font-size:15px;line-height:1.6;">
              <h2 style="margin:0 0 16px;color:#111827;">${title}</h2>
              ${body}
              ${
                ctaText && ctaUrl
                  ? `<p style="text-align:center;margin:28px 0 0;">
                      <a href="${ctaUrl}" style="background:#4f46e5;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">${ctaText}</a>
                    </p>`
                  : ""
              }
            </td>
          </tr>
          <tr>
            <td style="background:#f9fafb;padding:16px;text-align:center;color:#9ca3af;font-size:12px;">
              © ${new Date().getFullYear()} ${FROM.name}. All rights reserved.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

/**
 * Send a general email
 */
const sendEmail = async ({ to, subject, html, text, template, attachments, replyTo }) => {
  try {
    const finalHtml = html || (template ? baseTemplate(template) : undefined);

    const msg = {
      to,
      from: FROM,
      subject,
      html: finalHtml,
      text: text || stripHtml(finalHtml),
    };

    if (replyTo) msg.replyTo = replyTo;
    if (attachments?.length) {
      msg.attachments = attachments.map((a) => ({
        content: a.content,
        filename: a.filename,
        type: a.type || "application/octet-stream",
        disposition: "attachment",
      }));
    }

    const [res] = await sgMail.send(msg);
    console.log(`✅ Email sent to ${Array.isArray(to) ? to.join(", ") : to} | status: ${res.statusCode}`);
    return { success: true, statusCode: res.statusCode };
  } catch (err) {
    const details = err.response?.body?.errors || err.message;
    console.error("❌ Email failed:", JSON.stringify(details, null, 2));
    return { success: false, error: details };
  }
};

/**
 * Send OTP email.
 * OTP generate + Redis storage + verify -> utils/otp.js handles that.
 * Ye function sirf mail bhejta hai, aur fail hone par throw karta hai
 * taaki auth.service ko pata chale (error middleware 500 dega).
 *
 * @param {string} email
 * @param {string|number} otp   - otp.js se aaya hua OTP
 * @param {number} [ttlSeconds] - default: config.OTP_TTL (seconds)
 */
const sendOTPEmail = async (email, otp, ttlSeconds = Number(config.OTP_TTL) || 300) => {
  if (!email) throw new Error("sendOTPEmail: email is required");
  if (!/^\d{4,8}$/.test(String(otp))) throw new Error("sendOTPEmail: invalid otp");

  const minutes = Math.max(1, Math.round(ttlSeconds / 60));

  const result = await sendEmail({
    to: email,
    subject: "Your Verification Code (OTP)",
    template: {
      title: "Verification Code",
      body: `
        <p>Hello,</p>
        <p>Your One-Time Password (OTP) for verification is:</p>
        <div style="text-align:center;margin:24px 0;">
          <span style="font-size:32px;font-weight:bold;letter-spacing:6px;color:#4f46e5;background:#f3f4f6;padding:12px 24px;border-radius:8px;display:inline-block;">${otp}</span>
        </div>
        <p>This code is valid for <strong>${minutes} minutes</strong>. Do not share this code with anyone.</p>
      `,
    },
  });

  if (!result.success) {
    throw new Error(`Failed to send OTP email: ${JSON.stringify(result.error)}`);
  }
  return result;
};

/**
 * Send bulk emails individually to multiple recipients
 */
const sendBulkEmail = async ({ recipients, subject, html, text }) => {
  try {
    const messages = recipients.map((to) => ({
      to,
      from: FROM,
      subject,
      html,
      text: text || stripHtml(html),
    }));
    await sgMail.send(messages);
    console.log(`✅ Bulk email sent to ${recipients.length} recipients`);
    return { success: true, count: recipients.length };
  } catch (err) {
    const details = err.response?.body?.errors || err.message;
    console.error("❌ Bulk email failed:", JSON.stringify(details, null, 2));
    return { success: false, error: details };
  }
};

module.exports = { sendEmail, sendOTPEmail, sendBulkEmail, baseTemplate };

// Quick test: node utils/email.js you@example.com 123456
if (require.main === module) {
  const [, , email, otp = "123456"] = process.argv;
  if (!email) {
    console.log("Usage: node utils/email.js recipient@example.com [otp]");
    process.exit(1);
  }
  sendOTPEmail(email, otp)
    .then((res) => console.log("Test Result:", res))
    .catch((err) => console.error("Test Failed:", err.message));
}