// State Management
const STATE_KEY = 'mintrack_state';

let state = {
    term: null, // { startDate, endDate }
    subjects: [], // { id, name, targetHours, validHours, totalDeficit, carryover, completed_today, discarded_time_total, discarded_time_today }
    activeSession: null, // { subjectId, startTime }
    last_updated_date: null
};

// Data patching on boot
function patchState() {
    state.subjects.forEach(sub => {
        if (typeof sub.discarded_time_total === 'undefined') sub.discarded_time_total = 0;
        if (typeof sub.discarded_time_today === 'undefined') sub.discarded_time_today = 0;
    });
}

function initState() {
    const saved = localStorage.getItem(STATE_KEY);
    if (saved) {
        state = JSON.parse(saved);
        patchState();
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

            if (daysLeft <= 0) {
                subject.completed_today = 0;
                subject.discarded_time_today = 0;
                continue;
            }

            let required = (subject.targetHours - subject.validHours) / Math.max(1, daysLeft);
            let missed = Math.max(0, required - subject.completed_today);

            subject.totalDeficit += missed;
            subject.carryover += Math.min(missed, 1.5);

            // Reset daily completed
            subject.completed_today = 0;
            subject.discarded_time_today = 0;
        }

        loopDate.setDate(loopDate.getDate() + 1);
        state.last_updated_date = loopDate.toISOString();
        updated = true;
    }

    if (getStartOfDay(new Date(state.last_updated_date)).getTime() !== todayDate.getTime()) {
        state.last_updated_date = todayDate.toISOString();
        updated = true;
    }

    if (updated) saveState();
}
