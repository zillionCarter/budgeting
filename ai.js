const db = require('./db');

class AIService {
    static async prioritizeAndSort(type) {
        const { rows: items } = await db.query('SELECT * FROM goals WHERE type = $1', [type]);
        
        for (const item of items) {
            let score = 50;
            let reasoning = "Standard strategic priority based on financial targets.";

            // Financial impact
            if (item.target_amount < 500) score += 10;
            
            // Deadline impact
            if (item.deadline) {
                const days = (new Date(item.deadline) - new Date()) / (86400000);
                if (days < 0) score += 40; // Overdue
                else if (days < 14) score += 30;
                else if (days < 60) score += 15;
            }

            // Bio / Strategic Reasoning analysis
            if (item.bio) {
                const bio = item.bio.toLowerCase();
                if (bio.includes('urgent') || bio.includes('need') || bio.includes('emergency') || bio.includes('must')) {
                    score += 25;
                    reasoning = "High priority due to urgent necessity mentioned in bio.";
                } else if (bio.includes('growth') || bio.includes('investment') || bio.includes('future')) {
                    score += 15;
                    reasoning = "Strategic growth asset identified.";
                } else if (bio.includes('whenever') || bio.includes('maybe') || bio.includes('wish')) {
                    score -= 10;
                    reasoning = "Flexible timeline indicated in bio.";
                }
            }

            const label = score > 85 ? 'CRITICAL' : (score > 60 ? 'STRATEGIC' : (score > 30 ? 'LIFESTYLE' : 'BACKLOG'));
            await db.query('UPDATE goals SET priority_score = $1, priority_label = $2, ai_reasoning = $3 WHERE id = $4', [score, label, reasoning, item.id]);
        }
        
        const { rows: sorted } = await db.query('SELECT * FROM goals WHERE type = $1 ORDER BY priority_score DESC', [type]);
        return sorted;
    }
}

module.exports = AIService;
