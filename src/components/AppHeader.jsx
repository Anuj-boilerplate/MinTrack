import MinTrackMark from './MinTrackMark';
import { useStateContext } from '../contexts/StateContext';

const PAGE_TITLES = {
  '/today': 'Today', '/goals': 'Goals', '/goals/new': 'New goal',
  '/goals/edit': 'Edit goal', '/goals/color': 'Goal color', '/goals/color/custom': 'Custom goal color',
  '/tasks': 'Today', '/sessions': 'Sessions', '/insights': 'Insights',
  '/sessions/new': 'Log study time',
  '/terms': 'Terms', '/settings': 'Settings', '/timer/setup': 'Focus session',
  '/timer/review': 'Review session', '/timer': 'Focus session', '/updates': 'What’s new'
};

export default function AppHeader({ route, navigate }) {
  const { state } = useStateContext();
  const routeKey = route.split('?')[0];
  const title = PAGE_TITLES[routeKey] || 'MinTrack';

  return (
    <header className="app-header">
      <div className="app-header-title">
        <MinTrackMark size={32} className="header-mark" />
        <span className="header-page-name">{title}</span>
      </div>
      <div className="app-header-actions">
        {state.activeSession && (
          <button type="button" className="header-timer-status" onClick={() => navigate(state.activeSession.status === 'review' ? '/timer/review' : '/timer')}>
            <span className="timer-status-dot" />{state.activeSession.status === 'review' ? 'Review session' : 'Timer running'}
          </button>
        )}
      </div>
    </header>
  );
}
