// reminder.js
require('dotenv').config();

// Force Node to use Nairobi local time for Date getters
process.env.TZ = 'Africa/Nairobi';

const mongoose = require('mongoose');
const africastalking = require('africastalking')({
  apiKey: process.env.AT_API_KEY,
  username: 'TrendyNailsspot',
});
const sms = africastalking.SMS;
const Booking = require('./models/Booking');

const mdso = process.env.MDSO;

// === CONFIG ===
// Toggle test mode: true = 1 minute window, false = 2 hours window
const TEST_MODE = true;

// === Helpers ===
const pad2 = (n) => String(n).padStart(2, '0');

// yyyy-mm-dd in Nairobi local time
function getNairobiDateString(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

// HH:MM -> minutes since midnight
function timeToMinutes(t) {
  if (!t) return null;
  const [h, m] = t.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

// Clean to E.164 +2547XXXXXXXX
function formatPhoneNumber(phone) {
  if (!phone) return null;
  let cleaned = String(phone).trim().replace(/\s+/g, '').replace(/-/g, '');
  if (cleaned.startsWith('+2547') && cleaned.length === 13) return cleaned;
  if (cleaned.startsWith('07') && cleaned.length === 10) return '+254' + cleaned.slice(1);
  if (cleaned.startsWith('2547') && cleaned.length === 12) return '+' + cleaned;
  // Reject anything that doesn't look like a Kenyan mobile
  return null;
}

// === DB ===
mongoose.connect(
  `mongodb+srv://trendy_nailsspot:${mdso}@cluster0.ae8ywlg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
).then(() => console.log('MongoDB connected for reminders'))
 .catch(err => console.error('MongoDB connection error:', err));

// === Main ===
async function sendReminders() {
  try {
    const now = new Date(); // Nairobi local because of TZ above
    const today = getNairobiDateString(now);
    const nowMinutes = now.getHours() * 60 + now.getMinutes();
    const windowMinutes = TEST_MODE ? 1 : 120;
    const cutoffMinutes = nowMinutes + windowMinutes;

    console.log(TEST_MODE ? '🧪 TEST MODE: 1-minute window' : '⏱ NORMAL MODE: 2-hour window');
    console.log(`Nairobi now: ${today} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`);
    console.log(`Window: [${nowMinutes} .. ${cutoffMinutes}] minutes since midnight`);

    // Only today's bookings (date stored as yyyy-mm-dd)
    const bookings = await Booking.find({ date: today }).lean();
    console.log(`Found ${bookings.length} booking(s) for today.`);

    for (const b of bookings) {
      const mins = timeToMinutes(b.time);
      if (mins == null) {
        console.log(`Skipping ${b.name} — invalid time: ${b.time}`);
        continue;
      }
      if (mins < nowMinutes || mins > cutoffMinutes) {
        console.log(` Skipping ${b.name} (${b.time}) — not within window`);
        continue;
      }

      const phone = formatPhoneNumber(b.phone);
      if (!phone) {
        console.log(` Skipping ${b.name} — invalid phone: ${b.phone}`);
        continue;
      }

      const message = `Hello ${b.name}, this is a friendly reminder that your appointment at TrendyNailsspot is today at ${b.time}. See you soon!`;

      try {
        const resp = await sms.send({ to: [phone], message, enqueue: true });
        console.log(` Sent to ${b.name} (${phone}) — ${b.time}`);
        console.log(resp);
      } catch (err) {
        console.error(`Failed to send to ${b.name} (${phone}) — ${b.time}`, err);
      }
    }
  } catch (e) {
    console.error('Reminder Error:', e);
  } finally {
    mongoose.disconnect();
  }
}

sendReminders();