document.addEventListener('DOMContentLoaded', async () => {
    const res = await fetch('/api/data', { method: 'POST' });

    let body = await res.json();

    if (res.ok) {
        if (body.success) {
            const { username, id, balance } = body;

            document.querySelector('.username').innerHTML = `Привет, ${username}! #${id}`;
            document.querySelector('.balance').innerHTML = `${balance}$`;

            update();
        } else {
            window.alert(body.message);
        };
    } else {
        window.alert('error');
    };
});

document.querySelector('form').addEventListener('submit', async ev => {
    ev.preventDefault();

    const amount = ev.target.amount.value;
    const username = ev.target.username.value;

    const res = await fetch('/api/send', {
        method: 'POST',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount, username })
    });

    let body = await res.json();

    if (res.ok) {
        if (body.success) {
            page('page-main');
        } else {
            window.alert(body.message);
        };
    } else {
        window.alert('error');
    };
});

const wait = timeout => new Promise(resolve => setTimeout(resolve, timeout));

const update = async () => {
    const res = await fetch('/api/data', { method: 'POST' });

    let body = await res.json();

    if (res.ok) {
        if (body.success) {
            const { history, balance } = body;

            document.querySelector('.balance').innerHTML = `${balance}$`;

            let pgs = [];

            for (const item of history) pgs.push(`
                <div class="blank">
                    <div class="blank-header">
                        <p class="title">${item.title}</p>
                        <p class="time">${item.time}</p>
                    </div>
            
                    <p class="message">${item.message}</p>
                </div>
            `);

            document.querySelector('.history').innerHTML = `<p>История</p> ${pgs.join('')}`
        } else window.alert(body.message);
    } else window.alert('error');
};

const pages = [
    'page-sending'
];

const mainpages = [
    'page-history',
    'page-main'
];

const changePage = async (page, state) => {
    if (state) {
        page.style.display = 'block';
    } else {
        page.style.display = 'none';
    };
};

const page = async pagename => {
    if (mainpages.includes(pagename)) {
        mainpages.forEach(async item => await changePage(document.querySelector(`#${item}`), true));
        pages.forEach(async item => await changePage(document.querySelector(`#${item}`), false));

        update();
    } else {
        mainpages.forEach(async item => await changePage(document.querySelector(`#${item}`), false));
        changePage(document.querySelector(`#${pagename}`), true);
    };
};

const logout = async () => {
    const res = await fetch('/api/logout', { method: 'POST' });
    if (res.ok) {
        if ((await res.json()).success) window.location.pathname = '/';
    } else {
        window.alert('error');
    };
};
