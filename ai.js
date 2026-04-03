const db = require('./db');

class AIService {
    static async prioritizeAndSort(type) {
        const { rows: items } = await db.query('SELECT * FROM goals WHERE type = $1', [type]);
        
        for (const item of items) {
            let score = 50;
            if (item.target_amount < 500) score += 20;
            if (item.deadline) {
                const days = (new Date(item.deadline) - new Date()) / (86400000);
                if (days < 14) score += 30;
                else if (days < 60) score += 15;
            }
            const label = score > 80 ? 'CRITICAL' : (score > 40 ? 'STRATEGIC' : 'LIFESTYLE');
            await db.query('UPDATE goals SET priority_score = $1, priority_label = $2 WHERE id = $3', [score, label, item.id]);
        }
        
        const { rows: sorted } = await db.query('SELECT * FROM goals WHERE type = $1 ORDER BY priority_score DESC', [type]);
        return sorted;
    }
}

module.exports = AIService;
