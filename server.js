const express = require('express');
const QRCode = require('qrcode');
const crypto = require('crypto');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// دیتابیس موقت (در حافظه) - برای Railway کاملا مناسب است
let usersDB = [];

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// میان‌بر برنامه‌نویسی برای احراز هویت ساده
const ADMIN_USER = "admin";
const ADMIN_PASS = "admin"; // تو Railway می‌تونی اینا رو تغییر بدی

// API: ورود به پنل
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (username === ADMIN_USER && password === ADMIN_PASS) {
        res.json({ success: true, token: "fake-jwt-token-123" });
    } else {
        res.status(401).json({ success: false, message: "نام کاربری یا رمز عبور اشتباه است" });
    }
});

// API: گرفتن آمار داشبورد
app.get('/api/stats', (req, res) => {
    res.json({
        totalUsers: usersDB.length,
        activeUsers: usersDB.filter(u => u.status === 'active').length,
        totalTraffic: usersDB.reduce((acc, u) => acc + (u.usedTraffic || 0), 0),
        totalLimit: usersDB.reduce((acc, u) => acc + (u.dataLimit || 0), 0)
    });
});

// API: گرفتن لیست کاربران
app.get('/api/users', (req, res) => {
    res.json(usersDB);
});

// API: ساخت کاربر و کانفیگ جدید
app.post('/api/users', async (req, res) => {
    const { name, host, path, sni, dataLimit, expireDays } = req.body;
    
    if (!name || !host) {
        return res.status(400).json({ error: 'اسم و آدرس سرور (Host) الزامی است' });
    }

    const uuid = crypto.randomUUID();
    const expireDate = expireDays > 0 ? new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000).toISOString() : null;
    
    const vlessLink = `vless://${uuid}@${host}:443?type=ws&security=tls&path=${encodeURIComponent(path || '/')}&host=${sni || host}&sni=${sni || host}#${encodeURIComponent(name)}`;
    
    const newUser = {
        id: crypto.randomBytes(4).toString('hex'),
        name,
        uuid,
        vlessLink,
        status: 'active',
        dataLimit: dataLimit || 0, // به گیگابایت
        usedTraffic: Math.floor(Math.random() * 1000), // ترافیک تستی
        expireDate,
        createdAt: new Date().toISOString()
    };

    usersDB.push(newUser);
    res.json({ success: true, user: newUser });
});

// API: حذف کاربر
app.delete('/api/users/:id', (req, res) => {
    usersDB = usersDB.filter(u => u.id !== req.params.id);
    res.json({ success: true });
});

// API: گرفتن QR Code
app.get('/api/qr/:id', async (req, res) => {
    const user = usersDB.find(u => u.id === req.params.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    
    const qr = await QRCode.toDataURL(user.vlessLink, { width: 200, margin: 1 });
    res.json({ qr });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Professional Panel running on port ${PORT}`);
});
