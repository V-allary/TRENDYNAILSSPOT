const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const mongoose = require('mongoose');
const { error } = require('console');

const app = express();
const PORT = process.env.PORT || 3000;

const mdso = process.env.MDSO ;

// MongoDb connection
mongoose.connect('mongodb+srv://trendy_nailsspot:' + mdso + '@cluster0.ae8ywlg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB error:', err));

const bookingSchema = new mongoose.Schema({
  name: String,
  phone: String,
  date: String,
  time: String,
  location:String,
  nailtech: String,
  service: String,
});

const Booking = mongoose.model('Booking', bookingSchema);
  

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname)); // Serve frontend files

// Homepage route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Booking route
app.post('/submit-form', async (req, res) => {
  const { name, phone, date, time, location, nailtech, service } = req.body;

  const booking = { name, phone, date, time, location, nailtech ,service};

//validate location
if (!['hh_towers', 'afya_center'].includes(location)) {
  return res.status(400).json({ error: 'Invalid location selected.' });
}
// Prevent double booking
const existingBooking = await Booking.findOne({ date, time, nailtech });
if (existingBooking != undefined) {
  return res.status(400).json({
    error: `This nailtech is already booked on ${date} at ${time}. Please choose a different time.`,
  });
}


 //save to MongoDB
const newBooking = new Booking({name,phone,date,time,location,nailtech,service});
await newBooking.save();

  // 1. Save to local file
  const bookingLine = JSON.stringify(booking) + '\n';
  fs.appendFile('bookings.txt', bookingLine, err => {
    if (err) {
      console.error('Error saving booking:', err);
      return res.status(500).json({error:'Error saving booking'});
    }
  });

  // 2. Choose email based on location
  let recipientEmail = '';
  if (location === 'hh_towers') {
    recipientEmail = 'trendynailspothhtowers@gmail.com';
  } else if (location === 'afya_center') {
    recipientEmail = 'josephmacharia286@gmail.com';
  } else {
    return res.status(400).json({error:'Invalid location selected.'});
  }

  // 3. Send email notification
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'josephmacharia286@gmail.com',
      pass: process.env.PTSO // App password
    }
  });

  const mailOptions = {
    from: 'vallarymitchelle257@gmail.com',
    to: recipientEmail,
    subject: 'New Booking – Trendy_Nailsspot',
    text: `
New booking received:
Name: ${name}
Phone: ${phone}
Date: ${date}
Time: ${time}
Tech: ${nailtech || 'Not selected'}
service:${service}
Location: ${location || 'Not selected'}
    `
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error('Email error:', err);
      return res.status(500).json({error: err});
    }

    console.log('Email sent:', info.response);
    res.status(200).json({message:'Booking received and email sent!'});
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
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