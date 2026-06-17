import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const TABS = [
  { id: 'goals', label: 'Goals' },
  { id: 'todo', label: 'To-Do' },
  { id: 'analytics', label: 'Analytics' }
];

export default function Navbar({ activeTab, onTabChange }) {
  const containerRef = useRef(null);
  const tabRefs = useRef({});
  const [lensStyle, setLensStyle] = useState({ left: 0, width: 0, opacity: 0 });

  useEffect(() => {
    const updateLens = () => {
      const activeTabEl = tabRefs.current[activeTab];
      const containerEl = containerRef.current;
      if (activeTabEl && containerEl) {
        const activeRect = activeTabEl.getBoundingClientRect();
        const containerRect = containerEl.getBoundingClientRect();

        const left = activeRect.left - containerRect.left;
        const width = activeRect.width;

        setLensStyle({
          left,
          width,
          opacity: 1
        });
      }
    };

    updateLens();
    window.addEventListener('resize', updateLens);
    return () => window.removeEventListener('resize', updateLens);
  }, [activeTab]);

  return (
    <motion.nav
      className="floating-navbar-container"
      initial={{ y: '120px', opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: '120px', opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
    >
      <div className="floating-navbar" ref={containerRef}>
        {/* Animated Lens Slider */}
        <div
          className="nav-lens"
          style={{
            transform: `translate3d(${lensStyle.left}px, -50%, 0)`,
            width: `${lensStyle.width}px`,
            opacity: lensStyle.opacity,
          }}
        />

        {/* Tab Buttons */}
        {TABS.map((tab) => (
          <button
            key={tab.id}
            ref={(el) => { tabRefs.current[tab.id] = el; }}
            className={`nav-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
            type="button"
          >
            {tab.label}
          </button>
        ))}
      </div>
    </motion.nav>
  );
}
