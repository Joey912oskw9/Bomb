const express = require('express');
const QRCode = require('qrcode');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// دیتابیس موقت (در حافظه سرور)
let db = {
    users: [],
    inbounds: [
        { id: 1, protocol: "VLESS", port: 443, remark: "VLESS_TCP_TLS" },
        { id: 2, protocol: "VMess", port: 8080, remark: "VMess_WS" },
        { id: 3, protocol: "Trojan", port: 8443, remark: "Trojan_TCP" }
    ]
};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- روت‌های API ---

// صفحه سابسکریپشن (مثل مرزبان لینک sub میده)
app.get('/sub/:token', (req, res) => {
    const user = db.users.find(u => u.sub_token === req.params.token);
    if (!user) return res.status(404).send('User not found');
    
    // فرمت سابسکریپشن (Base64)
    const subContent = Buffer.from(user.links.join('\n')).toString('base64');
    res.setHeader('Content-Type', 'text/plain');
    res.send(subContent);
});

// لاگین
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === 'admin' && password === 'admin') {
        res.json({ success: true });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// گرفتن آمار
app.get('/api/stats', (req, res) => {
    res.json({
        users: db.users.length,
        active: db.users.filter(u => u.status === 'active').length,
        online: Math.floor(Math.random() * 5), // شبیه‌سازی کاربر آنلاین
        totalBandwidth: db.users.reduce((a, b) => a + b.used_bytes, 0)
    });
});

// لیست کاربران
app.get('/api/users', (req, res) => res.json(db.users));

// ساخت کاربر جدید
app.post('/api/users', async (req, res) => {
    const { name, data_limit_gb, expire_days } = req.body;
    if (!name) return res.status(400).json({ error: 'Name required' });

    const uuid = crypto.randomUUID();
    const sub_token = crypto.randomBytes(8).toString('hex');
    const host = req.headers.host; // دامنه خود ریلی

    // تولید لینک‌ها برای این کاربر
    const links = [
        `vless://${uuid}@${host}:443?type=tcp&security=tls#${name}`,
        `vmess://${Buffer.from(JSON.stringify({ v: "2", ps: name, add: host, port: "8080", id: uuid, aid: "0", net: "ws", type: "none", host: "", path: "/", tls: "" })).toString('base64')}`
    ];

    const newUser = {
        id: crypto.randomBytes(4).toString('hex'),
        name,
        uuid,
        sub_token,
        links,
        sub_url: `https://${host}/sub/${sub_token}`,
        status: 'active',
        data_limit_bytes: (data_limit_gb || 0) * 1024 * 1024 * 1024,
        used_bytes: Math.floor(Math.random() * 500 * 1024 * 1024), // ترافیک تستی
        expire_at: expire_days > 0 ? new Date(Date.now() + expire_days * 86400000).toISOString() : null,
        created_at: new Date().toISOString()
    };

    db.users.push(newUser);
    res.json({ success: true, user: newUser });
});

// حذف کاربر
app.delete('/api/users/:id', (req, res) => {
    db.users = db.users.filter(u => u.id !== req.params.id);
    res.json({ success: true });
});

// لیست Inbounds
app.get('/api/inbounds', (req, res) => res.json(db.inbounds));

app.listen(PORT, '0.0.0.0', () => console.log(`Marzban Clone running on ${PORT}`));
