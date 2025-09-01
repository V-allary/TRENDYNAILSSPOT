 // main.js

document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    const phoneInput = document.querySelector("#phone");

    // ✅ Initialize intl-tel-input in professional mode (Option 1)
    const iti = window.intlTelInput(phoneInput, {
        initialCountry: "ke",   // Default Kenya
        separateDialCode: false, // No inline dial code
        nationalMode: false,    // Always full format (+254...)
        utilsScript: "https://cdnjs.cloudflare.com/ajax/libs/intl-tel-input/17.0.19/js/utils.js"
    });

    console.log("init zero");

    form.addEventListener('submit', async (e) => {
        console.log("init submit");
        e.preventDefault();

        const formData = new FormData(form);
        const data = {};

        formData.forEach((value, key) => {
            if (key.endsWith('[]')) { // Handle multiple select array
                const arrayKey = key.slice(0, -2);
                if (!data[arrayKey]) {
                    data[arrayKey] = [];
                }
                data[arrayKey].push(value);
            } else {
                data[key] = value;
            }
        });

        // formatted international number
        data.phone = iti.getNumber();

        console.log(data);

        try {
            const response = await fetch('/submit-form', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            console.log(result);

            if (response.ok) {
                alert(result.message || JSON.stringify(result));
                form.reset();
                iti.setCountry("ke"); // reset back to Kenya
            } else {
                alert(result.error || JSON.stringify(result));
            }
        } catch (error) {
            alert('Something went wrong! Please try again later.');
            console.error(error);
        }
    });
});