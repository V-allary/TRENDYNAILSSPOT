// main.js

document.addEventListener('DOMContentLoaded', function () {
    const form = document.getElementById('bookingForm');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const selectedServices = Array.from(document.getElementById('service').selectedOptions)
                                      .map(option => option.value);

        const bookingData = {
            name: form.name.value,
            phone: form.phone.value,
            date: form.date.value,
            time: form.time.value,
            location: form.location.value,
            nailtech: form.nailtech.value,
            service: selectedServices // Send array to backend
        };

        try {
            const response = await fetch('https://trendynailsspot.onrender.com/submit-form', {
                method: 'POST',
                body: formData
            })

            const result = await response.json();
            alert(result.message || result.error);

            if (response.ok) {
                form.reset();
            }

        } catch (err) {
            console.error('Error:', err);
            alert('Error sending booking.');
        }
    });
});