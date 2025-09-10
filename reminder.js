  // reminder.js
const mongoose = require('mongoose');
const Africastalking = require('africastalking');
require('dotenv').config();

// --- Africa's Talking configuration ---
const africastalking = Africastalking({
  apiKey: process.env.AT_API_KEY,        // Production API key
  username: process.env.AT_USERNAME     // App username
});

const sms = africastalking.SMS;

// --- MongoDB Booking Model ---
const Booking = require('./booking'); // booking.js exports your schema

// --- Connect to MongoDB ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB connected successfully for reminders'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- Helper function: send SMS ---
async function sendSMS(phone, message) {
  try {
    const response = await sms.send({
      to: [phone],
      message: message,
      // 'from' left undefined until Sender ID TRENDYNAILS is approved
    });
    console.log(' SMS sent:', response);
  } catch (err) {
    console.error(' Error sending SMS:', err);
  }
}

// --- Round time to nearest 30 minutes ---
function roundToNearest30(date) {
  const ms = 1000 * 60 * 30; // 30 minutes in ms
  return new Date(Math.ceil(date.getTime() / ms) * ms);
}

// --- Reminder check ---
async function checkReminders() {
  const now = new Date();
  console.log(`Checking reminders for ${now.toISOString().slice(0,16).replace('T',' ')}`);

  // Look for bookings 2 hours ahead, rounded to nearest 30 min
  const reminderTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const rounded = roundToNearest30(reminderTime);

  const targetDate = rounded.toISOString().split('T')[0]; // yyyy-mm-dd
  const targetTime = rounded.toTimeString().slice(0,5);   // HH:mm

  console.log(`🔍 Looking for bookings at ${targetDate} ${targetTime}`);

  try {
    const bookings = await Booking.find({
      date: targetDate,
      time: targetTime,
      reminded: false
    });

    if (bookings.length === 0) {
      console.log('ℹ No bookings found for this reminder slot.');
      return;
    }

    for (const booking of bookings) {
      if (!booking.phone) continue;
      const message = `Hi ${booking.name}, this is a reminder for your Trendy Nailsspot appointment today at ${booking.time}. 💅`;
      await sendSMS(booking.phone, message);

      booking.reminded = true;
      await booking.save();
      console.log(`Reminder sent and marked for ${booking.name}`);
    }
  } catch (err) {
    console.error(' Error fetching bookings:', err);
  }

  console.log('Reminder job finished.');
}

// --- Run job ---
checkReminders().then(() => process.exit(0));