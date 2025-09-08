const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const mongoose = require('mongoose');
const africastalking = require('africastalking');

const app = express();
const PORT = process.env.PORT || 3000;

const mdso = process.env.MDSO; // MongoDB password from .env

// ================== MongoDB Connection ==================
mongoose.connect(
  'mongodb+srv://trendy_nailsspot:' + mdso + '@cluster0.ae8ywlg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
  { useNewUrlParser: true, useUnifiedTopology: true }
)
.then(() => console.log(' MongoDB connected'))
.catch(err => console.error(' MongoDB error:', err));

// ================== Schema ==================
const bookingSchema = new mongoose.Schema({
  name: String,
  phone: String,
  date: String,
  time: String,
  location: String,
  nailtech: String,
  service: [String],
});

const Booking = mongoose.model('Booking', bookingSchema);

// ================== Middleware ==================
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname));

// ================== Africa’s Talking Setup ==================
const at = africastalking({
  apiKey: process.env.AT_API_KEY,  // from your Sandbox account
  username: 'sandbox'              // must be "sandbox" for testing
});
const sms = at.SMS;

// ================== Test Route ==================
app.get('/test-sms', async (req, res) => {
  try {
    const result = await sms.send({
      to: ['+254793026339'],  // your phone in E.164 format
      message: 'Hello Vallary ! This is a test SMS from Africa’s Talking Sandbox.',
      from: 'sandbox'         // fixed for sandbox testing
    });
    console.log('SMS sent:', result);
    res.json(result);
  } catch (err) {
    console.error(' SMS error:', err);
    res.status(500).json({ error: 'Failed to send SMS' });
  }
});

// ================== Routes ==================

// Homepage
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Booking route
app.post('/submit-form', async (req, res) => {
  try {
    let { name, phone, date, time, location, nailtech, service } = req.body;

    if (!Array.isArray(service)) service = [service];

    // --- Clean & format phone number ---
    if (phone) {
      phone = phone.trim();
      if (phone.startsWith('0')) {
        phone = '+254' + phone.substring(1);
      } else if (!phone.startsWith('+')) {
        phone = '+254' + phone;
      }
    }

    const booking = { name, phone, date, time, location, nailtech, service };

    // Validate location
    if (!['hh_towers', 'afya_center'].includes(location)) {
      return res.status(400).json({ error: 'Invalid location selected.' });
    }

    // Prevent double booking
    const existingBooking = await Booking.findOne({ date, time, nailtech });
    if (existingBooking) {
      return res.status(400).json({
        error: `This nailtech is already booked on ${date} at ${time}. Please choose another time.`,
      });
    }

    // Save to MongoDB
    const newBooking = new Booking(booking);
    await newBooking.save();

    // --- Send SMS confirmation via Africa’s Talking ---
    try {
      if (phone && phone.startsWith('+')) {
        await sms.send({
          to: [phone],
          message: `Hi ${name}, your booking on ${date} at ${time} with Trendy Nailsspot is confirmed. See you soon!`,
          from: 'sandbox'
        });
        console.log('SMS sent to:', phone);
      } else {
        console.log('Skipped SMS, invalid phone:', phone);
      }
    } catch (smsError) {
      console.error(' AT SMS error:', smsError);
    }

    // Save to local file (backup)
    fs.appendFile('bookings.txt', JSON.stringify(booking) + '\n', err => {
      if (err) console.error('Error saving booking to file:', err);
    });

    // Email setup
    let recipientEmail =
      location === 'hh_towers'
        ? 'trendynailspothhtowers@gmail.com'
        : 'josephmacharia286@gmail.com';

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
        console.error(' Email error:', err);
        return res.status(500).json({ error: 'Failed to send email' });
      }

      console.log('📧 Email sent:', info.response);
      res.status(200).json({ message: 'Booking received, email & SMS sent!' });
    });

  } catch (error) {
    console.error(' Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ================== Start Server ==================
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});