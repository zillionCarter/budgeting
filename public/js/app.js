const App = {
    init() {
        this.bindEvents();
        this.navigate('dashboard');
    },

    bindEvents() {
        // Universal navigation listeners (Sidebar + Top Hub)
        document.querySelectorAll('[data-page]').forEach(el => {
            el.addEventListener('click', () => this.navigate(el.dataset.page));
        });

        // Modal Logic
        const modal = document.getElementById('goal-modal');
        document.getElementById('modal-cancel-btn').onclick = () => modal.classList.add('hidden');
        document.getElementById('modal-save-btn').onclick = async () => {
            const id = document.getElementById('modal-goal-id').value;
            const name = document.getElementById('modal-goal-name').value;
            const bio = document.getElementById('modal-goal-bio').value;
            const amt = document.getElementById('modal-goal-amt').value;
            const deadline = document.getElementById('modal-goal-deadline').value;
            if (!name || !amt) return alert("REQUIRED FIELDS MISSING");

            const method = id ? 'PATCH' : 'POST';
            const url = id ? `/api/goals/${id}` : '/api/goals';

            await fetch(url, {
                method: method,
                headers: {'Content-Type':'application/json'},
                body: JSON.stringify({ type: this.activeType, name, bio, target_amount: parseFloat(amt), deadline })
            });
            modal.classList.add('hidden');
            this.navigate('goals');
        };
        document.getElementById('modal-delete-btn').onclick = async () => {
            const id = document.getElementById('modal-goal-id').value;
            if (id && confirm('DELETE THIS TARGET?')) {
                await fetch(`/api/goals/${id}`, { method: 'DELETE' });
                modal.classList.add('hidden');
                this.navigate('goals');
            }
        };
    },

    async navigate(page) {
        const container = document.getElementById('view-container');
        // Update all active classes (Sidebar + Top Hub)
        document.querySelectorAll('[data-page]').forEach(el => {
            el.classList.toggle('active', el.dataset.page === page);
        });
        
        container.className = `page-${page}`;
        container.innerHTML = `<div class="view-animate" style="padding:40px; opacity:0.5; font-weight:800;">HUB SYNCHRONIZING: ${page.toUpperCase()}</div>`;
        document.getElementById('view-title').innerText = page.toUpperCase();
        
        try {
            const html = await Pages[page]();
            container.innerHTML = `<div class="view-animate">${html}</div>`;
            if (PageLogic[page]) PageLogic[page]();
        } catch (e) {
            console.error("Navigation Error:", e);
            container.innerHTML = `<div class="card" style="border-color:var(--red); padding:40px;">
                <h2 style="color:var(--red)">CONNECTION INTERRUPTED</h2>
                <p>The Hub was unable to synchronize with the backend service. Check if 'node server.js' is running.</p>
                <button class="btn-primary" onclick="location.reload()" style="margin-top:20px;">RETRY HUB CONNECTION</button>
            </div>`;
        }
    }
};

const Pages = {
    dashboard: async () => {
        const res = await fetch('/api/dashboard');
        if (!res.ok) throw new Error();
        const d = await res.json();
        return `
            <div class="grid-3">
                <div class="card">
                    <p class="secondary-text">WEEKLY SPENDING HUB</p>
                    <div class="big-metric">$${d.allowance.rec}</div>
                    <p class="secondary-text">SAFE UPPER BOUND: $${d.allowance.max}</p>
                </div>
                <div class="card">
                    <p class="secondary-text">ESTIMATED PIPELINE</p>
                    <div class="big-metric">$${d.estIncome.toFixed(2)}</div>
                    <p class="secondary-text">PENDING CLEARANCE</p>
                </div>
                <div class="card metric-card featured">
                    <p class="secondary-text" style="color:rgba(255,255,255,0.8)">NET TOTAL LIQUIDITY</p>
                    <div class="big-metric">$${d.netIncome.toFixed(2)}</div>
                    <p class="secondary-text" style="color:rgba(255,255,255,0.6)">POST-DEBIT CALCULATION</p>
                </div>
            </div>
            <div class="card" style="margin-top:40px;">
                <h3 class="card-title">MASTER LEDGER (UNIFIED LOG)</h3>
                <table class="transaction-table">
                    <thead><tr><th>DATE</th><th>DESCRIPTION</th><th style="text-align:right">VALUE</th><th></th></tr></thead>
                    <tbody>
                        ${d.transactions.map(t => `
                            <tr>
                                <td><span style="opacity:0.6; font-size:0.8rem;">${t.date}</span></td>
                                <td><strong>${t.name.toUpperCase()}</strong></td>
                                <td style="text-align:right; font-weight:900; color:${t.flow==='income'?'var(--green)':'var(--red)'}">
                                    ${t.flow==='income'?'+':'-'}$${t.amount.toFixed(2)}
                                </td>
                                <td style="text-align:right">
                                    <button class="btn-delete" onclick="deleteTransaction(${t.id}, '${t.source}')" style="background:none; border:none; color:var(--red); cursor:pointer; font-size:1.2rem; padding:0 10px;">×</button>
                                </td>
                            </tr>
                        `).join('') || '<tr><td colspan="4" style="padding:40px; text-align:center; opacity:0.5;">LEDGER CLEAR</td></tr>'}
                    </tbody>
                </table>
            </div>
        `;
    },
    shifts: async () => {
        const s = await fetch('/api/shifts').then(r => r.json());
        return `
            <div class="mobile-scroll-hint"><span>SWIPE FOR HISTORY</span> <div class="dots"><span></span><span></span></div></div>
            <div class="grid-2">
                <div class="card">
                    <h3 class="card-title">SHIFT AUTHORIZATION</h3>
                    <div class="form-group" style="display:grid; gap:15px; margin-top:20px;">
                        <select id="shift-type" class="modern-input">
                            <option value="weekday">WEEKDAY (13.28)</option>
                            <option value="weekend">WEEKEND (15.93)</option>
                            <option value="public_holiday">HOLIDAY (26.55)</option>
                        </select>
                        <input type="number" id="shift-hours" class="modern-input" placeholder="HOURS">
                        <input type="number" id="shift-mins" class="modern-input" placeholder="MINUTES">
                        <input type="date" id="shift-date" class="modern-input" value="${new Date().toISOString().split('T')[0]}">
                        <button class="btn-primary" id="save-shift">RECORD SHIFT</button>
                    </div>
                    <div class="divider" style="margin:30px 0">OR</div>
                    <h3 class="card-title">DIRECT CREDIT</h3>
                    <div class="form-group" style="display:grid; gap:15px; margin-top:20px;">
                        <input type="number" id="man-amt" class="modern-input" placeholder="AMOUNT ($)">
                        <input type="text" id="man-note" class="modern-input" placeholder="SOURCE DESCRIPTION">
                        <button class="btn-primary" id="save-man" style="background:var(--green)">RECORD CREDIT</button>
                    </div>
                </div>
                <div class="card">
                    <h3 class="card-title">PENDING FLOW</h3>
                    <table>
                        <tbody>
                            ${s.filter(x => x.status === 'pending').map(x => `
                                <tr>
                                    <td>${x.date}</td>
                                    <td><strong>$${x.total_pay_estimated.toFixed(2)}</strong></td>
                                    <td style="text-align:right">
                                        <div style="display:flex; gap:5px; justify-content:flex-end;">
                                            <button class="btn-primary" onclick="payShift(${x.id})" style="padding:8px 16px; font-size:0.7rem;">SET PAID</button>
                                            <button class="btn-primary" onclick="deleteShift(${x.id})" style="padding:8px 12px; font-size:0.7rem; background:var(--red)">×</button>
                                        </div>
                                    </td>
                                </tr>
                            `).join('') || '<tr><td colspan="3" style="padding:40px; text-align:center; opacity:0.5">QUEUE CLEAR</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },
    expenses: async () => {
        const e = await fetch('/api/expenses').then(r => r.json());
        return `
            <div class="mobile-scroll-hint"><span>SWIPE FOR HISTORY</span> <div class="dots"><span></span><span></span></div></div>
            <div class="grid-2">
                <div class="card">
                    <h3 class="card-title">DEBIT AUTHORIZATION</h3>
                    <div class="form-group" style="display:grid; gap:15px; margin-top:20px;">
                        <input type="text" id="exp-name" class="modern-input" placeholder="DESCRIPTION">
                        <input type="number" id="exp-amt" class="modern-input" placeholder="AMOUNT ($)">
                        <select id="exp-cat" class="modern-input">
                            <option>BILLS</option>
                            <option>FOOD</option>
                            <option>TRANSPORT</option>
                            <option>LEISURE</option>
                            <option>OTHER</option>
                        </select>
                        <input type="date" id="exp-date" class="modern-input" value="${new Date().toISOString().split('T')[0]}">
                        <button class="btn-primary" id="save-exp" style="background:var(--red)">RECORD DEBIT</button>
                    </div>
                </div>
                <div class="card">
                    <h3 class="card-title">DEBIT HISTORY</h3>
                    <table>
                        <tbody>
                            ${e.map(x => `<tr><td>${x.date}</td><td><strong>${x.name}</strong></td><td style="text-align:right; color:var(--red); font-weight:800">-$${x.amount.toFixed(2)}</td></tr>`).join('') || '<tr><td style="padding:40px; text-align:center; opacity:0.5">NO DEBITS</td></tr>'}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    },
    goals: async () => {
        const g = await fetch('/api/goals').then(r => r.json());
        App.currentGoals = g;
        const goals = g.filter(x => x.type === 'goal');
        const wants = g.filter(x => x.type === 'want');
        return `
            <div class="mobile-scroll-hint"><span>SWIPE FOR WANTS</span> <div class="dots"><span></span><span></span></div></div>
            <div class="grid-2">
                <div class="card">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h3 class="card-title">STRATEGIC GOALS</h3>
                        <button class="ai-button" onclick="aiSort('goal')">AI SORT</button>
                    </div>
                    <div id="goal-list" style="margin-top:20px;">
                        ${goals.map(x => `<div class="card clickable-goal" onclick="openEditGoal(${x.id})" style="padding:20px; margin-bottom:10px; background:rgba(255,255,255,0.02); cursor:pointer;">
                            <div style="display:flex; justify-content:space-between;"><strong>${x.name}</strong> <span>$${x.target_amount}</span></div>
                            <div style="font-size:0.7rem; color:var(--accent); margin-top:5px; font-weight:800">${x.priority_label || 'AWAITING ANALYTICS'}</div>
                            ${x.bio ? `<p style="font-size:0.6rem; opacity:0.6; margin-top:10px; line-clamp:2; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${x.bio}</p>` : ''}
                        </div>`).join('') || '<div style="padding:40px; text-align:center; opacity:0.5">NO TARGETS</div>'}
                    </div>
                    <button class="btn-primary" style="width:100%; margin-top:20px" onclick="openTargetModal('goal')">+ NEW TARGET</button>
                </div>
                <div class="card">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <h3 class="card-title">LIFESTYLE WANTS</h3>
                        <button class="ai-button" onclick="aiSort('want')">AI SORT</button>
                    </div>
                    <div id="want-list" style="margin-top:20px;">
                        ${wants.map(x => `<div class="card clickable-goal" onclick="openEditGoal(${x.id})" style="padding:20px; margin-bottom:10px; background:rgba(255,255,255,0.02); cursor:pointer;">
                            <div style="display:flex; justify-content:space-between;"><strong>${x.name}</strong> <span>$${x.target_amount}</span></div>
                            <div style="font-size:0.7rem; color:#5856D6; margin-top:5px; font-weight:800">${x.priority_label || 'AWAITING ANALYTICS'}</div>
                            ${x.bio ? `<p style="font-size:0.6rem; opacity:0.6; margin-top:10px; line-clamp:2; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">${x.bio}</p>` : ''}
                        </div>`).join('') || '<div style="padding:40px; text-align:center; opacity:0.5">NO WANTS</div>'}
                    </div>
                    <button class="btn-primary" style="width:100%; margin-top:20px" onclick="openTargetModal('want')">+ NEW WANT</button>
                </div>
            </div>
        `;
    },
    settings: async () => `<div class="card"><h3>CORE SYSTEM</h3><p class="secondary-text" style="margin-top:20px;">Hub Operational. Multi-device sync enabled.</p></div>`
};

const PageLogic = {
    shifts: () => {
        document.getElementById('save-shift').onclick = async () => {
            const data = { type: document.getElementById('shift-type').value, hours: parseFloat(document.getElementById('shift-hours').value||0), minutes: parseFloat(document.getElementById('shift-mins').value||0), date: document.getElementById('shift-date').value };
            await fetch('/api/shifts', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
            App.navigate('dashboard');
        };
        document.getElementById('save-man').onclick = async () => {
            const data = { amount: parseFloat(document.getElementById('man-amt').value), note: document.getElementById('man-note').value, date: document.getElementById('shift-date').value };
            await fetch('/api/shifts/manual', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
            App.navigate('dashboard');
        };
    },
    expenses: () => {
        document.getElementById('save-exp').onclick = async () => {
            const data = { name: document.getElementById('exp-name').value, amount: parseFloat(document.getElementById('exp-amt').value), category: document.getElementById('exp-cat').value, date: document.getElementById('exp-date').value };
            await fetch('/api/expenses', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify(data)});
            App.navigate('dashboard');
        };
    }
};

window.payShift = async (id) => { await fetch(`/api/shifts/pay/${id}`, {method:'POST'}); App.navigate('dashboard'); };
window.deleteShift = async (id) => { if(confirm('DELETE SHIFT?')) { await fetch(`/api/shifts/${id}`, {method:'DELETE'}); App.navigate('shifts'); } };
window.deleteTransaction = async (id, source) => {
    if(confirm('REMOVE FROM LEDGER?')) {
        const url = source === 'shift' ? `/api/shifts/${id}` : `/api/expenses/${id}`;
        await fetch(url, {method:'DELETE'});
        App.navigate('dashboard');
    }
};

window.aiSort = async (type) => { 
    document.getElementById(type === 'goal' ? 'goal-list' : 'want-list').style.opacity = '0.3';
    await fetch('/api/goals/sort', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({type})});
    App.navigate('goals');
};
window.openTargetModal = (type) => {
    App.activeType = type;
    document.getElementById('modal-goal-id').value = '';
    document.getElementById('modal-goal-name').value = '';
    document.getElementById('modal-goal-bio').value = '';
    document.getElementById('modal-goal-amt').value = '';
    document.getElementById('modal-goal-deadline').value = '';
    document.getElementById('modal-title').innerText = `AUTHORIZE ${type.toUpperCase()}`;
    document.getElementById('modal-delete-btn').style.display = 'none';
    document.getElementById('modal-recommendation').style.display = 'none';
    document.getElementById('goal-modal').classList.remove('hidden');
};

window.openEditGoal = (id) => {
    const goal = App.currentGoals.find(g => g.id === id);
    if (!goal) return;
    App.activeType = goal.type;
    document.getElementById('modal-goal-id').value = goal.id;
    document.getElementById('modal-goal-name').value = goal.name;
    document.getElementById('modal-goal-bio').value = goal.bio || '';
    document.getElementById('modal-goal-amt').value = goal.target_amount;
    document.getElementById('modal-goal-deadline').value = goal.deadline || '';
    document.getElementById('modal-title').innerText = `EDIT ${goal.type.toUpperCase()}`;
    document.getElementById('modal-delete-btn').style.display = 'block';
    
    // Calculate recommendation
    const recEl = document.getElementById('modal-recommendation');
    if (goal.deadline && goal.target_amount) {
        const days = (new Date(goal.deadline) - new Date()) / (86400000);
        const fortnights = days / 14;
        if (fortnights > 0) {
            const perFortnight = goal.target_amount / fortnights;
            recEl.innerText = `RECOMMENDED: $${perFortnight.toFixed(2)} / FORTNIGHT`;
            recEl.style.display = 'block';
        } else {
            recEl.style.display = 'none';
        }
    } else {
        recEl.style.display = 'none';
    }

    document.getElementById('goal-modal').classList.remove('hidden');
};

document.addEventListener('DOMContentLoaded', () => App.init());
