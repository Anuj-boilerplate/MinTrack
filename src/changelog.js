export const CHANGELOG = [
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
