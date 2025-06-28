const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  name: String,
  phone: String,
  date: String,
  time: String,
  location: String,
  nailtech: String,
  service: String,
});

module.exports = mongoose.model('Booking', bookingSchema);