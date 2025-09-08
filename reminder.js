require('dotenv').config();
const express = require('express');
const twilio = require('twilio');

const app = express();
const PORT = process.env.PORT || 3000;

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);

// Test route for SMS
app.get('/test-sms', async (req, res) => {
  try {
    const message = await client.messages.create({
      body: "Hello Vallary! 👋 This is a test reminder from your Twilio trial account",
      from: process.env.TWILIO_PHONE_NUMBER,  // Twilio trial number
      to: "+254743747840"  // your verified Kenyan number
    });
    res.send("SMS sent! SID: " + message.sid);
  } catch (err) {
    console.error(err);
    res.status(500).send("Error sending SMS");
  }
});

app.listen(PORT, () => {
  console.log(`✅ Reminder test running on port ${PORT}`);
});