// reminder.js
require('dotenv').config();
const mongoose = require('mongoose');
const africastalking0 = require('africastalking')({
  apiKey: process.env.AT_API_KEY,
  username: 'TrendyNailsspot', // ✅ Fixed: Should be a string
}, { debug: true});

const sms = africastalking0.SMS;
const Booking = require('./models/Booking');

const mdso = process.env.MDSO ;
// MongoDb connection
mongoose.connect('mongodb+srv://trendy_nailsspot:' + mdso + '@cluster0.ae8ywlg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
  .then(() => console.log('MongoDB connected for reminders'))
  .catch(err => console.error('MongoDB connection error:', err));

  const formatPhoneNumber = (phone) => {
    if (phone.startsWith('0')) {
      return '+254' + phone.slice(1);
    }
    return phone;
  };
  

async function sendReminders() {
  try {
    const now = new Date();
    const twoHoursLater = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const currentDate = twoHoursLater.toISOString().split('T')[0];
    const currentTime = twoHoursLater.toTimeString().slice(0, 5);

    const bookings = await Booking.find({ date: currentDate });

    if (!bookings.length) {
      console.log('No reminders to send right now.');
      return;
    }

    for (const booking of bookings) {
      const message0 = ` Hello ${booking.name}, this is a friendly reminder that your appointment at TrendyNailsspot is today at ${booking.time}. See you soon!`;
      const address0 = `${booking.phone}`
      const options = {
        //from:'TrendyNailsspot' ,
        enqueue: true ,
        to: [address0],
        message: message0
      }
      try {
        await sms.send(options)
        .then( response => {
            console.log(response);
        })
        .catch( error => {
            console.log(error);
        });
      } catch(e) {
        console.log(e)
      }


      console.log(`Reminder attempted to be sent to ${booking.name} at ${booking.phone}`);
    }

  } catch (error) {
    console.error('Reminder Error:', error);
  } finally {
    mongoose.disconnect();
  }
}

sendReminders();