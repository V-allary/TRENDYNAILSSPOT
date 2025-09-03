 // models/Booking.js
const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  name: String,
  phone: String,
  date: String,     // stored as yyyy-mm-dd
  time: String,     // stored as HH:MM
  location: String,
  nailtech: String,
  service: [String] // allow multiple services
}, {
  timestamps: true   // ✅ adds createdAt and updatedAt
});

module.exports = mongoose.model('Booking', bookingSchema);