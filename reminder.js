// reminder.js
require('dotenv').config();
const mongoose = require('mongoose');
const africastalking = require('africastalking')({
  apiKey: process.env.AT_API_KEY,
  username: 'TrendyNailsspot', // ✅ Fixed: Should be a string
});

const sms = africastalking.SMS;
const Booking = require('./models/Booking');


// MongoDb connection
mongoose.connect('mongodb+srv://trendy_nailsspot:' + mdso + '@cluster0.ae8ywlg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected for reminders'))
  .catch(err => console.error('MongoDB connection error:', err));

async function sendReminders() {
  try {
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const currentDate = twoHoursLater.toISOString().split('T')[0];
    const currentTime = twoHoursLater.toTimeString().slice(0, 5);

    const bookings = await Booking.find({ date: currentDate, time: currentTime });

    if (!bookings.length) {
      console.log('No reminders to send right now.');
      return;
    }

    for (const booking of bookings) {
      const message = `💅🏽 Hello ${booking.name}, this is a friendly reminder that your appointment at TrendyNailsspot is today at ${booking.time}. See you soon!`;

      await sms.send({
        to: [booking.phone],
        message
      });

      console.log(`Reminder sent to ${booking.name} at ${booking.phone}`);
    }

  } catch (error) {
    console.error('Reminder Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

sendReminders();