// main.js

document.addEventListener('DOMContentLoaded', () => {
    const form = document.querySelector('form');
    console.log("init zero")

    form.addEventListener('submit', async (e) => {
        console.log("init submit")
        e.preventDefault();

        const formData = new FormData(form);
        const data = {};

        formData.forEach((value, key) => {
            data[key] = value;
        });

        console.log(data)

        try {
            const response = await fetch('/submit-form', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();
            console.log(result)
            if (response.ok) {
                alert(result.message);
                form.reset();
            } else {
                alert(result.error);
            }
        } catch (error) {
            alert('Something went wrong! Please try again later.');
            console.error(error);
        }
    });
});