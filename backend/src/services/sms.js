const logger = require('../utils/logger');

exports.sendOTP = async (phone, otp) => {
  if (!process.env.TWILIO_ACCOUNT_SID) {
    logger.info(`[DEV] OTP for ${phone}: ${otp}`);
    return;
  }

  try {
    const twilio = require('twilio')(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );

    // Use Twilio Verify service (better for OTP, no phone number needed)
    if (process.env.TWILIO_VERIFY_SID) {
      await twilio.verify.v2
        .services(process.env.TWILIO_VERIFY_SID)
        .verifications.create({ to: phone, channel: 'sms' });
      logger.info(`OTP sent via Twilio Verify to ${phone}`);
      return;
    }

    // Fallback: direct SMS
    await twilio.messages.create({
      body: `Your RideShare OTP is ${otp}. Valid for 5 minutes. Do not share with anyone.`,
      from: process.env.TWILIO_PHONE,
      to:   phone,
    });
    logger.info(`OTP sent via SMS to ${phone}`);

  } catch (err) {
    logger.error(`SMS failed`, { error: err.message });
    logger.info(`[FALLBACK] OTP for ${phone}: ${otp}`);
  }
};