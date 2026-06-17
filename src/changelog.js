export const CHANGELOG = [
  {
    version: '2.0',
    date: '2026-06-17',
    changes: [
      {
        title: "Cinematic Goal Cards (Coverflow)",
        description: "The entire Goals tab has been rebuilt from scratch. Subject cards now sit in a 3D coverflow carousel — swipe or drag to flip between goals. Cards fan out in perspective, scale and fade by distance, and snap with a spring animation. An entrance sweep plays every time you open the tab."
      },
      {
        title: "Long-Press to Edit",
        description: "Hold down on the active goal card to enter edit mode directly on the card. Rename your goal, adjust target hours with +/− steppers, and update the deadline — all without leaving the Goals tab. Tap outside to dismiss cleanly."
      },
      {
        title: "Inline Session Logging",
        description: "Each goal card now contains a built-in log session form. Tap '+ Log session' to reveal a date, start-time, and end-time picker right on the card. The duration is calculated live as you type, and the session is committed without opening any modal."
      },
      {
        title: "Per-Goal Accent Colors",
        description: "Tap the ··· button on any goal card to open an inline 8-color palette. The chosen accent propagates through the card's title, progress bar, section labels, and CTA buttons — in both dark and light themes."
      },
      {
        title: "To-Do Tab",
        description: "A brand-new To-Do screen is now accessible from the navigation bar. Tasks are grouped by goal in a masonry card layout with Today and Backlog sections. Tasks can be added inline with a name, note, deadline, and priority level. Drag a backlog item to Today with a single tap."
      },
      {
        title: "Task Priority System",
        description: "Every task carries a Low / Medium / High priority. Priority is visualised as a coloured vertical rule to the left of each task, with opacity reflecting importance — subtle for low, full strength for high."
      },
      {
        title: "Floating Pill Navbar",
        description: "The bottom navigation has been redesigned as a floating glass pill with a sliding lens indicator that animates smoothly between tabs. The pill springs in from below on app launch via Framer Motion."
      },
      {
        title: "Persistent Top Bar",
        description: "A slim top bar now appears across all screens, housing the MinTrack wordmark, the light/dark theme toggle, and the settings button — keeping key controls always reachable."
      },
      {
        title: "Cinematic Theme Transition",
        description: "Switching between dark and light mode now triggers a hand-crafted canvas animation: a diagonal ink wave sweeps across the screen with a sine wobble and film-grain texture, then dissolves as the new theme settles underneath."
      },
      {
        title: "Warm Paper Light Mode (Refined)",
        description: "The light theme has been deeply tuned: parchment backgrounds, espresso ink typography, soft sepia hairlines, and theme-aware accent colors that are richer in dark mode and more muted on paper."
      },
      {
        title: "Recent Sessions on Goal Cards",
        description: "The active goal card surfaces the three most recent study sessions directly — date, duration — so you can see momentum at a glance without navigating anywhere."
      },
      {
        title: "Mobile-First Responsive Overhaul",
        description: "All three tabs are now properly tuned for small screens. On mobile, goal cards are taller and less cramped, the coverflow is zoomed to fit, the To-Do masonry collapses to a single column, and form inputs respect the light-mode colour palette throughout."
      },
      {
        title: "Analytics Tab Placeholder",
        description: "A dedicated Analytics tab has been added to the navigation. Full charts and insights are coming in a future release."
      }
    ]
  },
  {
    version: '1.4.5',
    date: '2026-06-06',
    changes: [
      {
        title: "Stutter-Free Modal Transitions",
        description: "Optimized modal and screen transitions to run with hardware acceleration. Removed heavy background CSS blur filters and added a smooth backdrop fade-in."
      },
      {
        title: "Warm Paper Light Theme",
        description: "Redesigned the light mode to use a warm ivory paper look, comfortable espresso text, and soft sepia pencil borders to reduce eye strain."
      },
      {
        title: "Robust Sync Queue",
        description: "Fixed sync loop failures on duplicate session uploads using server-side upserts, and debounced sync triggers to save battery and network bandwidth."
      }
    ]
  },
  {
    version: '1.4.4',
    date: '2026-06-03',
    changes: [
      {
        title: "Custom Date Picker",
        description: "Replaced the browser's native date picker with a fully custom calendar, complete with month navigation, current day highlight, and smooth animations."
      },
      {
        title: "Target Hours Stepper",
        description: "Added holding auto-repeat stepper buttons to the Target Hours field in the Add and Edit Subject modals, matching the snappy interaction feel of the Pomodoro session configurator."
      }
    ]
  },
  {
    version: '1.4.3',
    date: '2026-06-01',
    changes: [
      {
        title: "Subject Card Interactions",
        description: "Added active pointer hover styling on all user-defined subject cards."
      },
      {
        title: "Upgraded Pomodoro Settings",
        description: "Refined the session modal with snappy preset radio cards, dynamic morph transitions, and holding auto-repeat steppers."
      },
      {
        title: "Removed Weekly Heatmap",
        description: "Removed the cosmetic activity heatmap. A new "
      },
      {
        title: "Branded Setup Screen",
        description: "Polished Setup Screen typography and integrated the official Mintrack wordmark and tags."
      },
      {
        title: "Retired Legacy Backups",
        description: "Removed redundant JSON import and export options, relying fully on secure cloud syncing."
      }
    ]
  },
  {
    version: '1.4.2',
    date: '2026-05-30',
    changes: [
      {
        title: "Added Custom Deadlines",
        description: "Be more in control of your tasks with the new 'Custom Deadlines' feature. The app will suggest you daily targets based on these deadlines allowing you to focus on what truly matters."
      }
    ]
  },
  {
    version: '1.4.1',
    date: '2026-05-19',
    changes: [
      {
        title: "More Robust Offline Queing",
        description: "Offline CRUD support is now extended to subjects as well, handled by an extremely robust request queing system."
      },
      {
        title: "Term Creation Issue Addressed",
        description: "Term Creation will not be corrupted by zombie data not deleted due to previously absent queing of CRUD requests."
      }
    ]
  },
  {
    version: '1.4',
    date: '2026-05-19',
    changes: [
      {
        title: 'Removal of restrictive logic',
        description: "Removed the forced 15-minute behavior. The app should respect your flow, not dictate it."
      },
      {
        title: 'Pause Button Fix',
        description: "Fixed a bug where the pause state wasn't correctly persisting during active sessions."
      },
      {
        title: 'UI Polish',
        description: "Adjusted modal dimensions for better readability across different screen sizes."
      }
    ]
  },
  {
    version: '1.3',
    date: '2026-05-10',
    changes: [
      {
        title: 'Offline Sync',
        description: "Added a robust action queue to ensure your changes are saved even when the internet drops."
      }
    ]
  }
];
