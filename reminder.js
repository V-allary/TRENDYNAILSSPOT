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
const Booking = require('./booking');    

// --- Connect to MongoDB ---
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() => console.log('MongoDB connected successfully for reminders'))
  .catch(err => console.log('MongoDB connection error:', err));

// --- Helper function: send SMS ---
async function sendSMS(phone, message) {
  try {
    const response = await sms.send({
      to: [phone],
      message: message,
    });
    console.log(`SMS sent to ${phone}:`, response);
  } catch (err) {
    console.error(`Error sending SMS to ${phone}:`, err);
  }
}

// --- Get current time and check bookings ---
async function checkReminders() {
  const now = new Date();
  
  // Target: bookings exactly 2 hours from now
  const reminderTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  const hour = reminderTime.getHours();
  const minute = reminderTime.getMinutes();

  console.log(`Checking reminders for ${reminderTime.toISOString().split('T')[0]} at ${hour}:${minute}`);

  try {
    const bookings = await Booking.find({
      date: reminderTime.toISOString().split('T')[0], // same date
      
    });

    if (bookings.length === 0) {
      console.log('ℹNo bookings found for this reminder slot.');
      return;
    }

    for (const booking of bookings) {
      if (!booking.phone) {
        console.log(`Skipping booking for ${booking.name}: no phone number.`);
        continue;
      }
      const message = `Hi ${booking.name}, this is a reminder for your Trendy Nailsspot appointment at ${booking.time}.`;
      await sendSMS(booking.phone, message);
    }
  } catch (err) {
    console.error('Error fetching bookings:', err);
  }
}

// --- Run reminder check ---
checkReminders().then(() => {
  console.log('Reminder job finished.');
  mongoose.connection.close(); 
});