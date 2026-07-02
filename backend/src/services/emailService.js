const nodemailer = require('nodemailer');
const logger     = require('../utils/logger');

let transporter = null;

const getTransporter = () => {
  if (transporter) return transporter;
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });
  return transporter;
};
exports.sendOTPEmail = async (email, otp, name = 'there') => {
  if (!process.env.EMAIL_USER) {
    logger.info(`[DEV] OTP for ${email}: ${otp}`);
    return;
  }
  try {
    await getTransporter().sendMail({
      from:    process.env.EMAIL_FROM,
      to:      email,
      subject: `${otp} — Your RideShare OTP`,
      html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#f8fafc;font-family:Arial,sans-serif">
        <div style="max-width:480px;margin:40px auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
          <div style="background:linear-gradient(135deg,#6366f1,#4338ca);padding:32px 40px;text-align:center">
            <div style="font-size:32px;margin-bottom:8px">📍</div>
            <h1 style="color:#fff;margin:0;font-size:24px;font-weight:700">RideShare</h1>
            <p style="color:rgba(255,255,255,0.7);margin:4px 0 0;font-size:13px">Smart Mobility Network</p>
          </div>
          <div style="padding:40px">
            <p style="color:#374151;font-size:16px;margin:0 0 8px">Hi ${name} 👋</p>
            <p style="color:#6b7280;font-size:14px;margin:0 0 32px;line-height:1.6">
              Use this OTP to verify your RideShare account. It expires in <strong>5 minutes</strong>.
            </p>
            <div style="background:#f1f5f9;border-radius:12px;padding:24px;text-align:center;margin-bottom:32px;border:2px dashed #e2e8f0">
              <p style="color:#6b7280;font-size:11px;margin:0 0 8px;text-transform:uppercase;letter-spacing:2px;font-weight:700">Your OTP</p>
              <div style="font-size:44px;font-weight:800;color:#4f46e5;letter-spacing:10px;font-family:monospace">${otp}</div>
              <p style="color:#9ca3af;font-size:12px;margin:8px 0 0">Valid for 5 minutes only</p>
            </div>
            <div style="background:#fef3c7;border-radius:8px;padding:12px 16px;margin-bottom:24px">
              <p style="color:#92400e;font-size:13px;margin:0;line-height:1.5">
                ⚠️ Never share this OTP. RideShare will never ask for your OTP.
              </p>
            </div>
            <p style="color:#9ca3af;font-size:13px;margin:0;text-align:center">
              If you didn't request this, ignore this email.
            </p>
          </div>
          <div style="background:#f8fafc;padding:20px 40px;text-align:center;border-top:1px solid #e5e7eb">
            <p style="color:#9ca3af;font-size:12px;margin:0">© 2024 RideShare India 🇮🇳</p>
          </div>
        </div>
      </body>
      </html>
      `,
    });
    logger.info(`OTP email sent to ${email}`);
  } catch (err) {
    logger.error('Email send failed', { error: err.message });
    logger.info(`[FALLBACK] OTP for ${email}: ${otp}`);
  }
};

exports.sendWelcomeEmail = async (email, name) => {
  if (!process.env.EMAIL_USER) return;
  try {
    await getTransporter().sendMail({
      from:    process.env.EMAIL_FROM,
      to:      email,
      subject: `Welcome to RideShare, ${name}! 🎉`,
      html: `
      <div style="max-width:480px;margin:40px auto;font-family:Arial,sans-serif">
        <div style="background:linear-gradient(135deg,#6366f1,#4338ca);padding:32px;border-radius:16px 16px 0 0;text-align:center">
          <h1 style="color:#fff;margin:0;font-size:24px">Welcome to RideShare! 🎉</h1>
        </div>
        <div style="background:#fff;padding:32px;border-radius:0 0 16px 16px;border:1px solid #e5e7eb">
          <p style="color:#374151;font-size:15px">Hi ${name},</p>
          <p style="color:#6b7280;line-height:1.7;font-size:14px">
            You're now part of India's smartest ride-sharing network.<br/>
            Start by searching for a ride or offering your first ride to earn money!
          </p>
          <a href="http://localhost:3000/dashboard"
             style="display:block;background:#4f46e5;color:#fff;text-align:center;padding:14px;border-radius:12px;text-decoration:none;font-weight:600;margin-top:24px;font-size:15px">
            Go to Dashboard →
          </a>
          <p style="color:#9ca3af;font-size:12px;margin-top:24px;text-align:center">
            © 2024 RideShare India 🇮🇳
          </p>
        </div>
      </div>
      `,
    });
    logger.info(`Welcome email sent to ${email}`);
  } catch (err) {
    logger.error('Welcome email failed', { error: err.message });
  }
};