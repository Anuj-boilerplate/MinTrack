// State Management
const STATE_KEY = 'focusterm_state';

let state = {
    term: null, // { startDate, endDate }
    subjects: [], // { id, name, targetHours, validHours, totalDeficit, carryover, completed_today }
    activeSession: null, // { subjectId, startTime }
    last_updated_date: null
};

// DOM Elements
const screens = {
    setup: document.getElementById('setup-screen'),
    home: document.getElementById('home-screen'),
    timer: document.getElementById('timer-screen')
};
const modals = {
    addSubject: document.getElementById('add-subject-modal'),
    settings: document.getElementById('settings-modal'),
    pomodoro: document.getElementById('pomodoro-modal')
};

let pendingPomodoroSubjectId = null;

// Date Utilities
function getStartOfDay(date = new Date()) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
}

function getDaysLeft(currentDate, endDateString) {
    const end = getStartOfDay(new Date(endDateString));
    const current = getStartOfDay(currentDate);
    const diffTime = end - current;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

// Logic Initialization
function initState() {
    const saved = localStorage.getItem(STATE_KEY);
    if (saved) {
        state = JSON.parse(saved);
        processDailyUpdates();
    }
    renderRouter();
}

function saveState() {
    localStorage.setItem(STATE_KEY, JSON.stringify(state));
}

function processDailyUpdates() {
    if (!state.term) return;

    let loopDate = getStartOfDay(new Date(state.last_updated_date));
    const todayDate = getStartOfDay();

    let updated = false;

    // Run catch-up loop
    while (loopDate < todayDate) {
        for (let subject of state.subjects) {
            let daysLeft = getDaysLeft(loopDate, state.term.endDate);
            
            // Option B: Skip processing if term is over. 
            if (daysLeft <= 0) {
                subject.completed_today = 0;
                continue;
            }

            let required = (subject.targetHours - subject.validHours) / Math.max(1, daysLeft);
            let missed = Math.max(0, required - subject.completed_today);

            subject.totalDeficit += missed;
            subject.carryover += Math.min(missed, 1.5);
            
            // Reset daily completed for the new day
            subject.completed_today = 0;
        }

        loopDate.setDate(loopDate.getDate() + 1);
        state.last_updated_date = loopDate.toISOString();
        updated = true;
    }

    // Edge case if somehow the date goes backwards, forcefully fix
    if (getStartOfDay(new Date(state.last_updated_date)).getTime() !== todayDate.getTime()) {
        state.last_updated_date = todayDate.toISOString();
        updated = true;
    }

    if (updated) saveState();
}

// UI Router
function showScreen(screenName) {
    Object.values(screens).forEach(s => s.classList.add('hidden'));
    screens[screenName].classList.remove('hidden');
}

function renderRouter() {
    if (!state.term) {
        showScreen('setup');
    } else if (state.activeSession) {
        showScreen('timer');
        checkResumeOverlay();
        startTimerRender();
    } else {
        showScreen('home');
        renderHome();
    }
}

// Rendering
function renderHome() {
    const todayDate = getStartOfDay();
    const daysLeft = getDaysLeft(todayDate, state.term.endDate);
    
    const banner = document.getElementById('term-ended-banner');
    if (daysLeft < 0) {
        banner.classList.remove('hidden');
        document.getElementById('term-status').textContent = "Term Finished";
        document.getElementById('term-dates').textContent = `Ended on ${state.term.endDate}`;
        document.getElementById('add-subject-btn').classList.add('hidden');
    } else {
        banner.classList.add('hidden');
        document.getElementById('term-status').textContent = `${daysLeft} days remaining`;
        document.getElementById('term-dates').textContent = `${state.term.startDate} to ${state.term.endDate}`;
        document.getElementById('add-subject-btn').classList.remove('hidden');
    }

    const grid = document.getElementById('subjects-grid');
    grid.innerHTML = '';

    state.subjects.forEach(sub => {
        let dailyReq = 0;
        let todayGoalDisplay = "Term Ended";
        
        if (daysLeft >= 0) {
            dailyReq = (sub.targetHours - sub.validHours) / Math.max(1, daysLeft);
            const totalPressure = dailyReq + sub.carryover;
            todayGoalDisplay = `${totalPressure.toFixed(1)} hrs`;
        }

        const card = document.createElement('div');
        card.className = 'subject-card';
        card.innerHTML = `
            <div class="card-title">${sub.name}</div>
            <div class="stat-row">
                <span class="stat-label">Today's Goal:</span>
                <span class="stat-value" style="color: var(--accent)">${todayGoalDisplay}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Progress:</span>
                <span class="stat-value">${sub.validHours.toFixed(1)} / ${sub.targetHours}h</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Today's Focus:</span>
                <span class="stat-value">${sub.completed_today.toFixed(1)}h</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Carryover:</span>
                <span class="stat-value" style="color: var(--danger)">${sub.carryover.toFixed(1)}h</span>
            </div>
            <div class="card-actions">
                ${daysLeft >= 0 ? `<button class="primary-btn play-btn" data-id="${sub.id}">
                    ▶ Start Session
                </button>` : `<button class="secondary-btn" disabled>Finished</button>`}
            </div>
        `;
        grid.appendChild(card);
    });

    document.querySelectorAll('.play-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            pendingPomodoroSubjectId = e.target.dataset.id;
            modals.pomodoro.classList.remove('hidden');
        });
    });
}

document.getElementById('cancel-pomodoro-btn').addEventListener('click', () => {
    modals.pomodoro.classList.add('hidden');
    pendingPomodoroSubjectId = null;
});

document.getElementById('pomodoro-form').addEventListener('submit', (e) => {
    e.preventDefault();
    if (!pendingPomodoroSubjectId) return;
    
    startFocusSession(pendingPomodoroSubjectId, {
        focusLength: parseInt(document.getElementById('focus-len').value),
        breakLength: parseInt(document.getElementById('break-len').value),
        cycles: parseInt(document.getElementById('cycles-count').value)
    });
    
    modals.pomodoro.classList.add('hidden');
});

// Actions
document.getElementById('term-form').addEventListener('submit', (e) => {
    e.preventDefault();
    state.term = {
        startDate: document.getElementById('term-start').value,
        endDate: document.getElementById('term-end').value
    };
    state.last_updated_date = getStartOfDay().toISOString();
    saveState();
    renderRouter();
});

document.getElementById('add-subject-btn').addEventListener('click', () => {
    modals.addSubject.classList.remove('hidden');
});

document.getElementById('cancel-subject-btn').addEventListener('click', () => {
    modals.addSubject.classList.add('hidden');
});

document.getElementById('subject-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const sub = {
        id: Date.now().toString(),
        name: document.getElementById('subject-name').value,
        targetHours: parseFloat(document.getElementById('target-hours').value),
        validHours: 0,
        totalDeficit: 0,
        carryover: 0,
        completed_today: 0
    };
    state.subjects.push(sub);
    saveState();
    modals.addSubject.classList.add('hidden');
    e.target.reset();
    renderHome();
});

// Timer Logic
let timerInterval;

function startFocusSession(subjectId, uiSettings) {
    state.activeSession = {
        subjectId: subjectId,
        startTime: Date.now(),
        ui: uiSettings
    };
    saveState();
    renderRouter();
}

function startTimerRender() {
    const sub = state.subjects.find(s => s.id === state.activeSession.subjectId);
    document.getElementById('timer-subject-name').textContent = sub.name;
    
    updateTimerDisplay();
    // Only set interval once
    if (timerInterval) clearInterval(timerInterval);
    timerInterval = setInterval(updateTimerDisplay, 1000);
}

function checkResumeOverlay() {
    // If the app is opened/rendered and a timer has been running for a while
    const elapsed = Date.now() - state.activeSession.startTime;
    // We can assume if the user is rendering the router again, they just arrived
    // Instead of complex visibility API, just show the resume overlay on boot if session exists
    const overlay = document.getElementById('resume-overlay');
    if (elapsed > 1000) {
        overlay.classList.remove('hidden');
    }
}

document.getElementById('resume-btn').addEventListener('click', () => {
    document.getElementById('resume-overlay').classList.add('hidden');
});

function updateTimerDisplay() {
    if (!state.activeSession) return;
    const elapsedMs = Date.now() - state.activeSession.startTime;
    
    // Truth Layer raw fallback calculations (for simple timers without UI config)
    if (!state.activeSession.ui) {
        const totalSeconds = Math.floor(elapsedMs / 1000);
        const hrs = Math.floor(totalSeconds / 3600);
        const mins = Math.floor((totalSeconds % 3600) / 60);
        const secs = totalSeconds % 60;
        const timeStr = 
            String(hrs).padStart(2, '0') + ':' + 
            String(mins).padStart(2, '0') + ':' + 
            String(secs).padStart(2, '0');
        document.getElementById('timer-display').textContent = timeStr;
        return;
    }

    // Pomodoro Display Layer
    const fMs = state.activeSession.ui.focusLength * 60000;
    const bMs = state.activeSession.ui.breakLength * 60000;
    const cycleMs = fMs + bMs;
    const totalCycles = state.activeSession.ui.cycles;
    
    const currentCycle = Math.floor(elapsedMs / cycleMs);
    const timeInCycle = elapsedMs % cycleMs;
    
    let phase = "Focus Phase";
    let phaseClass = "focus-tag";
    let countdownMs = fMs - timeInCycle;
    
    const tagEl = document.getElementById('pomo-phase');
    const cycleEl = document.getElementById('pomo-cycle');

    if (timeInCycle >= fMs) {
        phase = "Break Phase";
        phaseClass = "break-tag";
        countdownMs = cycleMs - timeInCycle;
    }
    
    let cycleText = `Cycle ${currentCycle + 1} of ${totalCycles}`;
    
    if (currentCycle >= totalCycles) {
        phase = "Target Reached (Overtime)";
        phaseClass = "complete-tag";
        countdownMs = elapsedMs - (totalCycles * cycleMs); // starts counting up naturally
        cycleText = "Done";
    }

    // Assign UI
    tagEl.className = `phase-tag ${phaseClass}`;
    tagEl.textContent = phase;
    cycleEl.textContent = cycleText;

    // Time formatting
    const totalSecs = Math.floor(countdownMs / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    
    document.getElementById('timer-display').textContent = 
        String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

document.getElementById('stop-timer-btn').addEventListener('click', stopFocusSession);

function stopFocusSession() {
    clearInterval(timerInterval);
    const elapsedMs = Date.now() - state.activeSession.startTime;
    const hours = elapsedMs / (1000 * 60 * 60);
    
    // 15 min rule
    if (hours >= 0.25) {
        const sub = state.subjects.find(s => s.id === state.activeSession.subjectId);
        if (sub) {
            sub.validHours += hours;
            sub.completed_today += hours;
            // Cap total valid time at target to avoid negative required
            // Or allow overshooting? Letting valid hours exceed target isn't forbidden, but handled naturally.
            saveState();
        }
    } else {
        alert("Session was under 15 minutes and will not count towards valid progress.");
    }
    
    state.activeSession = null;
    saveState();
    renderRouter();
}

// Settings & Import/Export
document.getElementById('settings-btn').addEventListener('click', () => {
    modals.settings.classList.remove('hidden');
});

document.getElementById('close-settings-btn').addEventListener('click', () => {
    modals.settings.classList.add('hidden');
});

document.getElementById('clear-data-btn').addEventListener('click', () => {
    if (confirm("Are you sure? This will delete all tracking data.")) {
        localStorage.removeItem(STATE_KEY);
        location.reload();
    }
});

document.getElementById('export-data-btn').addEventListener('click', () => {
    const json = localStorage.getItem(STATE_KEY);
    if (!json) return alert("Nothing to export.");
    const blob = new Blob([json], {type: "application/json"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `focusterm_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
});

document.getElementById('import-file').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const content = evt.target.result;
            const parsed = JSON.parse(content);
            if (parsed && typeof parsed === 'object') {
                localStorage.setItem(STATE_KEY, JSON.stringify(parsed));
                location.reload();
            }
        } catch(err) {
            alert("Invalid backup file.");
        }
    };
    reader.readAsText(file);
});

// Boot
initState();
