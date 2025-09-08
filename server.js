 // ================== Imports ==================
const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const mongoose = require('mongoose');

// ================== App Setup ==================
const app = express();
const PORT = process.env.PORT || 3000;
const mdso = process.env.MDSO; // MongoDB password from Render env

// ================== MongoDB Connection ==================
mongoose.connect(
  `mongodb+srv://trendy_nailsspot:${mdso}@cluster0.ae8ywlg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
)
  .then(() => console.log('MongoDB connected'))
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
let sms = null;
try {
  const africastalking = require('africastalking')({
    apiKey: process.env.AT_SANDBOX_API_KEY, // Set in Render env
    username: 'sandbox',
  });
  sms = africastalking.SMS;
  console.log('Africa’s Talking initialized');
} catch (err) {
  console.warn(' Africa’s Talking not initialized (missing or invalid API key). SMS disabled.');
}

// ================== Test Route ==================
app.get('/test-sms', async (req, res) => {
  try {
    if (!sms) {
      return res.status(503).json({ error: 'Africa’s Talking not configured. Add AT_SANDBOX_API_KEY in env.' });
    }

    const result = await sms.send({
      to: ['+254743747840'], // test number
      message: 'Hello Vallary! This is a test SMS from Africa’s Talking Sandbox.',
      from: 'sandbox',
    });

    console.log('SMS sent:', result);
    res.json(result);
  } catch (err) {
    console.error('SMS error:', err);
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

    // --- Format phone number ---
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

    // Save booking
    const newBooking = new Booking(booking);
    await newBooking.save();

    // --- Send SMS confirmation ---
    try {
      if (sms && phone && phone.startsWith('+')) {
        const result = await sms.send({
          to: [phone],
          message: `Hi ${name}, your booking on ${date} at ${time} with Trendy Nailsspot is confirmed. See you soon! 💅`,
          from: 'sandbox',
        });
        console.log('AT SMS sent:', result);
      } else {
        console.log(' Skipped SMS (client missing or invalid phone):', phone);
      }
    } catch (smsError) {
      console.error("Africa's Talking SMS error:", smsError);
    }

    // Save backup locally
    fs.appendFile('bookings.txt', JSON.stringify(booking) + '\n', err => {
      if (err) console.error(' Error saving booking to file:', err);
    });

    // --- Email notification ---
    const recipientEmail =
      location === 'hh_towers'
        ? 'trendynailspothhtowers@gmail.com'
        : 'josephmacharia286@gmail.com';

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'trendynailspothhtowers@gmail.com',
        pass: process.env.PTSO, // Gmail App password from Render env
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

      console.log('Email sent:', info.response);
      res.status(200).json({ message: 'Booking received, email & SMS sent!' });
    });

  } catch (error) {
    console.error(' Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ================== Start Server ==================
app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
});