document.addEventListener('DOMContentLoaded', () => {
    document.querySelector('form').addEventListener('submit', async ev => {
        ev.preventDefault();

        const username = ev.target.username.value;
        const password = ev.target.password.value;

        if (password !== ev.target.password1.value) {
            const err = document.querySelector('.error');
            err.innerHTML = 'Пароли не совпадают.';
            return err.style.opacity = '1';
        };

        const res = await fetch('/api/register', {
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
