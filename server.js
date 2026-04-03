require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db');
const ai = require('./ai');
const path = require('path');

const app = express();
const port = 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

const RATES = { weekday: 13.28, weekend: 15.93, public_holiday: 26.55 };

// --- CORE ANALYTICS (SAFETIED) ---
function getNetIncome() {
    try {
        const incomeRow = db.prepare(`SELECT SUM(total_pay_actual) as s FROM shifts WHERE status = 'paid'`).get();
        const expRow = db.prepare(`SELECT SUM(amount) as s FROM expenses`).get();
        const rawIncome = incomeRow ? (incomeRow.s || 0) : 0;
        const rawExp = expRow ? (expRow.s || 0) : 0;
        return rawIncome - rawExp;
    } catch (e) {
        console.error("Net Income Calc Error:", e);
        return 0;
    }
}

function getStats() {
    try {
        const rows = db.prepare(`SELECT total_pay_actual FROM shifts WHERE status = 'paid' ORDER BY date DESC LIMIT 4`).all();
        const rawIncome = rows.map(r => r.total_pay_actual || 0);
        const avg = rawIncome.length ? rawIncome.reduce((a, b) => a + b, 0) / rawIncome.length : 0;
        const baseAllowance = avg * 0.7;
        return { 
            avg, 
            allowance: { 
                min: (baseAllowance * 0.8).toFixed(2), 
                rec: baseAllowance.toFixed(2), 
                max: (baseAllowance * 1.2).toFixed(2) 
            } 
        };
    } catch (e) {
        console.error("Stats Calc Error:", e);
        return { avg: 0, allowance: { min: "0.00", rec: "0.00", max: "0.00" } };
    }
}

// --- API ENDPOINTS ---
app.get('/api/dashboard', (req, res) => {
    try {
        const stats = getStats();
        const income = db.prepare(`SELECT date, type as name, total_pay_actual as amount, 'income' as flow FROM shifts WHERE status = 'paid' ORDER BY date DESC LIMIT 10`).all();
        const expenses = db.prepare(`SELECT date, name, amount, 'expense' as flow FROM expenses ORDER BY date DESC LIMIT 10`).all();
        const history = [...income, ...expenses].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
        
        const estRow = db.prepare(`SELECT SUM(total_pay_estimated) as s FROM shifts WHERE status = 'pending'`).get();
        const estIncome = estRow ? (estRow.s || 0) : 0;

        res.json({
            netIncome: getNetIncome(),
            estIncome: estIncome,
            allowance: stats.allowance,
            transactions: history
        });
    } catch (e) {
        console.error("Dashboard API Error:", e);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post('/api/shifts', (req, res) => {
    const { date, type, hours, minutes, notes } = req.body;
    const pay = ((parseFloat(hours) || 0) + (parseFloat(minutes) || 0) / 60) * RATES[type];
    db.prepare(`INSERT INTO shifts (date, type, hours, minutes, total_pay_estimated, status, notes) VALUES (?, ?, ?, ?, ?, 'pending', ?)`).run(date, type, hours, minutes, pay, notes || '');
    res.json({ success: true });
});

app.post('/api/shifts/manual', (req, res) => {
    const { amount, note, date } = req.body;
    db.prepare(`INSERT INTO shifts (date, type, total_pay_actual, status, notes) VALUES (?, 'manual', ?, 'paid', ?)`).run(date, amount, note || '');
    res.json({ success: true });
});

app.post('/api/shifts/pay/:id', (req, res) => {
    const s = db.prepare('SELECT * FROM shifts WHERE id = ?').get(req.params.id);
    if (s) {
        db.prepare(`UPDATE shifts SET status = 'paid', total_pay_actual = ? WHERE id = ?`).run(s.total_pay_estimated, req.params.id);
    }
    res.json({ success: true });
});

app.get('/api/shifts', (req, res) => res.json(db.prepare('SELECT * FROM shifts ORDER BY date DESC').all()));
app.get('/api/expenses', (req, res) => res.json(db.prepare('SELECT * FROM expenses ORDER BY date DESC').all()));

app.post('/api/expenses', (req, res) => {
    db.prepare(`INSERT INTO expenses (name, amount, category, date) VALUES (?, ?, ?, ?)`).run(req.body.name, req.body.amount, req.body.category, req.body.date);
    res.json({ success: true });
});

app.get('/api/goals', (req, res) => res.json(db.prepare('SELECT * FROM goals ORDER BY priority_score DESC').all()));
app.post('/api/goals', (req, res) => {
    db.prepare(`INSERT INTO goals (type, name, bio, target_amount, deadline) VALUES (?, ?, ?, ?, ?)`).run(req.body.type, req.body.name, req.body.bio || '', req.body.target_amount, req.body.deadline || '');
    res.json({ success: true });
});

app.post('/api/goals/sort', async (req, res) => {
    const sorted = await ai.prioritizeAndSort(req.body.type);
    res.json(sorted);
});

app.get('/api/settings', (req, res) => {
    const s = {};
    db.prepare('SELECT * FROM settings').all().forEach(r => s[r.key] = r.value);
    res.json(s);
});

app.post('/api/settings', (req, res) => {
    db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(req.key, req.value);
    res.json({ success: true });
});

app.listen(port, () => console.log(`Apple Hub running at http://localhost:${port}`));
