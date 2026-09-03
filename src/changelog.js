

export const CHANGELOG = [
  {
    version: '2.5.2',
    date: '2026-09-03',
    changes: [
      {
        title: "Independent Recurring Tasks",
        description: "Completing a repeating task (like doing daily Leetcode) on Monday no longer checks it off for the entire week. Recurring tasks now materialize as independent instances for every scheduled day — so each day gets its own honest checkmark, its own completed trail, and untouched future days."
      }
    ]
  },
  {
    version: '2.5.1',
    date: '2026-08-10',
    changes: [
      {
        title: "Visible Google Calendar Connection Errors",
        description: "If connecting your Google Calendar fails, the Settings panel now shows the exact reason — missing credentials, expired one-time codes, or auth problems — instead of silently doing nothing."
      }
    ]
  },
  {
    version: '2.5.0',
    date: '2026-08-09',
    changes: [
      {
        title: "Two-Way Calendar Sync",
        description: "Every scheduled task now appears in your Google Calendar instantly — edits, reschedules, and completions mirror automatically, and recurring tasks become recurring calendar events. Events you create natively in Google show up in the runway within 30 seconds. No more manual add buttons."
      }
    ]
  },
  {
    version: '2.4.0',
    date: '2026-08-09',
    changes: [
      {
        title: "Google Calendar Integration",
        description: "Connect your Google Calendar from Settings to see your busy days as blue markers across the runway, browse events on each active day, and push task deadlines straight into your calendar with one tap."
      },
      {
        title: "Sign in with Google",
        description: "You can now sign in with Google instead of a magic link. If the email matches an existing account, your tasks and history carry over automatically."
      }
    ]
  },
  {
    version: '2.3.0',
    date: '2026-08-08',
    changes: [
      {
        title: "Tasks, decoupled from Goals",
        description: "Tasks are now their own thing. They carry their own user-level ownership, show neutral glass styling instead of goal colors, and the goal picker is gone from the task form. The Pomodoro task dropdown now lists every unfinished task."
      },
      {
        title: "Unified Task Form & Chips",
        description: "Desktop and mobile now share the same TaskForm, TaskChip, and completed-trail components — so mobile no longer miss the deadline picker, recurrence selector, or the delete button."
      },
      {
        title: "Inline Edit & Reschedule",
        description: "Tap any task title to rename it in place. Hover the arrow on desktop (tap on mobile) to move a task to tomorrow or a full date of your choice."
      },
      {
        title: "Undo Delete (Mobile)",
        description: "Deleting on mobile now hides the task and shows a 4-second undo toast before committing, so a slip is never permanent."
      },
      {
        title: "Completed Trail on Mobile",
        description: "Mobile runways now show the 'All done ✦' / N Completed trail, same as desktop."
      },
      {
        title: "Removed Task Priority",
        description: "Priority was collected and stored but never displayed. It has been stripped from creation, state, and sync."
      },
      {
        title: "Sync Fixes",
        description: "Note and deadline now sync to the cloud (they were silently dropped before), title edits sync immediately, and todos are scoped per-user with row-level security."
      }
    ]
  },
  {
    version: '2.2.0',
    date: '2026-07-05',
    changes: [
      {
        title: "To-Do Overhaul",
        description: "Complete overhaul of the way to do list works, allowing for complete freedom in scheduling tasks."
      },
      {
        title: "Date Navigation Bounds",
        description: "Clamped the date navigation in both Desktop and Mobile views so you can no longer scroll indefinitely past the active term boundaries."
      },
      {
        title: "Recurring tasks",
        description: "Following GTD Principles, You can now schedule recurring tasks. I hope you like the new features :D!"
      }
    ]
  },
  {
    version: '2.1.1',
    date: '2026-07-01',
    changes: [
      {
        title: "The Digest",
        description: "It just sounds cooler, like come on I don't wanna know any 'Analytics', give me the 'Digest' 😋"
      },
      {
        title: "Days Remaining Card",
        description: "Removed this in the 2.0 update because I just didn't know where to put it in the UI after I was done updating it, Here it is."
      },
      {
        title: "Behaviour-Derived Daily Average",
        description: "It's my favourite card of all, It gives you a one-look rundown about everything you need to know of your consistency."
      },
      {
        title: "Cumulative Hours Chart",
        description: "Cool graph that helps you visualize where your progress is at. Solid line is your actual progress, Dashed line is what could've been if you were consistent. Look at the gap to find out how far away you are from your goals"
      },
      {
        title: "Frozen Daily Target Snapshot",
        description: "The daily required hours shown on each goal card is now frozen at midnight and only recalculates the next day. This prevents the target from shifting downward as you make progress mid-session, giving you a stable goal to work toward all day."
      }
    ]
  },
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
