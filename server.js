const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const mongoose = require('mongoose');
const { error } = require('console');

const app = express();
const PORT = process.env.PORT || 3000;

// MongoDb connection
mongoose.connect('mongodb+srv://trendy_nailsspot:LrLDBootFIXy0zGq@cluster0.ae8ywlg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0', {
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
  const { name, phone, date, time, location, nailtech } = req.body;

  const booking = { name, phone, date, time, location, nailtech };

//validate location
if (!['hh_towers', 'afya_center'].includes(location)) {
  return res.status(400).json({ error: 'Invalid location selected.' });
}
//prevent double booking
const existingBooking =await Booking.findOne({date,time,nailtech});
if (existingBooking) {
  return res.status(400).json({
    error: `This nailtech is already booked on ${date} at ${time}. Please choose a different time.`,
  });
}

 //save to MongoDB
const newBooking = new Booking({name,phone,date,time,location,nailtech});
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
    recipientEmail = 'mitchellevallary63@gmail.com';
  } else if (location === 'afya_center') {
    recipientEmail = 'vallarymitchelle4@gmail.com';
  } else {
    return res.status(400).json({error:'Invalid location selected.'});
  }

  // 3. Send email notification
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'vallarymitchelle257@gmail.com',
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