 // reminder.js
require('dotenv').config();
const mongoose = require('mongoose');
const africastalking = require('africastalking')({
  apiKey: process.env.AT_API_KEY,
  username: 'TrendyNailsspot',
});

const sms = africastalking.SMS;
const Booking = require('./models/Booking');

// MongoDb connection
mongoose.connect(
  `mongodb+srv://trendy_nailsspot:${process.env.MDSO}@cluster0.ae8ywlg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
).then(() => console.log('MongoDB connected for reminders'))
 .catch(err => console.error(' MongoDB error:', err));

// Phone formatter
const formatPhoneNumber = (phone) => {
  if (!phone) return null;

  let cleaned = phone.trim();

  // Remove spaces
  cleaned = cleaned.replace(/\s+/g, '');

  // If starts with 0, change to +254
  if (cleaned.startsWith('0')) {
    return '+254' + cleaned.slice(1);
  }

  // If starts with 254, add +
  if (cleaned.startsWith('254')) {
    return '+' + cleaned;
  }

  // Already in +254 format
  if (cleaned.startsWith('+254')) {
    return cleaned;
  }

  // Fallback: return as is
  return cleaned;
};

async function sendReminders() {
  try {
    const now = new Date();
    const testTime = new Date(now.getTime() + 1 * 60 * 1000); // ⏱️ 1 min for testing

    const currentDate = testTime.toISOString().split('T')[0];

    // Grab bookings for today (test mode: grab all)
    const bookings = await Booking.find({ date: currentDate });

    if (!bookings.length) {
      console.log(' No reminders to send right now.');
      return;
    }

    for (const booking of bookings) {
      const formattedPhone = formatPhoneNumber(booking.phone);

      if (!formattedPhone) {
        console.log(`Skipping ${booking.name} — invalid phone: ${booking.phone}`);
        continue;
      }

      const message = `Hello ${booking.name}, this is a friendly reminder that your appointment at TrendyNailsspot is today at ${booking.time}. See you soon!`;

      try {
        const response = await sms.send({
          to: [formattedPhone],
          message: message,
          enqueue: true,
        });

        console.log(`Reminder sent to ${booking.name} (${formattedPhone})`);
        console.log(response);
      } catch (err) {
        console.error(`Failed to send reminder to ${booking.name} (${formattedPhone}):`, err);
      }
    }
  } catch (error) {
    console.error('Reminder Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

sendReminders();