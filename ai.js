const db = require('./db');

class AIService {
    static async prioritizeAndSort(type) {
        const items = db.prepare('SELECT * FROM goals WHERE type = ?').all(type);
        for (const item of items) {
            let score = 50;
            if (item.target_amount < 500) score += 20;
            if (item.deadline) {
                const days = (new Date(item.deadline) - new Date()) / (86400000);
                if (days < 14) score += 30;
                else if (days < 60) score += 15;
            }
            const label = score > 80 ? 'CRITICAL' : (score > 40 ? 'STRATEGIC' : 'LIFESTYLE');
            db.prepare('UPDATE goals SET priority_score = ?, priority_label = ? WHERE id = ?')
              .run(score, label, item.id);
        }
        return db.prepare('SELECT * FROM goals WHERE type = ? ORDER BY priority_score DESC').all(type);
    }
}

module.exports = AIService;
