export const CHANGELOG = [
  {
    version: '1.4.2',
    date: '2026-05-30',
    changes:[
      {
      title: "Added Custom Deadlines",
      description:"Be more in control of your tasks with the new 'Custom Deadlines' feature. The app will suggest you daily targets based on these deadlines allowing you to focus on what truly matters."
      }
    ]
  },
  {
    version: '1.4.1',
    date: '2026-05-19',
    changes:[
      {
      title: "More Robust Offline Queing",
      description:"Offline CRUD support is now extended to subjects as well, handled by an extremely robust request queing system."
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
