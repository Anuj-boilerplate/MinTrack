// Theme Initialization
const themeToggleBtn = document.getElementById('theme-toggle-btn');
const savedTheme = localStorage.getItem('theme') || 'dark';
document.documentElement.setAttribute('data-theme', savedTheme);

if (themeToggleBtn) {
    themeToggleBtn.addEventListener('click', () => {
        let current = document.documentElement.getAttribute('data-theme');
        let next = current === 'dark' ? 'light' : 'dark';
        
        const applyTheme = () => {
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
        };

        if (document.startViewTransition) {
            document.documentElement.classList.add(`switching-to-${next}`);
            
            const transition = document.startViewTransition(applyTheme);
            
            transition.finished.then(() => {
                document.documentElement.classList.remove(`switching-to-${next}`);
            });
        } else {
            applyTheme();
        }
    });
}

// Update Changelog Logic
const APP_VERSION = "1.1";
const updateModal = document.getElementById('update-modal');
const closeBtn = document.getElementById('close-update-btn');
const dismissBtn = document.getElementById('dismiss-update-btn');

if (!localStorage.getItem(`seen_update_${APP_VERSION}`)) {
    // Show modal if not seen
    updateModal.classList.remove('hidden');
    
    // Function to dismiss and remember
    const dismissUpdate = () => {
        updateModal.classList.add('hidden');
        localStorage.setItem(`seen_update_${APP_VERSION}`, "true");
    };

    closeBtn.addEventListener('click', dismissUpdate);
    dismissBtn.addEventListener('click', dismissUpdate);
}

// Boot
initState();
