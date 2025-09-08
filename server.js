const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const mongoose = require('mongoose');
const twilio = require('twilio');


const app = express();
const PORT = process.env.PORT || 3000;

const mdso = process.env.MDSO; // MongoDB password from .env

// ================== MongoDB Connection ==================
mongoose.connect(
  'mongodb+srv://trendy_nailsspot:' + mdso + '@cluster0.ae8ywlg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0',
  {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  }
)
.then(() => console.log(' MongoDB connected'))
.catch(err => console.error('MongoDB error:', err));

// ================== Schema ==================
const bookingSchema = new mongoose.Schema({
  name: String,
  phone: String,
  date: String,
  time: String,
  location: String,
  nailtech: String,
  service: [String], // <-- Allow multiple services
});

const Booking = mongoose.model('Booking', bookingSchema);

// ================== Middleware ==================
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname)); // Serve frontend files


//Twilio client setup
const client = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
);
app.get('/test-sms', async (req, res) => {
  try {
    const message = await client.messages.create({
      body: "Hello Vallary!  This is a test reminder from your Twilio trial account ",
      from: process.env.TWILIO_PHONE_NUMBER,
      to: "+254743747840"  // <-- your verified number
    });
    res.send("SMS sent successfully! SID: " + message.sid);
  } catch (err) {
    console.error("Error sending SMS:", err);
    res.status(500).send("Error sending SMS");
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

    // Ensure service is always an array
    if (!Array.isArray(service)) {
      service = [service];
    }

    // --- Clean & format phone number ---
    if (phone) {
      phone = phone.trim();
      if (phone.startsWith("0")) {
        phone = "+254" + phone.substring(1); // Convert 07... -> +2547...
      } else if (!phone.startsWith("+")) {
        phone = "+254" + phone; // Assume Kenya if no +
      }
    }

    const booking = { name, phone, date, time, location, nailtech, service };

    // Validate location
    if (!['hh_towers', 'afya_center'].includes(location)) {
      return res.status(400).json({ error: 'Invalid location selected.' });
    }

    // Prevent double booking for the same nailtech at the same time
    const existingBooking = await Booking.findOne({ date, time, nailtech });
    if (existingBooking) {
      return res.status(400).json({
        error: `This nailtech is already booked on ${date} at ${time}. Please choose a different time.`,
      });
    }

    // Save to MongoDB
    const newBooking = new Booking(booking);
    await newBooking.save();

    // --- Send SMS confirmation via Twilio ---
    try {
      if (phone && phone.startsWith("+")) {
        await client.messages.create({
          body: `Hi ${name}, your booking on ${date} at ${time} with Trendy Nailsspot is confirmed. See you soon!`,
          from: process.env.TWILIO_PHONE_NUMBER,  
          to: phone,
        });
        console.log("SMS sent to:", phone);
      } else {
        console.log(" Skipped SMS, invalid phone:", phone);
      }
    } catch (smsError) {
      console.error(" Twilio SMS error:", smsError);
    }

    // Save to local file (backup)
    fs.appendFile('bookings.txt', JSON.stringify(booking) + '\n', err => {
      if (err) console.error('Error saving booking to file:', err);
    });

    // Choose recipient email based on location
    let recipientEmail =
      location === 'hh_towers'
        ? 'trendynailspothhtowers@gmail.com'
        : 'josephmacharia286@gmail.com';

    // Email transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'trendynailspothhtowers@gmail.com',
        pass: process.env.PTSO, // Gmail app password
      },
    });

    // Email content
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

    // Send email
    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error('Email error:', err);
        return res.status(500).json({ error: 'Failed to send email' });
      }

      console.log(' Email sent:', info.response);
      res.status(200).json({ message: 'Booking received, email & SMS sent!' });
    });

  } catch (error) {
    console.error(' Server error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ================== Start Server ==================
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});