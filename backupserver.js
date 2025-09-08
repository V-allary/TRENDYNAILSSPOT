const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;
const mdso = process.env.MDSO;

// MongoDB connection
mongoose.connect(`mongodb+srv://trendy_nailsspot:${mdso}@cluster0.ae8ywlg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log(' MongoDB connected'))
.catch(err => console.error('MongoDB error:', err));

const bookingSchema = new mongoose.Schema({
  name: String,
  phone: String,
  date: String,
  time: String,
  location: String,
  nailtech: String,
  service: String,
});

const Booking = mongoose.model('Booking', bookingSchema);

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static('public')); // Serve files from 'public' folder

// Homepage
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// Booking route
app.post('/submit-form', async (req, res) => {
  try {
    const { name, phone, date, time, location, nailtech, service } = req.body;

    // Validate location
    if (!['hh_towers', 'afya_center'].includes(location)) {
      return res.status(400).json({ error: 'Invalid location selected.' });
    }

    // Prevent double booking
    const existingBooking = await Booking.findOne({ date, time, nailtech });
    if (existingBooking) {
      return res.status(400).json({
        error: `This nailtech is already booked on ${date} at ${time}. Please choose a different time.`,
      });
    }

    // Save to MongoDB
    const newBooking = new Booking({ name, phone, date, time, location, nailtech, service });
    await newBooking.save();

    // Save to local file
    const bookingLine = JSON.stringify(newBooking) + '\n';
    fs.appendFile('bookings.txt', bookingLine, err => {
      if (err) console.error('Error saving booking locally:', err);
    });

    // Choose recipient email based on location
    let recipientEmail = location === 'hh_towers'
      ? 'vallarymitchelle4@gmail.com'
      : 'vallarymitchelle257@gmail.com';

    // Email transport
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'josephmacharia286@gmail.com',
        pass: process.env.PTSO
      }
    });

    // Email options
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
Service: ${service}
Location: ${location || 'Not selected'}
      `
    };

    // Send email
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('Email error:', err);
        return res.status(500).json({ error: 'Failed to send email.' });
      }
      console.log(' Email sent:', info.response);
      res.status(200).json({ message: 'Booking received and email sent!' });
    });

  } catch (err) {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.listen(PORT, () => {
  console.log(` Server running on port ${PORT}`);
});



 