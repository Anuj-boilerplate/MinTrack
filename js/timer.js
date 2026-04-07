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
    const elapsed = Date.now() - state.activeSession.startTime;
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

    const sub = state.subjects.find(s => s.id === state.activeSession.subjectId);
    if (sub && state.term) {
        const daysLeft = getDaysLeft(getStartOfDay(), state.term.endDate);
        const dailyReq = daysLeft >= 0 ? (sub.targetHours - sub.validHours) / Math.max(1, daysLeft) : 0;
        const totalPressure = dailyReq + sub.carryover;

        let sessionElapsedHours = elapsedMs / (1000 * 60 * 60);
        let currentCompleted = sub.completed_today + sessionElapsedHours;

        let progressPct = 0;
        if (totalPressure > 0) {
            progressPct = Math.min((currentCompleted / totalPressure) * 100, 100);
        }

        const fillEl = document.getElementById('timer-daily-fill');
        fillEl.style.width = `${progressPct}%`;
        if (progressPct >= 100) {
            fillEl.style.background = "var(--success)";
        } else {
            fillEl.style.background = "var(--accent)";
        }
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
        countdownMs = elapsedMs - (totalCycles * cycleMs);
        cycleText = "Done";
    }

    tagEl.className = `phase-tag ${phaseClass}`;
    tagEl.textContent = phase;
    cycleEl.textContent = cycleText;

    const totalSecs = Math.floor(countdownMs / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;

    document.getElementById('timer-display').textContent =
        String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

// Global for session review
let pendingSessionReview = null;

document.getElementById('stop-timer-btn').addEventListener('click', stopFocusSession);

function stopFocusSession() {
    clearInterval(timerInterval);
    const elapsedMs = Date.now() - state.activeSession.startTime;
    const hours = elapsedMs / (1000 * 60 * 60);
    
    const subjectId = state.activeSession.subjectId;
    
    // Clear active session immediately so router goes home, but show modal if >= 15
    state.activeSession = null;
    saveState();
    renderRouter();
    
    const sub = state.subjects.find(s => s.id === subjectId);
    if (!sub) return;

    if (hours < 0.25) {
        // Less than 15 minutes: Auto discard
        sub.discarded_time_total += hours;
        sub.discarded_time_today += hours;
        saveState();
        renderHome();
    } else {
        // Show review modal
        pendingSessionReview = { subjectId, hours };
        document.getElementById('review-subject').textContent = sub.name;
        document.getElementById('review-duration').textContent = formatHoursToMins(hours);
        modals.sessionReview.classList.remove('hidden');
    }
}
