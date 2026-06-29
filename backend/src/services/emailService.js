// Plug in Nodemailer or SendGrid here when needed
exports.sendReceiptEmail = async (to, { bookingId, amount, route }) => {
  if (!process.env.SMTP_HOST) return;
  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
  await transporter.sendMail({
    from:    `RideShare <${process.env.SMTP_USER}>`,
    to,
    subject: `Booking confirmed — ${route}`,
    html:    `<p>Your booking <b>${bookingId}</b> is confirmed. Amount paid: ₹${amount}</p>`,
  });
};