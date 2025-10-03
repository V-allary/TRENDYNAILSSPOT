  // reminder.js (CommonJS)

const dotenv = require("dotenv");
const mongoose = require("mongoose");
const Africastalking = require("africastalking");
const Booking = require("./booking.js"); // keep the same filename

// --- Load environment variables ---
dotenv.config();

// --- MongoDB connection ---
const uri = process.env.MONGO_URI;

if (!uri) {
  console.error(" MONGO_URI is not set. Please add it in Render Environment Variables.");
  process.exit(1);
}

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log("MongoDB connected for reminders"))
  .catch(err => {
    console.error("MongoDB connection error:", err);
    // optional: exit so cron reports failure
    process.exit(1);
  });

// --- Africa's Talking configuration ---
const africastalking = Africastalking({
  apiKey: process.env.AT_API_KEY,     // Production API key
  username: process.env.AT_USERNAME, // Your AT app username
});

const sms = africastalking.SMS;

// --- Helper function: send SMS ---
async function sendSMS(phone, message) {
  try {
    const response = await sms.send({
      to: [phone],
      message: message,
      // no "from" until Sender ID TRENDYNAILS is approved
    });
    console.log("SMS sent:", response);
  } catch (err) {
    console.error("Error sending SMS:", err);
  }
}

// --- Reminder check ---
async function checkReminders() {
  const now = new Date();
  console.log(`Checking reminders at ${now.toISOString().slice(0, 16).replace("T", " ")}`);

  // 2 hours ahead
  const reminderTime = new Date(now.getTime() + 2 * 60 * 60 * 1000);
  const targetDate = reminderTime.toISOString().split("T")[0]; // yyyy-mm-dd
  const targetTime = reminderTime.toTimeString().slice(0, 5);  // HH:mm

  console.log(`Looking for bookings at ${targetDate} ${targetTime}`);

  try {
    const bookings = await Booking.find({
      date: targetDate,
    });

    if (!bookings || bookings.length === 0) {
      console.log("ℹ No bookings found for this reminder slot.");
      return;
    }

    for (const booking of bookings) {
      if (!booking.phone) {
        console.log(`⚠ Skipping ${booking.name || booking._id}: no phone number.`);
        continue;
      }

      const message = `Hi ${booking.name}, this is a reminder for your Trendy Nailsspot appointment at ${booking.time}.`;
      await sendSMS(booking.phone, message).catch(err => {
        console.error("sendSMS failed for", booking.phone, err);
      });

      booking.reminded = true;
      await booking.save().catch(err => {
        console.error("failed to save reminded flag for booking", booking._id, err);
      });
    }
  } catch (err) {
    console.error("Error fetching bookings:", err);
  }

  console.log(" Reminder job finished.");
}

// --- Run job ---
checkReminders()
  .then(() => process.exit(0))
  .catch(err => {
    console.error("Reminder job fatal error:", err);
    process.exit(1);
  });