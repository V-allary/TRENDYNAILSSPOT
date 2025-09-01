// reminder.js
require('dotenv').config();
const mongoose = require('mongoose');
const africastalking = require('africastalking')({
  apiKey: process.env.AT_API_KEY,
  username: 'TrendyNailsspot'
});
const sms = africastalking.SMS;
const Booking = require('./models/Booking');

const mdso = process.env.MDSO;

// Toggle test mode (true = 1 minute, false = 2 hours)
const TEST_MODE = true;  

//  MongoDB connection
mongoose.connect(
  'mongodb+srv://trendy_nailsspot:' + mdso + '@cluster0.ae8ywlg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0'
).then(() => console.log(' MongoDB connected for reminders'))
 .catch(err => console.error('MongoDB connection error:', err));

//  Format phone numbers
const formatPhoneNumber = (phone) => {
  if (!phone) return null;
  let cleaned = phone.toString().replace(/\s+/g, '').replace(/-/g, '');
  if (cleaned.startsWith('0')) return '+254' + cleaned.slice(1);
  if (cleaned.startsWith('+')) return cleaned;
  return null;
};

//  Convert "HH:MM" -> total minutes
function timeToMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

//  Main reminder function
async function sendReminders() {
  try {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentMinutes = now.getHours() * 60 + now.getMinutes();

    // Test mode uses 1 minute, otherwise 2 hours
    const cutoffMinutes = currentMinutes + (TEST_MODE ? 1 : 120);

    console.log(TEST_MODE ? "🧪 Running in TEST MODE (1 min)" : "⏱ Running in NORMAL MODE (2 hrs)");

    //  Only today's bookings
    const bookings = await Booking.find({ date: currentDate });
    console.log(`📅 Found ${bookings.length} bookings for today.`);

    if (!bookings.length) return;

    for (const booking of bookings) {
      const bookingMinutes = timeToMinutes(booking.time);

      // Skip if no time or outside window
      if (!bookingMinutes || bookingMinutes < currentMinutes || bookingMinutes > cutoffMinutes) {
        console.log(`Skipping ${booking.name} (${booking.time}) – not within window`);
        continue;
      }

      const formattedPhone = formatPhoneNumber(booking.phone);
      if (!formattedPhone) {
        console.log(`Skipping ${booking.name}, invalid phone: ${booking.phone}`);
        continue;
      }

      const message = `Hello ${booking.name}, this is a friendly reminder that your appointment at TrendyNailsspot is today at ${booking.time}. See you soon!`;

      try {
        const response = await sms.send({
          to: [formattedPhone],
          message,
          enqueue: true
        });

        console.log(`Reminder sent to ${booking.name} (${formattedPhone})`);
        console.log(response);
      } catch (err) {
        console.error(` Failed for ${booking.name} (${formattedPhone}):`, err);
      }
    }
  } catch (error) {
    console.error('Reminder Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

// Run immediately
sendReminders();