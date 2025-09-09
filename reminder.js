const mongoose = require('mongoose');
const Africastalking = require('africastalking');
require('dotenv').config();

// Africa's Talking production setup
const africastalking = Africastalking({
  apiKey: process.env.AT_API_KEY,
  username: process.env.AT_USERNAME
});

const sms = africastalking.SMS;

// Import Booking model
const Booking = require('./server'); // Booking exported from server.js

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected for reminders'))
.catch(err => console.error('MongoDB connection error:', err));

// Helper function to send SMS
async function sendSMS(phone, message) {
  try {
    const response = await sms.send({ to: [phone], message });
    console.log('SMS sent:', response);
  } catch (err) {
    console.error('Error sending SMS:', err);
  }
}

// Check bookings and send reminders 2 hours ahead
async function checkReminders() {
  const now = new Date();
  const reminderTime = new Date(now.getTime() + 2 * 60 * 60 * 1000); // 2 hours ahead
  const hour = reminderTime.getHours();

  try {
    // Fetch bookings for this hour that haven't been reminded yet
    const bookings = await Booking.find({
      date: reminderTime.toISOString().split('T')[0],
      time: { $regex: `^${hour.toString().padStart(2,'0')}:` },
      reminded: { $ne: true }
    });

    if (!bookings.length) {
      console.log('No bookings to remind at this time.');
      return;
    }

    for (const booking of bookings) {
      if (!booking.phone) continue;

      // Ensure valid location
      let locationName;
      if (booking.location === 'hh_towers') locationName = 'HH Towers';
      else if (booking.location === 'afya_center') locationName = 'Around Afya Centre';
      else locationName = 'your chosen location';

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

// Run the reminder check
checkReminders();