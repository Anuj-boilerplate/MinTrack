import { useEffect } from 'react';

const ITEMS = [
  { path: '/today', label: 'Today', icon: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></> },
  { path: '/goals', label: 'Goals', icon: <><path d="M4 19V5" /><path d="M4 19h16" /><path d="m7 15 4-4 3 2 5-6" /><path d="M19 7v4h-4" /></> },
  { path: '/tasks', label: 'To-Do', icon: <><rect x="4" y="4" width="16" height="16" rx="3" /><path d="m8 12 2.5 2.5L16 9" /></> },
  { path: '/sessions', label: 'Sessions', icon: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l4 2" /></> },
  { path: '/insights', label: 'Insights', icon: <><path d="M4 19V5" /><path d="M4 19h16" /><path d="M8 15v-3M12 15V8M16 15v-5" /></> },
  { path: '/terms', label: 'Terms', icon: <><path d="M5 5.5A2.5 2.5 0 0 1 7.5 3H20v17H7.5A2.5 2.5 0 0 1 5 17.5z" /><path d="M5 6h12M9 10h7M9 14h5" /></> },
];

const SETTINGS = { path: '/settings', label: 'Settings', icon: <><circle cx="12" cy="12" r="3" /><path d="m19.4 15 .1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-2.8 1.2v.2a2 2 0 1 1-4 0V19a1.7 1.7 0 0 0-2.8-1.2l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1A1.7 1.7 0 0 0 3 12.2H3a2 2 0 1 1 0-4h.2A1.7 1.7 0 0 0 4.4 5.4l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1A1.7 1.7 0 0 0 10 1.4v-.2a2 2 0 1 1 4 0v.2a1.7 1.7 0 0 0 2.8 1.2l.1-.1a2 2 0 1 1 2.8 2.8l.1.1a1.7 1.7 0 0 0 1.2 2.8h.2a2 2 0 1 1 0 4h-.2a1.7 1.7 0 0 0-1.2 2.8Z" transform="translate(0 1) scale(.92)" /></> };

function NavIcon({ children }) {
  return <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{children}</svg>;
}

export default function AppSidebar({ route, navigate, expanded, pinned, onExpandedChange, onHoverChange }) {
  const currentPath = route.split('?')[0];
  const isActive = path => path === '/today' ? currentPath === path : currentPath === path || currentPath.startsWith(`${path}/`);

  useEffect(() => {
    if (!expanded) return undefined;
    const closeOnEscape = event => {
      if (event.key === 'Escape') {
        onHoverChange(false);
        onExpandedChange(false);
      }
    };
    window.addEventListener('keydown', closeOnEscape);
    return () => window.removeEventListener('keydown', closeOnEscape);
  }, [expanded, onExpandedChange, onHoverChange]);

  const choose = path => {
    navigate(path);
    onExpandedChange(false);
  };

  const handleMouseEnter = () => {
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) onHoverChange(true);
  };

  const toggleExpanded = () => {
    onHoverChange(false);
    onExpandedChange(!pinned);
  };

  const renderItem = item => (
    <button key={item.path} type="button" className={`rail-icon-btn${isActive(item.path) ? ' is-active' : ''}`} aria-label={item.label} aria-current={isActive(item.path) ? 'page' : undefined} title={expanded ? undefined : item.label} onClick={() => choose(item.path)}>
      <span className="rail-icon-slot"><NavIcon>{item.icon}</NavIcon></span><span className="rail-item-label">{item.label}</span>
    </button>
  );

  return (
    <div className={`sidebar-shell${expanded ? ' is-expanded' : ''}`} onMouseEnter={handleMouseEnter} onMouseLeave={() => onHoverChange(false)}>
      <aside id="rail-expanded-navigation" className="app-rail" aria-label="Main navigation">
        <div className="rail-brand-row">
          <button type="button" className="rail-expand-btn" aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'} aria-expanded={expanded} aria-controls="rail-expanded-navigation" onClick={toggleExpanded}>
            <span className="rail-icon-slot"><NavIcon>{expanded ? <path d="m15 18-6-6 6-6" /> : <><path d="M4 6h16M4 12h16M4 18h16" /></>}</NavIcon></span>
          </button>
        </div>
        <nav className="rail-icons" aria-label="Screens">{ITEMS.map(renderItem)}</nav>
        <div className="rail-bottom">{renderItem(SETTINGS)}</div>
      </aside>
    </div>
  );
}
