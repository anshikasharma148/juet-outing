const twilio = require('twilio');

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

let client = null;

if (accountSid && authToken) {
  client = twilio(accountSid, authToken);
}

const sendOTP = async (phone, otp) => {
  if (!client) {
    console.log(`[SMS Service] OTP for ${phone}: ${otp}`);
    return { success: true, message: 'OTP logged (Twilio not configured)' };
  }

  try {
    const message = await client.messages.create({
      body: `Your JUET Outing App OTP is: ${otp}. Valid for 10 minutes.`,
      from: phoneNumber,
      to: phone
    });
    return { success: true, messageId: message.sid };
  } catch (error) {
    console.error('Twilio error:', error);
    return { success: false, error: error.message };
  }
};

const sendNotification = async (phone, message) => {
  if (!client) {
    console.log(`[SMS Service] Notification to ${phone}: ${message}`);
    return { success: true };
  }

  try {
    await client.messages.create({
      body: message,
      from: phoneNumber,
      to: phone
    });
    return { success: true };
  } catch (error) {
    console.error('Twilio error:', error);
    return { success: false, error: error.message };
  }
};

module.exports = { sendOTP, sendNotification };

