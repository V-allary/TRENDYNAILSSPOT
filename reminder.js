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
const Booking = require('./booking'); // corrected filename since you have booking.js

// --- Connect to MongoDB ---
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('MongoDB connected successfully for reminders'))
  .catch(err => console.error('MongoDB connection error:', err));

// --- Helper function: send SMS ---
async function sendSMS(phone, message) {
  try {
    const response = await sms.send({
      to: [phone],
      message: message,
      //   No 'from' while Sender ID is pending approval
    });
    console.log('SMS sent:', response);
  } catch (err) {
    console.error('Error sending SMS:', err);
  }
}

// --- Reminder check ---
async function checkReminders() {
  const now = new Date();
  console.log(`Checking reminders for ${now.toISOString().slice(0,16).replace('T',' ')}`);

  // Look for bookings exactly 2 hours ahead
  const reminderTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const targetDate = reminderTime.toISOString().split('T')[0]; // yyyy-mm-dd
  const targetTime = reminderTime.toTimeString().slice(0,5);   // HH:mm

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
      const message = `Hi ${booking.name}, this is a reminder for your Trendy Nailsspot appointment at ${booking.time}.`;
      await sendSMS(booking.phone, message);

      booking.reminded = true;
      await booking.save();
    }
  } catch (err) {
    console.error('Error fetching bookings:', err);
  }

  console.log('Reminder job finished.');
}

// --- Run job ---
checkReminders().then(() => process.exit(0));