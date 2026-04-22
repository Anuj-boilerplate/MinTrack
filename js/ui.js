let pendingPomodoroSubjectId = null;

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

    if (state.subjects.length > 0) {
        document.getElementById('term-progress-container').classList.remove('hidden');
        let totalTarget = 0, totalValid = 0;
        state.subjects.forEach(s => {
            totalTarget += s.targetHours;
            totalValid += s.validHours;
        });
        const globalPct = Math.min((totalValid / Math.max(1, totalTarget)) * 100, 100);
        document.getElementById('term-progress-fill').style.width = `${globalPct}%`;
        document.getElementById('term-progress-text').textContent = `${formatHoursToMins(totalValid)} / ${totalTarget}h`;
    } else {
        document.getElementById('term-progress-container').classList.add('hidden');
    }

    const grid = document.getElementById('subjects-grid');
    grid.innerHTML = '';

    let totalDailyReq = 0;
    let totalCompletedToday = 0;

    state.subjects.forEach(sub => {
        let dailyReq = 0;
        let todayGoalDisplay = "Term Ended";

        if (daysLeft >= 0) {
            dailyReq = Math.max(0, (sub.targetHours - sub.validHours) / Math.max(1, daysLeft));
            todayGoalDisplay = dailyReq;
            totalDailyReq += dailyReq;
        }

        totalCompletedToday += sub.completed_today;

        const pct = Math.min((sub.validHours / sub.targetHours) * 100, 100);

        const card = document.createElement('div');
        card.className = 'subject-card';
        card.innerHTML = `
            <div class="card-header">
                <div class="card-title">${sub.name}</div>
                <button class="card-edit-btn" data-id="${sub.id}" title="Edit Subject">⚙</button>
            </div>
            <div class="stat-row">
                <span class="stat-label">Today's Goal:</span>
                <span class="stat-value" style="color: var(--accent)">${typeof todayGoalDisplay === 'number' ? formatHoursToMins(todayGoalDisplay) : todayGoalDisplay}</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Progress:</span>
                <span class="stat-value">${formatHoursToMins(sub.validHours)} / ${sub.targetHours}h</span>
            </div>
            <div class="stat-row">
                <span class="stat-label">Today's Focus:</span>
                <span class="stat-value">${formatHoursToMins(sub.completed_today)}</span>
            </div>
            <div class="subject-progress-wrapper">
                <div class="progress-bar-bg">
                    <div class="progress-bar-fill" style="width: ${pct}%"></div>
                </div>
            </div>
            <div class="card-actions">
                ${daysLeft >= 0 ? `<button class="primary-btn play-btn" data-id="${sub.id}">
                    ▶ Start Session
                </button>` : `<button class="secondary-btn" disabled>Finished</button>`}
            </div>
        `;
        grid.appendChild(card);
    });

    if (daysLeft >= 0 && state.subjects.length > 0) {
        document.getElementById('daily-progress-container').classList.remove('hidden');
        const safeDailyReq = Math.max(0.01, totalDailyReq);
        const dailyPct = totalDailyReq === 0 ? 100 : Math.min((totalCompletedToday / safeDailyReq) * 100, 100);
        document.getElementById('daily-progress-fill').style.width = `${dailyPct}%`;
        document.getElementById('daily-progress-text').textContent = `${formatHoursToMins(totalCompletedToday)} / ${formatHoursToMins(totalDailyReq)}`;
    } else {
        document.getElementById('daily-progress-container').classList.add('hidden');
    }

    document.querySelectorAll('.play-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            pendingPomodoroSubjectId = e.currentTarget.dataset.id;
            modals.pomodoro.classList.remove('hidden');
        });
    });

    document.querySelectorAll('.card-edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const subjectId = e.currentTarget.dataset.id;
            const sub = state.subjects.find(s => s.id === subjectId);
            if (!sub) return;
            document.getElementById('edit-subject-id').value = sub.id;
            document.getElementById('edit-subject-name').value = sub.name;
            document.getElementById('edit-target-hours').value = sub.targetHours;

            document.getElementById('edit-discarded-time').textContent = formatHoursToMins(sub.discarded_time_total || 0);

            modals.editSubject.classList.remove('hidden');
        });
    });
}

// Session Review Handlers
document.getElementById('save-session-btn').addEventListener('click', () => {
    if (!pendingSessionReview) return;
    const { subjectId, hours } = pendingSessionReview;
    const sub = state.subjects.find(s => s.id === subjectId);
    if (sub) {
        sub.validHours += hours;
        sub.completed_today += hours;
        saveState();
    }
    pendingSessionReview = null;
    modals.sessionReview.classList.add('hidden');
    renderHome();
});

document.getElementById('discard-session-btn').addEventListener('click', () => {
    if (!pendingSessionReview) return;
    const { subjectId, hours } = pendingSessionReview;
    const sub = state.subjects.find(s => s.id === subjectId);
    if (sub) {
        sub.discarded_time_total += hours;
        sub.discarded_time_today += hours;
        saveState();
    }
    pendingSessionReview = null;
    modals.sessionReview.classList.add('hidden');
    renderHome();
});

// Other Actions
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
        completed_today: 0,
        discarded_time_total: 0,
        discarded_time_today: 0
    };
    state.subjects.push(sub);
    saveState();
    modals.addSubject.classList.add('hidden');
    e.target.reset();
    renderHome();
});

document.getElementById('cancel-edit-subject-btn').addEventListener('click', () => {
    modals.editSubject.classList.add('hidden');
});

document.getElementById('edit-subject-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('edit-subject-id').value;
    const sub = state.subjects.find(s => s.id === id);
    if (!sub) return;

    sub.name = document.getElementById('edit-subject-name').value;
    const newTarget = parseFloat(document.getElementById('edit-target-hours').value);
    sub.targetHours = Math.max(newTarget, sub.validHours, 1);

    saveState();
    modals.editSubject.classList.add('hidden');
    renderHome();
});

document.getElementById('delete-subject-btn').addEventListener('click', () => {
    const id = document.getElementById('edit-subject-id').value;
    const sub = state.subjects.find(s => s.id === id);
    if (!sub) return;

    if (confirm(`Are you sure you want to delete ${sub.name}?`)) {
        state.subjects = state.subjects.filter(s => s.id !== id);
        saveState();
        modals.editSubject.classList.add('hidden');
        renderHome();
    }
});

const btnLog = document.getElementById('log-session-btn');
if (btnLog) {
    btnLog.addEventListener('click', () => {
        if (!state.term) return alert("Please set up a term first.");
        const select = document.getElementById('manual-log-subject');
        select.innerHTML = '';
        state.subjects.forEach(s => {
            const opt = document.createElement('option');
            opt.value = s.id;
            opt.textContent = s.name;
            select.appendChild(opt);
        });

        if (state.subjects.length === 0) return alert("Add a subject first.");
        modals.manualLog.classList.remove('hidden');
    });
}

document.getElementById('cancel-manual-log-btn').addEventListener('click', () => {
    modals.manualLog.classList.add('hidden');
});

document.getElementById('manual-log-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const subjectId = document.getElementById('manual-log-subject').value;
    const sub = state.subjects.find(s => s.id === subjectId);
    if (!sub) return;

    const startVal = document.getElementById('manual-start-time').value;
    const endVal = document.getElementById('manual-end-time').value;

    const [sh, sm] = startVal.split(':').map(Number);
    const [eh, em] = endVal.split(':').map(Number);

    let startMins = sh * 60 + sm;
    let endMins = eh * 60 + em;

    if (endMins < startMins) {
        endMins += 24 * 60;
    }

    const durationMins = endMins - startMins;

    if (durationMins < 15) {
        return alert("Session was under 15 minutes and will not count towards valid progress.");
    }

    const durationHours = durationMins / 60;
    sub.validHours += durationHours;
    sub.completed_today += durationHours;

    saveState();
    modals.manualLog.classList.add('hidden');
    e.target.reset();
    renderHome();
});

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
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mintrack_backup_${new Date().toISOString().split('T')[0]}.json`;
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
        } catch (err) {
            alert("Invalid backup file.");
        }
    };
    reader.readAsText(file);
});
