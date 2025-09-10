 // reminder.js
import dotenv from "dotenv";
import mongoose from "mongoose";
import Africastalking from "africastalking";
import Booking from "./booking.js"; // make sure booking.js exports your schema/model

// --- Load environment variables ---
dotenv.config();

// --- MongoDB connection ---
const uri = process.env.MONGO_URI;

if (!uri) {
  console.error(" MONGO_URI is not set. Please add it in Render Environment Variables.");
  process.exit(1);
}

mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log(" MongoDB connected for reminders"))
  .catch(err => console.error("MongoDB connection error:", err));

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

  console.log(`🔍 Looking for bookings at ${targetDate} ${targetTime}`);

  try {
    const bookings = await Booking.find({
      date: reminderTime.toISOString().split('T')[0],//same date
    });

    if (bookings.length === 0) {
      console.log("ℹ No bookings found for this reminder slot.");
      return;
    }

    for (const booking of bookings) {
      if (!booking.phone) {
        console.log(`⚠ Skipping ${booking.name}: no phone number.`);
        continue;
      }

      const message = `Hi ${booking.name}, this is a reminder for your Trendy Nailsspot appointment at ${booking.time}.`;
      await sendSMS(booking.phone, message);

      booking.reminded = true;
      await booking.save();
    }
  } catch (err) {
    console.error(" Error fetching bookings:", err);
  }

  console.log("Reminder job finished.");
}

// --- Run job ---
checkReminders().then(() => process.exit(0));  