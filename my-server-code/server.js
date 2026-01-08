const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// --- DATABASE CONNECTION ---
const DATABASE_URL = process.env.DATABASE_URL;

let pool;

async function initDB() {
    if (!DATABASE_URL) {
        console.error("❌ DATABASE_URL is missing! Check Render Environment Variables.");
        return;
    }
    try {
        pool = mysql.createPool(DATABASE_URL);
        console.log("✅ Connected to MySQL Database");

        // --- AUTO-CREATE TABLES ---
        const tables = [
            `CREATE TABLE IF NOT EXISTS users (id INT AUTO_INCREMENT PRIMARY KEY, userid VARCHAR(255) UNIQUE, password VARCHAR(255), name VARCHAR(255), role VARCHAR(50), staffType VARCHAR(50))`,
            `CREATE TABLE IF NOT EXISTS announcements (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(255), content TEXT, date VARCHAR(50))`,
            `CREATE TABLE IF NOT EXISTS events (id INT AUTO_INCREMENT PRIMARY KEY, title VARCHAR(255), location VARCHAR(255), date VARCHAR(50), time VARCHAR(50), organizer VARCHAR(255), description TEXT)`,
            `CREATE TABLE IF NOT EXISTS members (id INT AUTO_INCREMENT PRIMARY KEY, name VARCHAR(255), role VARCHAR(255), image VARCHAR(255))`,
            `CREATE TABLE IF NOT EXISTS faqs (id INT AUTO_INCREMENT PRIMARY KEY, question TEXT, answer TEXT)`,
            `CREATE TABLE IF NOT EXISTS chats (id INT AUTO_INCREMENT PRIMARY KEY, student VARCHAR(255), text TEXT, sender VARCHAR(50),kq VARCHAR(50))`, // Fixed schema
            `CREATE TABLE IF NOT EXISTS logs (id INT AUTO_INCREMENT PRIMARY KEY, action VARCHAR(50), user VARCHAR(255), details TEXT, timestamp VARCHAR(50))`,
            `CREATE TABLE IF NOT EXISTS about_info (id INT PRIMARY KEY DEFAULT 1, description TEXT, mission TEXT, vision TEXT, role TEXT, countdownTitle VARCHAR(255), countdownTarget VARCHAR(255))`
        ];

        for (const query of tables) { await pool.query(query); }

        // --- SEED DEFAULT ADMIN ---
        const [users] = await pool.query("SELECT * FROM users");
        if (users.length === 0) {
            const hash = await bcrypt.hash('admin2025', 10);
            await pool.query("INSERT INTO users (userid, password, name, role, staffType) VALUES (?, ?, ?, ?, ?)", 
                ['JASLYN_ADMIN', hash, 'Jaslyn Kaur', 'staff', 'super_admin']);
            console.log("⚠️ Default Admin Created");
        }

        // --- SEED DEFAULT INFO ---
        const [info] = await pool.query("SELECT * FROM about_info");
        if (info.length === 0) {
            await pool.query("INSERT INTO about_info (id, description) VALUES (1, 'Welcome to UNIMY SRC...')");
        }

    } catch (err) {
        console.error("❌ Database Connection Failed:", err.message);
    }
}
initDB();

async function addLog(action, user, details) {
    const timestamp = new Date().toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" });
    try { await pool.query("INSERT INTO logs (action, user, details, timestamp) VALUES (?, ?, ?, ?)", [action, user, details, timestamp]); } catch(e) {}
}

// --- ROUTES ---
app.post('/api/login', async (req, res) => {
    const { id, password, loginType } = req.body;
    try {
        const [rows] = await pool.query("SELECT * FROM users WHERE userid = ?", [id]);
        if (rows.length === 0) return res.json({ success: false, message: "User not found" });

        const user = rows[0];
        const match = await bcrypt.compare(password, user.password);

        if (!match) return res.json({ success: false, message: "Invalid Password" });
        if (loginType === 'staff' && user.role !== 'staff') return res.json({ success: false, message: "Not authorized as staff" });

        addLog("LOGIN", user.name, `Logged in as ${user.role}`);
        res.json({ success: true, name: user.name, role: user.role, staffType: user.staffType, redirect: user.role === 'staff' ? 'admin.html' : 'index.html' });
    } catch (err) { res.status(500).json({ success: false, message: "Server error" }); }
});

// GENERIC CRUD ROUTES
const endpoints = ['announcements', 'events', 'members', 'faqs', 'users'];
endpoints.forEach(table => {
    app.get(`/api/${table}`, async (req, res) => { const [rows] = await pool.query(`SELECT * FROM ${table}`); res.json(rows); });
    app.post(`/api/${table}`, async (req, res) => {
        if(table === 'users') {
             const { userid, password, name, role, staffType, currentUser } = req.body;
             const hash = await bcrypt.hash(password, 10);
             await pool.query("INSERT INTO users (userid, password, name, role, staffType) VALUES (?, ?, ?, ?, ?)", [userid, hash, name, role, staffType]);
             addLog("CREATE_USER", currentUser, `Created user ${userid}`);
             return res.json({ success: true });
        }
        const keys = Object.keys(req.body).filter(k => k !== 'currentUser');
        const values = keys.map(k => req.body[k]);
        const placeholders = keys.map(() => '?').join(',');
        await pool.query(`INSERT INTO ${table} (${keys.join(',')}) VALUES (${placeholders})`, values);
        addLog(`CREATE_${table.toUpperCase()}`, req.body.currentUser || "System", `Added item to ${table}`);
        res.json({ success: true });
    });
    app.delete(`/api/${table}/:id`, async (req, res) => { await pool.query(`DELETE FROM ${table} WHERE id=?`, [req.params.id]); res.json({ success: true }); });
});

// CHATS
app.get('/api/chats', async (req, res) => { const [rows] = await pool.query("SELECT * FROM chats"); res.json(rows); });
app.post('/api/chat', async (req, res) => {
    const timestamp = new Date().toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" });
    await pool.query("INSERT INTO chats (student, text, sender, timestamp) VALUES (?, ?, ?, ?)", [req.body.student, req.body.text, req.body.sender, timestamp]);
    res.json({ success: true });
});

// LOGS & INFO
app.get('/api/logs', async (req, res) => { const [rows] = await pool.query("SELECT * FROM logs ORDER BY id DESC LIMIT 100"); res.json(rows); });
app.get('/api/logs/download', async (req, res) => {
    const [rows] = await pool.query("SELECT * FROM logs ORDER BY id DESC");
    const csv = "ID,Timestamp,User,Action,Details\n" + rows.map(r => `${r.id},"${r.timestamp}","${r.user}","${r.action}","${r.details.replace(/"/g, '""')}"`).join("\n");
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="audit_logs.csv"');
    res.send(csv);
});
app.get('/api/about', async (req, res) => { const [rows] = await pool.query("SELECT * FROM about_info WHERE id=1"); res.json(rows[0] || {}); });
app.post('/api/about', async (req, res) => {
    const { description, mission, vision, role, countdownTitle, countdownTarget, currentUser } = req.body;
    const [exists] = await pool.query("SELECT * FROM about_info WHERE id=1");
    if(exists.length > 0) await pool.query("UPDATE about_info SET description=?, mission=?, vision=?, role=?, countdownTitle=?, countdownTarget=? WHERE id=1", [description, mission, vision, role, countdownTitle, countdownTarget]);
    else await pool.query("INSERT INTO about_info (id, description, mission, vision, role, countdownTitle, countdownTarget) VALUES (1, ?, ?, ?, ?, ?, ?)", [description, mission, vision, role, countdownTitle, countdownTarget]);
    addLog("UPDATE_INFO", currentUser, "Updated Website Info");
    res.json({ success: true });
});

app.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });
