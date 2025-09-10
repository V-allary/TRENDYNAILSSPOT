  // reminder.js
const mongoose = require('mongoose');
const Africastalking = require('africastalking');
require('dotenv').config();

// ================== Africa's Talking Setup ==================
const africastalking = Africastalking({
  apiKey: process.env.AT_API_KEY,     // Production API key
  username: process.env.AT_USERNAME,  // Production username
});

const sms = africastalking.SMS;

// ================== MongoDB Booking Model ==================
const Booking = require('./booking'); // uses booking.js (your schema/model)

// ================== MongoDB Connection ==================
mongoose.connect(process.env.MONGO_URL)
  .then(() => console.log('MongoDB connected for reminders'))
  .catch(err => console.error(' MongoDB connection error:', err));

// ================== Helper: Send SMS ==================
async function sendSMS(phone, message) {
  try {
    const response = await sms.send({
      to: [phone],
      message: message,
      // Leave out "from" → default sender used until TRENDYNAILS is approved
    });
    console.log(`SMS sent to ${phone}:`, response);
  } catch (err) {
    console.error('Error sending SMS:', err);
  }
}

// ================== Reminder Check ==================
async function checkReminders() {
  const now = new Date();
  console.log(`Checking reminders at ${now.toISOString().slice(0, 16).replace('T', ' ')}`);

  // Target reminder time = 2 hours ahead
  const reminderTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const targetDate = reminderTime.toISOString().split('T')[0]; // yyyy-mm-dd
  const targetTime = reminderTime.toTimeString().slice(0, 5);  // HH:mm

  try {
    const bookings = await Booking.find({
      date: targetDate,
      time: targetTime,
      reminded: false,
    });

    if (bookings.length === 0) {
      console.log('ℹ No bookings found for this reminder slot.');
      return;
    }

    for (const booking of bookings) {
      if (!booking.phone) {
        console.log(`Skipping booking for ${booking.name}: no phone number`);
        continue;
      }

      const message = `Hi ${booking.name}, this is a reminder for your Trendy Nailsspot appointment today at ${booking.time}. 💅`;
      await sendSMS(booking.phone, message);

      booking.reminded = true;
      await booking.save();
      console.log(`Reminder marked as sent for ${booking.name} (${booking.phone})`);
    }
  } catch (err) {
    console.error('Error fetching bookings:', err);
  }

  console.log(' Reminder job finished.');
}

// ================== Run Job ==================
checkReminders().then(() => process.exit(0));