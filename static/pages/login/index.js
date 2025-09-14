document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('form').addEventListener('submit', async ev => {
        ev.preventDefault();

        const username = ev.target.username.value;
        const password = ev.target.password.value;

        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, password })
        });

        const body = await res.json();

        if (res.ok) {
            if (body.success) {
                window.location.pathname = '/banking';
            } else {
                const err = document.querySelector('.error');
                err.innerHTML = body.message;
                err.style.opacity = '1';
            };
        } else {
            window.alert('error');
        };
    });
});
