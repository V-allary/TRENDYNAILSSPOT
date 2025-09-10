 // ================== Imports ==================
const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config();

// ================== App Setup ==================
const app = express();
const PORT = process.env.PORT || 3000;
const mdso = process.env.MDSO; // MongoDB password from Render env

// ================== MongoDB Connection ==================
mongoose.connect(
  `mongodb+srv://trendy_nailsspot:${mdso}@cluster0.ae8ywlg.mongodb.net/trendynailsspot?retryWrites=true&w=majority&appName=Cluster0`
)
  .then(() => console.log('MongoDB connected'))
  .catch(err => console.error('MongoDB error:', err));

// ================== Schema ==================
const bookingSchema = new mongoose.Schema({
  name: String,
  phone: String,
  date: String,
  time: String,
  location: String,
  nailtech: String,
  service: [String],
  reminded: { type: Boolean, default: false }, // track if reminder SMS sent
  createdAt: { type: Date, default: Date.now },
});

const Booking = mongoose.model('Booking', bookingSchema);

// ================== Middleware ==================
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname));

// ================== Africa’s Talking Setup ==================
let sms = null;
try {
  const africastalking = require('africastalking')({
    apiKey: process.env.AT_API_KEY, // Production API key
    username: process.env.AT_USERNAME, // Production username
  });
  sms = africastalking.SMS;
  console.log('Africa’s Talking initialized');
} catch (err) {
  console.warn('Africa’s Talking not initialized. SMS disabled.', err);
}

// ================== Helpers ==================

// Round to nearest 30 minutes
function roundToNearest30(timeStr) {
  const [hour, minute] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hour, minute, 0, 0);

  const ms = 1000 * 60 * 30; // 30 min
  const rounded = new Date(Math.round(date.getTime() / ms) * ms);

  const hh = String(rounded.getHours()).padStart(2, '0');
  const mm = String(rounded.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
}

// ================== Routes ==================

// Homepage
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Booking submission
app.post('/submit-form', async (req, res) => {
  try {
    let { name, phone, date, time, location, nailtech, service } = req.body;

    if (!Array.isArray(service)) service = [service];

    // --- Format phone ---
    if (phone) {
      phone = phone.trim();
      if (phone.startsWith('0')) phone = '+254' + phone.substring(1);
      else if (!phone.startsWith('+')) phone = '+254' + phone;
    }

    // --- Round time to nearest 30 mins ---
    if (time) {
      time = roundToNearest30(time);
    }

    // --- Validate location ---
    if (!['hh_towers', 'afya_center'].includes(location)) {
      return res.status(400).json({ error: 'Invalid location selected.' });
    }

    // --- Prevent double booking ---
    const existingBooking = await Booking.findOne({ date, time, nailtech });
    if (existingBooking) {
      return res.status(400).json({
        error: `This nailtech is already booked on ${date} at ${time}. Please choose another time.`,
      });
    }

    // --- Save booking ---
    const newBooking = new Booking({ name, phone, date, time, location, nailtech, service });
    await newBooking.save();

    // --- Send SMS confirmation ---
    if (sms && phone && phone.startsWith('+')) {
      try {
        const result = await sms.send({
          to: [phone],
          message: `Hi ${name}, your booking on ${date} at ${time} with Trendy Nailsspot is confirmed. See you soon! 💅`,
          // no "from" until Sender ID approved
        });
        console.log('Confirmation SMS sent:', result);
      } catch (smsError) {
        console.error('Error sending confirmation SMS:', smsError);
      }
    }

    // --- Save backup locally ---
    fs.appendFile(
      'bookings.txt',
      JSON.stringify({ name, phone, date, time, location, nailtech, service }) + '\n',
      err => {
        if (err) console.error('Error saving booking to file:', err);
      }
    );

    // --- Email notification ---
    let recipientEmail;
    if (location === 'hh_towers') {
      recipientEmail = 'trendynailspothhtowers@gmail.com';
    } else if (location === 'afya_center') {
      recipientEmail = 'vallarymitchelle4@gmail.com';
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'trendynailspothhtowers@gmail.com',
        pass: process.env.PTSO,
      },
    });

    const mailOptions = {
      from: 'trendynailspothhtowers@gmail.com',
      to: recipientEmail,
      subject: 'New Booking – Trendy_Nailsspot',
      text: `
New booking received:

Name: ${name}
Phone: ${phone}
Date: ${date}
Time: ${time}
Tech: ${nailtech || 'Not selected'}
Services: ${service.join(', ')}
Location: ${location || 'Not selected'}
      `,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('Email error:', err);
        return res.status(500).json({ error: 'Failed to send email' });
      }
      console.log('Email sent:', info.response);
      res.status(200).json({ message: 'Booking received, email & SMS sent!' });
    });

  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ================== Start Server ==================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

// ================== Export Booking Model ==================
module.exports = Booking;