 // ================== Imports ==================
const mongoose = require('mongoose');
const Africastalking = require('africastalking');
require('dotenv').config();

// ================== Africa's Talking Setup ==================
const africastalking = Africastalking({
  apiKey: process.env.AT_API_KEY,     // Production API key
  username: process.env.AT_USERNAME   // Production app username
});

const sms = africastalking.SMS;

// ================== Booking Model ==================
const Booking = require('./booking'); // Your existing booking model

// ================== MongoDB Connection ==================
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected for reminders'))
.catch(err => console.error('MongoDB connection error:', err));

// ================== Helper: Send SMS ==================
async function sendSMS(phone, message) {
  try {
    const response = await sms.send({
      to: [phone],
      message,
      from: undefined // Use Africa's Talking default numeric sender
    });
    console.log('SMS sent:', response);
  } catch (err) {
    console.error('Error sending SMS:', err);
  }
}

// ================== Check Reminders ==================
async function checkReminders() {
  const now = new Date();
  const reminderTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours ahead
  const hour = reminderTime.getHours();
  const minute = reminderTime.getMinutes();

  try {
    // Find bookings exactly at the target time and not yet reminded
    const bookings = await Booking.find({
      date: reminderTime.toISOString().split('T')[0], // match booking date
      time: `${hour.toString().padStart(2,'0')}:${minute.toString().padStart(2,'0')}`,
      reminded: { $ne: true } // skip already reminded bookings
    });

    if (!bookings.length) {
      console.log('No bookings to remind at this time.');
      return;
    }

    for (const booking of bookings) {
      if (!booking.phone) continue;

      // Map location to friendly name
      let locationName;
      if (booking.location === 'hh_towers') locationName = 'HH Towers';
      else if (booking.location === 'afya_center') locationName = 'Around Afya Centre';
      else locationName = 'your selected location';

      const message = `Hi ${booking.name}, this is a reminder for your Trendy Nailsspot appointment at ${booking.time} at ${locationName} with ${booking.nailtech}.`;

      await sendSMS(booking.phone, message);

      // Mark as reminded to prevent duplicate SMS
      booking.reminded = true;
      await booking.save();
    }

  } catch (err) {
    console.error('Error fetching bookings:', err);
  }
}

// ================== Run Reminder Check ==================
checkReminders();