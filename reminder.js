// reminder.js
require('dotenv').config();
process.env.TZ = 'Africa/Nairobi';

const mongoose = require('mongoose');
const africastalking = require('africastalking')({
  apiKey: process.env.AT_API_KEY,
  username: process.env.AT_USERNAME || 'TrendyNailsspot',
});
const sms = africastalking.SMS;
const Booking = require('./models/Booking');

const MONGO_PWD = process.env.MDSO;

// ---------- CONFIG ----------
const TEST_MODE = true;                // true: easier manual testing
const WINDOW_MINUTES = TEST_MODE ? 5 : 120; // 5 min for tests, 2h in prod

// ---------- Utils ----------
const pad2 = n => String(n).padStart(2, '0');
const todayStr = (d = new Date()) => `${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;
const timeToMinutes = t => {
  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(String(t))) return null;
  const [h,m] = t.split(':').map(Number);
  return h*60+m;
};

function formatPhoneE164KEN(phone) {
  if (!phone) return null;
  let s = String(phone).trim().replace(/[()\s-]+/g, '');
  if (/^\+2547\d{8}$/.test(s)) return s;
  if (/^07\d{8}$/.test(s))     return '+254' + s.slice(1);
  if (/^7\d{8}$/.test(s))      return '+254' + s;
  if (/^2547\d{8}$/.test(s))   return '+' + s;
  return null;
}

// ---------- DB ----------
mongoose.connect(
  `mongodb+srv://trendy_nailsspot:${MONGO_PWD}@cluster0.ae8ywlg.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`
).then(() => console.log('MongoDB connected for reminders'))
 .catch(err => { console.error('MongoDB connection error:', err); process.exit(1); });

// ---------- Main ----------
async function run() {
  try {
    const now = new Date();
    const today = todayStr(now);
    const nowMin = now.getHours()*60 + now.getMinutes();
    const endMin = nowMin + WINDOW_MINUTES;

    console.log(TEST_MODE ? ' TEST MODE' : '⏱ PROD MODE');
    console.log(` Nairobi now: ${today} ${pad2(now.getHours())}:${pad2(now.getMinutes())}`);
    console.log(`Window (mins since midnight): [${nowMin} .. ${endMin}]`);

    // match both '-' and '/' just in case legacy data exists
    const todayAlt = today.replace(/-/g, '/');
    const todays = await Booking.find({ date: { $in: [today, todayAlt] } }).lean();
    console.log(`Found ${todays.length} booking(s) for today.`);

    if (!todays.length) {
      console.log(' No bookings for today.');
      return;
    }

    let candidates;
    if (TEST_MODE) {
      // Pick the most recent booking
      const latest = [...todays].sort((a, b) => {
        if (a.createdAt && b.createdAt) {
          return new Date(b.createdAt) - new Date(a.createdAt);
        }
        // fallback: compare by time field if no createdAt
        return (timeToMinutes(b.time) || 0) - (timeToMinutes(a.time) || 0);
      })[0];

      candidates = latest ? [latest] : [];
      console.log('TEST: forcing latest booking only:', {
        name: latest?.name,
        time: latest?.time,
        phone: latest?.phone,
        createdAt: latest?.createdAt,
      });
    } else {
      candidates = todays.filter(b => {
        const mins = timeToMinutes(b.time);
        return mins !== null && mins >= nowMin && mins <= endMin;
      });
    }

    if (!candidates.length) {
      console.log('No bookings within the reminder window.');
      return;
    }

    for (const b of candidates) {
      const phone = formatPhoneE164KEN(b.phone);
      if (!phone) {
        console.log(` Skip ${b.name}: invalid phone "${b.phone}"`);
        continue;
      }

      const message =
        `Hello ${b.name}, this is a reminder that your appointment at TrendyNailsspot is today at ${b.time}. See you soon!`;

      console.log(`➡ Sending to ${b.name} ${phone} @ ${b.time}`);
      try {
        const resp = await sms.send({ to: [phone], message, enqueue: true });
        console.log(' Africa’sTalking response:', resp);
      } catch (err) {
        console.error('SMS send error:', err);
      }
    }
  } catch (e) {
    console.error('Reminder Error:', e);
  } finally {
    mongoose.disconnect();
  }
}

run();