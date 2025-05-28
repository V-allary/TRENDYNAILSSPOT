const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(__dirname)); // Serve frontend files

// Homepage route
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

// Booking endpoint
app.post('/submit-form', (req, res) => {
  const { name, phone, date, time, location, nailtech } = req.body;

  const booking = { name, phone, date, time, location, nailtech };

  // 1. Save to local file
  const bookingLine = JSON.stringify(booking) + '\n';
  fs.appendFile('bookings.txt', bookingLine, err => {
    if (err) {
      console.error('Error saving booking:', err);
      return res.status(500).send('Error saving booking');
    }
  });

  // 2. Choose email based on location
  let recipientEmail = '';
  if (location === 'hh_towers') {
    recipientEmail = 'mitchellevallary63@gmail.com';
  } else if (location === 'afya_centre') {
    recipientEmail = 'vallarymitchelle4@gmail.com';
  } else {
    return res.status(400).send('Invalid location selected.');
  }

  // 3. Send email notification
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'vallarymitchelle257@gmail.com',
      pass: 'efkgdnbubesrebox' // App password
    }
  });

  const mailOptions = {
    from: 'vallarymitchelle1@gmail.com',
    to: recipientEmail,
    subject: 'New Booking – Trendy_Nailsspot',
    text: `
New booking received:
Name: ${name}
Phone: ${phone}
Date: ${date}
Time: ${time}
Tech: ${nailtech || 'Not selected'}
Location: ${location || 'Not selected'}
    `
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error('Email error:', err);
      return res.status(500).send('Booking saved, but email failed.');
    }

    console.log('Email sent:', info.response);
    res.status(200).send('Booking received and email sent!');
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});