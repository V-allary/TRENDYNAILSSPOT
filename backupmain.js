 // main.js

document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
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
                //  backend sends { message: "Booking successful" }
                alert(result.message || JSON.stringify(result));
                form.reset();
            } else {
                // backend sends { error: "Something went wrong" }
                alert(result.error || JSON.stringify(result));
            }
        } catch (error) {
            alert('Something went wrong! Please try again later.');
            console.error(error);
        }
    });
});
