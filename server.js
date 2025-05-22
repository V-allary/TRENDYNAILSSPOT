const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Dummy storage for bookings
let bookings = [];

// POST endpoint to handle form submission
app.post('/submit-form', (req, res) => {
    const newBooking = req.body;

    // Prevent double booking for the same tech, date, and time
    const conflict = bookings.find(b =>
        b.tech === newBooking.tech &&
        b.date === newBooking.date &&
        b.time === newBooking.time
    );

    if (conflict) {
        return res.status(409).json({ message: 'This slot is already booked with that nail tech.' });
    }

    bookings.push(newBooking);
    res.status(200).json({ message: 'Booking successful!' });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});