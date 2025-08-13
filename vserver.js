const express = require('express');
const nodemailer = require('nodemailer');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const {error} = require ('console');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname)); 
 // Homepage route
 app.get('/', (req,res) =>{
  res.sendFile(__dirname + '/index.html');
 });

// Booking Route
app.post('/submit-form', async (req, res) => {
  const { name, email, message } = req.body;

  const booking = {name ,email ,message};


//validate Information
  if (!name || !email || !message) {
    return res.status(400).send({ message: 'All fields are required' });
  }

  // Email setup
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: 'vallarymitchelle1@gmail.com', // 
      pass: process.env.PTSO   // App Password  
    },
  });

  const mailOptions = {
    from: 'vallarymitchelle1@gmail.com', //email 
    to:  recipientEmail,
    subject: `New Message from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\n\nMessage:\n${message}`,
  };

  transporter.sendMail(mailOptions,(err,info) => {
    if (err) {
      console.error('Email error:', err);
      return res.status(500).json({error: err});
    } 

    console.log('Email sent:', info.response);
    res.status(200).json({ message:'Message sent successfully and email sent!'});
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

