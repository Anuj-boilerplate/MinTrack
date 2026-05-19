export const CHANGELOG = [
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
