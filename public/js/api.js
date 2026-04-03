/**
 * API Wrapper for Backend Communication
 */
const API = {
    async getDashboard() {
        const res = await fetch('/api/dashboard');
        return res.json();
    },

    async getShifts() {
        const res = await fetch('/api/shifts');
        return res.json();
    },

    async saveShift(data) {
        const res = await fetch('/api/shifts', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },

    async approveShift(id) {
        const res = await fetch(`/api/shifts/pay/${id}`, { method: 'POST' });
        return res.json();
    },

    async getGoals() {
        const res = await fetch('/api/goals');
        return res.json();
    },

    async saveGoal(data) {
        const res = await fetch('/api/goals', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        return res.json();
    },

    async getInsights() {
        const res = await fetch('/api/insights');
        return res.json();
    },

    async getSettings() {
        const res = await fetch('/api/settings');
        return res.json();
    },

    async saveSetting(key, value) {
        const res = await fetch('/api/settings', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ key, value })
        });
        return res.json();
    }
};
