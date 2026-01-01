const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

const DB_FILE = path.join(__dirname, 'database.json');

// TIMEZONE HELPER
const getMYTime = () => {
    return new Date().toLocaleString("en-US", { timeZone: "Asia/Kuala_Lumpur" });
};

// --- DEFAULT DATA (UPDATED WITH PRE-LOADED EVENT & COUNTDOWN) ---
let data = {
    users: [
        { id: 1, userid: 'JASLYN_ADMIN', password: 'admin2025', name: 'Jaslyn Kaur', role: 'staff', staffType: 'super_admin' },
        { id: 2, userid: 'KAUSHI2025', password: 'student123', name: 'Kaushikanath Segaran', role: 'student', staffType: null }
    ],
    aboutData: {
        description: "Welcome to the official portal of the UNIMY Student Representative Council (SRC). We are a student-elected body dedicated to serving as the bridge between the student community and the university administration.",
        mission: "To proactively advocate for student rights, enhance the quality of campus life through diverse events, and foster a supportive academic environment for all majors.",
        vision: "To cultivate a united, empowered, and dynamic student community that produces future-ready leaders and innovators.",
        role: "We facilitate communication, manage student clubs & societies, provide welfare support, and organize skill-building workshops.",
        
        // PRE-LOADED COUNTDOWN
        countdownTitle: "UNIMY Grand Gala 2026",
        countdownTarget: "2026-03-01T20:00"
    },
    announcements: [
        { id: 1, title: ' ⚠️  FINAL EXAM DOCKET READY', content: 'Your exam dockets for the Jan 2026 semester are available for download.', date: '2025-12-18', currentUser: 'System' }
    ],
    events: [
        // PRE-LOADED EVENT
        { 
            id: 1, 
            title: ' ✨ UNIMY Grand Gala 2026', 
            date: '2026-03-01', 
            time: '20:00', 
            location: 'Main Grand Ballroom', 
            organizer: 'SRC High Council', 
            description: 'The most anticipated night of the year! Join us for a night of music, food, and awards.', 
            currentUser: 'System' 
        },
        { id: 2, title: ' 🏆  Inter-Uni Valorant Championship', date: '2025-12-24', time: '10:00', location: 'Computer Lab 3', organizer: 'E-Sports Club', description: 'Prize pool: RM2000.', currentUser: 'System' }
    ],
    members: [
        { id: 1, name: 'Jaslyn Kaur', role: 'President', image: 'images/im1.png' },
        { id: 2, name: 'Kaushikanath', role: 'Vice President', image: 'images/im2.png' }
    ],
    faqs: [
        { id: 1, question: 'How do I reset my student portal password?', answer: 'Contact IT Helpdesk.' }
    ],
    chats: [],
    logs: []
};

// --- HELPER FUNCTIONS ---
function loadData() {
    if (fs.existsSync(DB_FILE)) {
        try {
            const raw = fs.readFileSync(DB_FILE);
            const fileData = JSON.parse(raw);
            if(Object.keys(fileData).length > 0) {
                data = fileData;
                console.log("Loaded data from database.json");
            }
        } catch (e) { console.log("Error reading database, using defaults."); }
    } else { saveData(); }
}
function saveData() { fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2)); }

const addLog = (action, user, details) => {
    data.logs.unshift({ id: Date.now(), timestamp: getMYTime(), action, user, details });
    saveData();
};

loadData();

// --- ROUTES ---
app.post('/api/login', (req, res) => {
    const { id, password, loginType } = req.body;
    const user = data.users.find(u => u.userid === id && u.password === password && u.role === loginType);
    if (user) {
        addLog("LOGIN", user.name, "User logged in successfully");
        res.json({ success: true, role: user.role, name: user.name, staffType: user.staffType, redirect: user.role === 'staff' ? 'admin.html' : 'index.html' });
    } else { res.json({ success: false, message: 'Invalid Credentials' }); }
});

app.get('/api/:endpoint', (req, res) => {
    const key = req.params.endpoint;
    if(key === 'about') return res.json(data.aboutData);
    if (data[key]) res.json(data[key]);
    else res.status(404).json({ error: "Not found" });
});

app.post('/api/about', (req, res) => {
    data.aboutData = req.body;
    if(req.body.currentUser) addLog("EDIT_INFO", req.body.currentUser, "Updated Website Info");
    saveData();
    res.json({ success: true });
});

app.post('/api/chat', (req, res) => {
    data.chats.push({ id: Date.now(), student: req.body.student, text: req.body.text, sender: req.body.sender, timestamp: getMYTime() });
    saveData();
    res.json({ success: true });
});

app.post('/api/:endpoint', (req, res) => {
    const key = req.params.endpoint;
    if (!data[key]) return res.status(404).json({ error: "Invalid endpoint" });
    const item = { ...req.body, id: Date.now() };
    const user = req.body.currentUser || "Unknown";
    delete item.currentUser;
    data[key].push(item);
    addLog("CREATE", user, `Created item in ${key}`);
    saveData();
    res.json({ success: true });
});

app.put('/api/:endpoint/:id', (req, res) => {
    const key = req.params.endpoint;
    const id = parseInt(req.params.id);
    if (!data[key]) return res.status(404).json({ error: "Invalid endpoint" });
    const index = data[key].findIndex(i => i.id === id);
    if (index > -1) {
        const user = req.body.currentUser || "Unknown";
        const cleanBody = { ...req.body };
        delete cleanBody.currentUser;
        data[key][index] = { ...data[key][index], ...cleanBody, id: id };
        addLog("EDIT", user, `Edited item ID ${id} in ${key}`);
        saveData();
        res.json({ success: true });
    } else { res.status(404).json({ success: false }); }
});

app.delete('/api/:endpoint/:id', (req, res) => {
    const key = req.params.endpoint;
    const id = parseInt(req.params.id);
    if (!data[key]) return res.status(404).json({ error: "Invalid endpoint" });
    const index = data[key].findIndex(i => i.id === id);
    if (index > -1) {
        data[key].splice(index, 1);
        addLog("DELETE", "Admin", `Deleted item ID ${id} from ${key}`);
        saveData();
        res.json({ success: true });
    } else { res.status(404).json({ success: false }); }
});

app.listen(PORT, () => { console.log(`Server running on port ${PORT}`); });
