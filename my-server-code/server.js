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

// --- DEFAULT DATA (FULLY LOADED) ---
let data = {
    users: [
        { id: 1, userid: 'JASLYN_ADMIN', password: 'admin2025', name: 'Jaslyn Kaur', role: 'staff', staffType: 'super_admin' },
        { id: 2, userid: 'KAUSHI2025', password: 'student123', name: 'Kaushikanath Segaran', role: 'student', staffType: null }
    ],
    aboutData: {
        description: "Welcome to the official portal of the UNIMY Student Representative Council (SRC). We are a student-elected body dedicated to serving as the bridge between the student community and the university administration. Our goal is to ensure every student's voice is heard and valued.",
        mission: "To proactively advocate for student rights, enhance the quality of campus life through diverse events, and foster a supportive academic environment for all majors.",
        vision: "To cultivate a united, empowered, and dynamic student community that produces future-ready leaders and innovators.",
        role: "We facilitate communication, manage student clubs & societies, provide welfare support, and organize skill-building workshops throughout the academic year.",
        
        // DEFAULT COUNTDOWN
        countdownTitle: "UNIMY Grand Gala 2026",
        countdownTarget: "2026-03-01T20:00"
    },
    announcements: [
        { id: 1, title: ' ⚠️  FINAL EXAM DOCKET READY', content: 'Your exam dockets for the Jan 2026 semester are now available for download via the Student Portal. Please ensure you print two copies before entering the exam hall. Students with outstanding fees will be blocked from downloading.', date: '2026-01-05', currentUser: 'System' },
        { id: 2, title: ' 🚌  Shuttle Bus Schedule Update', content: 'Starting next week, the shuttle bus will arrive at the hostel every 30 minutes instead of 1 hour during peak periods (7 AM - 9 AM). The evening schedule remains unchanged.', date: '2026-01-02', currentUser: 'System' },
        { id: 3, title: ' 📊  Cafeteria Food Survey', content: 'We want to hear your thoughts! The SRC is conducting a survey regarding the new cafeteria vendor. Please fill out the Google Form sent to your student email by Friday.', date: '2025-12-28', currentUser: 'System' },
        { id: 4, title: ' 📚  Library Extended Hours', content: 'In preparation for the upcoming study week, the library will remain open until 12:00 AM daily. Please remember to bring your student ID for entry after 10 PM.', date: '2025-12-25', currentUser: 'System' },
        { id: 5, title: ' 📡  Campus Wi-Fi Maintenance', content: 'IT Services will be conducting scheduled maintenance on the "UNIMY-Student" network this Saturday from 10 PM to 2 AM. Internet access may be intermittent.', date: '2025-12-20', currentUser: 'System' }
    ],
    events: [
        // EVENT 1: The Countdown Target
        { 
            id: 1, 
            title: ' ✨ UNIMY Grand Gala 2026', 
            date: '2026-03-01', 
            time: '20:00', 
            location: 'Main Grand Ballroom', 
            organizer: 'SRC High Council', 
            description: 'The most anticipated night of the year is finally here! Join us for a spectacular evening of fine dining, live musical performances, and our annual Student Awards ceremony. This year’s theme is "Cyberpunk Elegance," so dress to impress! Tickets are selling fast at the SRC office.', 
            currentUser: 'System' 
        },
        // EVENT 2: E-Sports
        { 
            id: 2, 
            title: ' 🏆  Inter-Uni Valorant Championship', 
            date: '2026-02-15', 
            time: '10:00', 
            location: 'Computer Lab 3 & Twitch Stream', 
            organizer: 'E-Sports Club', 
            description: 'Calling all agents! UNIMY is hosting the regional qualifiers. Assemble your 5-stack team and compete for a prize pool of RM2000. Spectators are welcome in Lab 3, and the entire event will be streamed live on the official UNIMY Twitch channel.', 
            currentUser: 'System' 
        },
        // EVENT 3: Cyber
        { 
            id: 3, 
            title: ' 🔐  Cybersecurity Workshop: Ethical Hacking', 
            date: '2026-01-15', 
            time: '14:00', 
            location: 'Auditorium A', 
            organizer: 'Tech Club', 
            description: 'Interested in penetration testing? Join us for a hands-on workshop led by industry experts from CyberSecurity Malaysia. You will learn the fundamentals of network defense, vulnerability scanning, and ethical hacking protocols. Please bring your own laptop with Kali Linux installed.', 
            currentUser: 'System' 
        },
        // EVENT 4: Sports
        { 
            id: 4, 
            title: ' ⚽  Futsal Friendly Match', 
            date: '2026-01-20', 
            time: '17:00', 
            location: 'Sports Complex Court A', 
            organizer: 'Sports Club', 
            description: 'It is time to settle the score! The annual Staff vs. Students friendly match is back. Come support your peers or sign up to play. Refreshments will be provided for all players and spectators. Jersey collection starts at 4:30 PM.', 
            currentUser: 'System' 
        },
        // EVENT 5: Social
        { 
            id: 5, 
            title: ' 🍕  Late Night Study Snacks', 
            date: '2026-01-10', 
            time: '21:00', 
            location: 'Student Lounge (Level 2)', 
            organizer: 'Welfare Bureau', 
            description: 'Feeling the exam stress? Take a break and grab some free pizza, donuts, and coffee! The Welfare Bureau is hosting a study support session to keep you fueled for your revision. First come, first served!', 
            currentUser: 'System' 
        }
    ],
    members: [
        { id: 1, name: 'Jaslyn Kaur', role: 'President', image: 'images/im1.png' },
        { id: 2, name: 'Kaushikanath', role: 'Vice President', image: 'images/im2.png' },
        { id: 3, name: 'Sarah Lee', role: 'Secretary General', image: 'images/im3.png' },
        { id: 4, name: 'Ahmad Faizal', role: 'Honorary Treasurer', image: 'images/im4.png' },
        { id: 5, name: 'Kevin Tan', role: 'Head of Welfare', image: 'images/im5.png' }
    ],
    faqs: [
        { id: 1, question: 'How do I reset my student portal password?', answer: 'If you have forgotten your password, please visit the IT Helpdesk on Level 3. For security reasons, password resets cannot be done online. Bring your Student ID card for verification.' },
        { id: 2, question: 'Where can I apply for event funding?', answer: 'You can download the "Event Proposal & Budget" form from the Student Affairs intranet. Once completed, submit a physical copy to the SRC Treasurer at the SRC Office (Room 204).' },
        { id: 3, question: 'How do I register a new club?', answer: 'New clubs require a minimum of 10 members and a faculty advisor. Submit your club constitution and member list to the SRC Vice President for initial approval.' },
        { id: 4, question: 'What is the dress code for the library?', answer: 'Students must adhere to the formal university dress code. Shorts, slippers, and sleeveless tops are strictly prohibited inside the library and exam halls.' },
        { id: 5, question: 'Can I park my car on campus overnight?', answer: 'Overnight parking is reserved for hostel residents with a valid sticker. Non-residents must vacate the parking lot by 11:00 PM to avoid clamping.' }
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
            // Safety check: if file is empty or corrupted, use defaults
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

