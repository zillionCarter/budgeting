require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const db = require('./db');
const ai = require('./ai');

const app = express();
const port = process.env.PORT || 3000;

app.use(bodyParser.json());
app.use(express.static('public'));

const RATES = { weekday: 13.28, weekend: 15.93, public_holiday: 26.55 };

// --- CORE ANALYTICS (SAFETIED FOR POSTGRES) ---
async function getNetIncome() {
    try {
        const incomeRes = await db.query(`SELECT SUM(total_pay_actual) as s FROM shifts WHERE status = 'paid'`);
        const expRes = await db.query(`SELECT SUM(amount) as s FROM expenses`);
        const rawIncome = parseFloat(incomeRes.rows[0].s || 0);
        const rawExp = parseFloat(expRes.rows[0].s || 0);
        return rawIncome - rawExp;
    } catch (e) {
        console.error("Net Income Error:", e);
        return 0;
    }
}

async function getStats() {
    try {
        const { rows } = await db.query(`SELECT total_pay_actual FROM shifts WHERE status = 'paid' ORDER BY date DESC LIMIT 4`);
        const rawIncome = rows.map(r => parseFloat(r.total_pay_actual || 0));
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
        return { avg: 0, allowance: { min: "0.00", rec: "0.00", max: "0.00" } };
    }
}

// --- API ENDPOINTS ---
app.get('/api/dashboard', async (req, res) => {
    try {
        const stats = await getStats();
        const incomeRes = await db.query(`SELECT date, type as name, total_pay_actual as amount, 'income' as flow FROM shifts WHERE status = 'paid' ORDER BY date DESC LIMIT 10`);
        const expRes = await db.query(`SELECT date, name, amount, 'expense' as flow FROM expenses ORDER BY date DESC LIMIT 10`);
        
        const history = [...incomeRes.rows, ...expRes.rows]
            .sort((a,b) => new Date(b.date) - new Date(a.date))
            .slice(0, 10);
        
        const estRes = await db.query(`SELECT SUM(total_pay_estimated) as s FROM shifts WHERE status = 'pending'`);
        const estIncome = parseFloat(estRes.rows[0].s || 0);

        res.json({
            netIncome: await getNetIncome(),
            estIncome: estIncome,
            allowance: stats.allowance,
            transactions: history
        });
    } catch (e) {
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.post('/api/shifts', async (req, res) => {
    const { date, type, hours, minutes, notes } = req.body;
    const pay = ((parseFloat(hours) || 0) + (parseFloat(minutes) || 0) / 60) * RATES[type];
    await db.query(`INSERT INTO shifts (date, type, hours, minutes, total_pay_estimated, status, notes) VALUES ($1, $2, $3, $4, $5, 'pending', $6)`, 
        [date, type, hours, minutes, pay, notes || '']);
    res.json({ success: true });
});

app.post('/api/shifts/manual', async (req, res) => {
    const { amount, note, date } = req.body;
    await db.query(`INSERT INTO shifts (date, type, total_pay_actual, status, notes) VALUES ($1, 'manual', $2, 'paid', $3)`, 
        [date, amount, note || '']);
    res.json({ success: true });
});

app.post('/api/shifts/pay/:id', async (req, res) => {
    const { rows } = await db.query('SELECT * FROM shifts WHERE id = $1', [req.params.id]);
    if (rows[0]) {
        await db.query(`UPDATE shifts SET status = 'paid', total_pay_actual = $1 WHERE id = $2`, [rows[0].total_pay_estimated, req.params.id]);
    }
    res.json({ success: true });
});

app.get('/api/shifts', async (req, res) => {
    const { rows } = await db.query('SELECT * FROM shifts ORDER BY date DESC');
    res.json(rows);
});

app.get('/api/expenses', async (req, res) => {
    const { rows } = await db.query('SELECT * FROM expenses ORDER BY date DESC');
    res.json(rows);
});

app.post('/api/expenses', async (req, res) => {
    await db.query(`INSERT INTO expenses (name, amount, category, date) VALUES ($1, $2, $3, $4)`, 
        [req.body.name, req.body.amount, req.body.category, req.body.date]);
    res.json({ success: true });
});

app.get('/api/goals', async (req, res) => {
    const { rows } = await db.query('SELECT * FROM goals ORDER BY priority_score DESC');
    res.json(rows);
});

app.post('/api/goals', async (req, res) => {
    await db.query(`INSERT INTO goals (type, name, target_amount, deadline) VALUES ($1, $2, $3, $4)`, 
        [req.body.type, req.body.name, req.body.target_amount, req.body.deadline || '']);
    res.json({ success: true });
});

app.post('/api/goals/sort', async (req, res) => {
    const sorted = await ai.prioritizeAndSort(req.body.type);
    res.json(sorted);
});

app.get('/api/settings', async (req, res) => {
    const { rows } = await db.query('SELECT * FROM settings');
    const s = {};
    rows.forEach(r => s[r.key] = r.value);
    res.json(s);
});

app.post('/api/settings', async (req, res) => {
    await db.query('INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value', 
        [req.body.key, req.body.value]);
    res.json({ success: true });
});

app.listen(port, () => console.log(`Apple Hub (Postgres) running at http://localhost:${port}`));
