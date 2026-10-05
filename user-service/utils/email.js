require("dotenv").config();
const sgMail = require("@sendgrid/mail");
const crypto = require("crypto"); // Securely generate OTP

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const FROM = {
  email: process.env.EMAIL_FROM,
  name: process.env.EMAIL_FROM_NAME || "Buniyad Techz",
};

const otpStore = new Map();

// Helper to strip HTML tags for plain-text version (Improves spam score)
const stripHtml = (html = "") =>
  html.replace(/<style[\s\S]*?<\/style>/gi, "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

// Responsive HTML template for emails
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
 * 1. Generate and send an OTP email
 * @param {string} email
 */
const sendOTPEmail = async (email) => {
  try {
    // Generate a secure 6-digit random OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    
    // Set OTP expiration time to 10 minutes from now
    const expiresAt = Date.now() + 10 * 60 * 1000; 

    // Store in memory (converted to lowercase to avoid case-sensitivity issues)
    otpStore.set(email.toLowerCase(), { otp, expiresAt });

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
          <p>This code is valid for <strong>10 minutes</strong>. Do not share this code with anyone.</p>
        `,
      },
    });

    return result;
  } catch (err) {
    console.error("❌ Send OTP failed:", err);
    return { success: false, error: err.message };
  }
};

/**
 * 2. Verify the submitted OTP
 * @param {string} email
 * @param {string} userOtp
 */
const verifyOTP = (email, userOtp) => {
  const record = otpStore.get(email.toLowerCase());

  // Check if OTP record exists
  if (!record) {
    return { success: false, message: "No OTP found or expired. Please request a new one." };
  }

  // Check if OTP has expired
  if (Date.now() > record.expiresAt) {
    otpStore.delete(email.toLowerCase());
    return { success: false, message: "OTP has expired. Please request a new one." };
  }

  // Check if the provided OTP matches
  if (record.otp !== userOtp.toString().trim()) {
    return { success: false, message: "Invalid OTP. Please try again." };
  }

  // Delete OTP after successful verification to prevent reuse
  otpStore.delete(email.toLowerCase());
  return { success: true, message: "OTP verified successfully!" };
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

// Exporting functions
module.exports = { 
  sendEmail, 
  sendOTPEmail, 
  verifyOTP, 
  sendBulkEmail, 
  baseTemplate 
};

// ---- Quick test: `node email.js you@example.com` ----
if (require.main === module) {
  const email = process.argv[2];
  if (!email) {
    console.log("Usage: node email.js recipient@example.com");
    process.exit(1);
  }
  
  // Trigger test OTP send
  sendOTPEmail(email).then((res) => {
    console.log("Test Result:", res);
  });
}