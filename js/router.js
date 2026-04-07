// DOM Elements
const screens = {
    setup: document.getElementById('setup-screen'),
    home: document.getElementById('home-screen'),
    timer: document.getElementById('timer-screen')
};

const modals = {
    addSubject: document.getElementById('add-subject-modal'),
    settings: document.getElementById('settings-modal'),
    pomodoro: document.getElementById('pomodoro-modal'),
    editSubject: document.getElementById('edit-subject-modal'),
    manualLog: document.getElementById('manual-log-modal'),
    sessionReview: document.getElementById('session-review-modal')
};

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
