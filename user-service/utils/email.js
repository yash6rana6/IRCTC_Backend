require("dotenv").config();
const nodemailer = require("nodemailer");
const { config } = require("../config/index");

if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
  console.warn("⚠️  EMAIL_USER or EMAIL_PASS missing in .env — emails will fail");
}

const FROM_NAME = process.env.EMAIL_FROM_NAME || "Buniyad Techz";

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS },
});

const stripHtml = (html = "") =>
  html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

const baseTemplate = ({ title, body, ctaText, ctaUrl }) => `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#f4f6f8;font-family:Arial,Helvetica,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:10px;overflow:hidden;">
        <tr><td style="background:#4f46e5;padding:24px;text-align:center;color:#ffffff;font-size:22px;font-weight:bold;">${FROM_NAME}</td></tr>
        <tr><td style="padding:32px 28px;color:#333333;font-size:15px;line-height:1.6;">
          <h2 style="margin:0 0 16px;color:#111827;">${title}</h2>
          ${body}
          ${ctaText && ctaUrl ? `<p style="text-align:center;margin:28px 0 0;"><a href="${ctaUrl}" style="background:#4f46e5;color:#ffffff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;">${ctaText}</a></p>` : ""}
        </td></tr>
        <tr><td style="background:#f9fafb;padding:16px;text-align:center;color:#9ca3af;font-size:12px;">© ${new Date().getFullYear()} ${FROM_NAME}. All rights reserved.</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

const sendEmail = async ({ to, subject, html, text, template, attachments, replyTo }) => {
  try {
    const finalHtml = html || (template ? baseTemplate(template) : undefined);
    const info = await transporter.sendMail({
      from: `"${FROM_NAME}" <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html: finalHtml,
      text: text || stripHtml(finalHtml),
      replyTo,
      attachments,
    });
    console.log(`✅ Email sent to ${Array.isArray(to) ? to.join(", ") : to} | id: ${info.messageId}`);
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error("❌ Email failed:", err.message);
    return { success: false, error: err.message };
  }
};

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

  if (!result.success) throw new Error(`Failed to send OTP email: ${result.error}`);
  return result;
};

const sendBulkEmail = async ({ recipients, subject, html, text }) => {
  const results = await Promise.all(recipients.map((to) => sendEmail({ to, subject, html, text })));
  const failed = results.filter((r) => !r.success).length;
  return { success: failed === 0, count: recipients.length, failed };
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