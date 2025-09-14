import express, { NextFunction, Request, Response } from 'express';
import { dirname, join } from 'path';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import jsonwebtoken from "jsonwebtoken";
import { readFileSync, writeFileSync } from 'fs';
import cookieParser from "cookie-parser";
import bcryptjs from 'bcryptjs';
import favicon from 'serve-favicon';

dotenv.config();

const app = express();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

//FUNCTIONS

const r = (p: string): string => (d(`read triggered ${p}`), readFileSync(join(__dirname, '../', p), 'utf8'));
const w = (p: string, t: string): void => (d(`write triggered ${p}`), writeFileSync(join(__dirname, '../', p), t));
const json = async (readonly: boolean, p: string, f?: (json: any) => any): Promise<any> => readonly ? JSON.parse(r(p)) : w(p, JSON.stringify(f ? await f(JSON.parse(r(p))) : '', undefined, 4));
const d = console.debug;
const getTime = () => new Date().toLocaleTimeString('ru-RU', { timeZone: 'Etc/GMT-5', hour: '2-digit', minute: '2-digit', second: '2-digit' });

interface History {
    title: string;
    message: string;
    time: string;
}

//MIDDLEWARE

const middleware = (req: Request, res: Response, next: NextFunction) => {
    d('middleware triggered');

    try {
        const token = req.cookies.jwt && jsonwebtoken.verify(req.cookies.jwt, process.env.salt as string);

        ['/login', '/register', '/', '/auth'].includes(req.path) ?
        token ? res.redirect('/banking') : (res.status(200), next()) :
        token ? (res.status(200), next()) : res.status(401).send(r('static/pages/401.html'));
    } catch (error) {
        console.error(`middleware, err: ${error}`);
    };
};

//HISTORY

const addHistory = async (id: any, obj: History) => {
  await json(false, 'data/users.json', async (json) => {
    const user = json.users.find((u: any) => u.id === id);
    if (!user) return;
    user.history.unshift(obj);
    return json;
  });
};

//MIDDLE

app.use(express.json());
app.use(cookieParser());

//POST

app.post("/api/register", async (req, res) => {
    d('register triggered');

    try {
        const users = (await json(true, 'data/users.json')).users as any;
        const lastUserId = users.length > 0 ? users[users.length - 1].id : 0;
        const { username, password: pass } = req.body;

        if (users.find((u: any) => u.username === username)) return res.status(200).json({ success: false, message: 'Такой пользователь уже существует' });

        const password = await bcryptjs.hash(pass, 12);

        await json(false, 'data/users.json', async json => (json.users.push({ id: lastUserId + 1, username, password, balance: 0, history: [] }), json));

        addHistory(lastUserId + 1, {
            title: 'Аутенфикация',
            message: 'Выполнена регистрация на сайт.',
            time: getTime()
        });

        res.status(200).cookie('jwt', jsonwebtoken.sign({ id: lastUserId + 1 }, process.env.salt as string, { expiresIn: '7d' }), { httpOnly: true }).json({ success: true });
    } catch (error) {
        console.error(`/api/register/, err: ${error}`);
    };
});

app.post('/api/login', async (req, res) => {
    d('login triggered');

    try {
        const { username, password } = req.body;
        const user = (await json(true, 'data/users.json')).users.find((u: any) => u.username === username);

        if (user && await bcryptjs.compare(password, user.password)) {
            addHistory(user.id, {
                title: 'Аутенфикация',
                message: 'Выполнена авторизация на сайт.',
                time: getTime()
            });

            res.status(200).cookie('jwt', jsonwebtoken.sign({ id: user.id }, process.env.salt as string, { expiresIn: '7d' }), { httpOnly: true }).json({ success: true });
        } else res.json({ success: false, message: 'Неправильный логин или пароль' });
    } catch (error) {
        console.error(`/api/login, err: ${error}`);
    };
});

app.post('/api/data', async (req, res) => {
    d('data triggered');

    try {
        const token = jsonwebtoken.verify(req.cookies.jwt, process.env.salt as string);

        if (token) {
            const user = (await json(true, 'data/users.json')).users.find((u: any) => u.id === (token as any).id);
            const { username, id, balance, history } = user;

            user ? res.json({ success: true, username, id, balance, history }) : res.status(200).json({ success: false, message: 'Пользователь не найден' });
        };
    } catch (error) {
        console.error(`/api/data, err: ${error}`);
    };
});

app.post('/api/logout', async (req, res) => {
    d('logout triggered');

    try {
        if (req.cookies.jwt) {
            const token = jsonwebtoken.verify(req.cookies.jwt, process.env.salt as string) as any;

            if (token) {
                addHistory(token.id, {
                    title: 'Аутенфикация',
                    message: 'Выполнен выход из аккаунта.',
                    time: getTime()
                });

                res.status(200).clearCookie('jwt', { httpOnly: true }).json({ success: true });
            } else res.status(200).json({ success: false, message: 'Ваш токен истёк.' });
        } else {
            res.status(401);
        };
    } catch (error) { 
        console.error(`/api/logout, err: ${error}`);
    };
});

app.post('/api/send', async (req, res) => {
    d('send triggered');

    const { amount, username } = req.body;

    const amountN = Number(amount);

    if (amountN < 10) res.status(200).json({ success: false, message: "Нельзя отправить менее 10$" });

    try {
        if (req.cookies.jwt) {
            const token = jsonwebtoken.verify(req.cookies.jwt, process.env.salt as string) as any;

            if (token) {
                const users = (await json(true, 'data/users.json')).users;
                const user1 = users.find((u: any) => u.id === token.id);
                const user2 = users.find((u: any) => u.username === username);

                if (user1 === user2) res.status(200).json({ success: false, message: 'Перевод самому себе запрещён.' })

                d('send pending triggered');

                if (user2 && user1.balance >= amountN) {
                    d('sended OK triggered');

                    json(false, 'data/users.json', (json => {
                        const usr1 = json.users.find((u: any) => u.id === token.id);
                        const usr2 = json.users.find((u: any) => u.username === username);

                        usr1.history.unshift({
                            title: 'Переводы',
                            message: `Сумма ${amount}$ отправлена на счёт ${user2.username}.`,
                            time: getTime()
                        });

                        usr2.history.unshift({
                            title: 'Переводы',
                            message: `Получена сумма ${amount}$ от пользователя ${user1.username}.`,
                            time: getTime()
                        });

                        usr1.balance = usr1.balance - amountN;
                        usr2.balance = usr2.balance + amountN;
                        console.log(json)
                        return json;
                    }));

                    res.status(200).json({ success: true });
                } else {
                    res.status(200).json({ success: false, message: 'Недостаточно средств или не найден пользователь.' });
                };
            } else res.status(200).json({ success: false, message: 'Ваш токен истёк.' });
        } else {
            res.status(401);
        };
    } catch (error) { 
        console.error(`/api/send, err: ${(error as Error).stack}`);
    };
});

//GET, STATIC
app.use(express.static(join(__dirname, '../static/')));
app.use(favicon(join(__dirname, '../static/favicon.ico')));

//main
app.get('/', middleware, (_, res) => res.send(r('static/index.html')));

//auth
app.get('/auth', middleware, (_, res) => res.send(r('static/pages/auth/index.html')));

//register
app.get('/register', middleware, (_, res) => res.send(r('static/pages/register/index.html')));

//login
app.get('/login', middleware, (_, res) => res.send(r('static/pages/login/index.html')));

//banking
app.get('/banking', middleware, (_, res) => res.send(r('static/pages/banking/index.html')));

//404
app.all(/.*/, (_, res) => res.status(404).send(r('static/pages/404.html')));

//DEBUG

const routes: string[] = [];

app.router.stack.forEach((middleware: any) => 
    middleware.route ? 
    routes.push(`${Object.keys(middleware.route.methods).join(', ').toUpperCase()} ${middleware.route.path}`) :
    middleware.name === 'router' && 
    middleware.handle.stack.forEach((handler: any) => handler.route && routes.push(`${Object.keys(handler.route.methods).join(', ').toUpperCase()} ${handler.route.path}`))
);

d(`${routes.join('\n')}`);

//LISTEN

app.listen(process.env.port, err => err ? console.error(err) : d(`localhost:${process.env.port}`));
