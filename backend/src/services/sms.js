exports.sendOTP = async (phone, otp) => {
  if (!process.env.TWILIO_ACCOUNT_SID) return;
  const twilio = require('twilio')(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_AUTH_TOKEN
  );
  await twilio.messages.create({
    body: `Your RideShare OTP is ${otp}. Valid for 5 minutes. Do not share with anyone.`,
    from: process.env.TWILIO_PHONE,
    to:   phone,
  });
};