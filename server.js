const express = require('express');
const QRCode = require('qrcode');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// API برای ساخت کانفیگ VLESS
app.post('/api/generate', async (req, res) => {
    try {
        const { uuid, host, path, sni, remark } = req.body;

        if (!uuid || !host) {
            return res.status(400).json({ error: 'UUID and Host are required!' });
        }

        // ساخت لینک VLESS WebSocket + TLS
        const vlessLink = `vless://${uuid}@${host}:443?type=ws&security=tls&path=${encodeURIComponent(path || '/')}&host=${sni || host}&sni=${sni || host}#${encodeURIComponent(remark || 'BombConfig')}`;
        
        // ساخت QR Code در Base64
        const qrCodeData = await QRCode.toDataURL(vlessLink, { 
            width: 300,
            margin: 1,
            color: {
                dark: '#00ff00',
                light: '#00000000' // شفاف
            }
        });

        res.json({
            success: true,
            vlessLink,
            qrCode: qrCodeData
        });
    } catch (error) {
        res.status(500).json({ error: 'Server Error: ' + error.message });
    }
});

// رندم UUID ژنراتور (در صورت نیاز)
app.get('/api/uuid', (req, res) => {
    res.json({ uuid: crypto.randomUUID() });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`💥 BOMB PANEL is running on port ${PORT}`);
});
