import { useState } from 'react';
import { useStateContext } from '../../contexts/StateContext';
import { getAccentColor } from '../../utils';

const GOAL_COLORS = [
  { name: 'Royal Violet', hex: '#7652ed' },
  { name: 'Cobalt Blue', hex: '#2563eb' },
  { name: 'Berry', hex: '#c13b77' },
  { name: 'Coral', hex: '#df5c63' },
  { name: 'Amber', hex: '#bd7c20' },
  { name: 'Teal', hex: '#168b92' },
  { name: 'Sage', hex: '#64856d' },
  { name: 'Slate', hex: '#59647e' }
];

function hexToHsv(hex) {
  const value = hex.replace('#', '');
  const r = parseInt(value.slice(0, 2), 16) / 255;
  const g = parseInt(value.slice(2, 4), 16) / 255;
  const b = parseInt(value.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const delta = max - min;
  let hue = 0;
  if (delta) {
    if (max === r) hue = 60 * (((g - b) / delta) % 6);
    else if (max === g) hue = 60 * ((b - r) / delta + 2);
    else hue = 60 * ((r - g) / delta + 4);
  }
  return { hue: (hue + 360) % 360, saturation: max ? (delta / max) * 100 : 0, value: max * 100 };
}

function hsvToHex(hue, saturation, value) {
  const s = saturation / 100;
  const v = value / 100;
  const chroma = v * s;
  const section = hue / 60;
  const x = chroma * (1 - Math.abs((section % 2) - 1));
  const [r1, g1, b1] = section < 1 ? [chroma, x, 0]
    : section < 2 ? [x, chroma, 0]
      : section < 3 ? [0, chroma, x]
        : section < 4 ? [0, x, chroma]
          : section < 5 ? [x, 0, chroma] : [chroma, 0, x];
  const m = v - chroma;
  return `#${[r1, g1, b1].map(channel => Math.round((channel + m) * 255).toString(16).padStart(2, '0')).join('')}`;
}

export default function GoalColorScreen({ goal, isCustom, onSaveColor, onBack, onDone, onCustom }) {
  const { theme } = useStateContext();
  const [color, setColor] = useState(() => hexToHsv(goal?.accentColor || '#7652ed'));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  if (!goal) return <section className="page-content"><div className="empty-state"><h2>Goal not found</h2><button type="button" className="text-action" onClick={onBack}>Back to goals</button></div></section>;

  const isLight = theme === 'light';
  const customHex = hsvToHex(color.hue, color.saturation, color.value);
  const updateHueFromPointer = event => {
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = event.clientX - rect.left - rect.width / 2;
    const dy = event.clientY - rect.top - rect.height / 2;
    setColor(current => ({ ...current, hue: (Math.atan2(dy, dx) * 180 / Math.PI + 90 + 360) % 360 }));
  };
  const applyColor = async hex => {
    setSaving(true);
    setError('');
    try {
      const saved = await onSaveColor(goal.id, hex);
      if (!saved) setError('Could not save this color. Please try again.');
      else onDone();
    } finally {
      setSaving(false);
    }
  };
  const handleWheelKeyDown = event => {
    const steps = event.shiftKey ? 10 : 1;
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault();
      setColor(current => ({ ...current, hue: (current.hue + steps) % 360 }));
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault();
      setColor(current => ({ ...current, hue: (current.hue - steps + 360) % 360 }));
    } else if (event.key === 'Home') setColor(current => ({ ...current, hue: 0 }));
    else if (event.key === 'End') setColor(current => ({ ...current, hue: 359 }));
  };

  return (
    <section className="page-content goal-color-page">
      <div className="page-heading-row">
        <div>
          <p className="eyebrow">{isCustom ? 'Step 2 of 2' : 'Step 1 of 2'} · {goal.name}</p>
          <h1 className="page-title">{isCustom ? 'Custom goal color' : 'Choose a goal color'}</h1>
          <p className="page-description">{isCustom ? 'Choose a hue and preview it on your goal before applying.' : 'Pick a coordinated preset, or create your own color.'}</p>
        </div>
        <button type="button" className="quiet-button" onClick={onBack}>{isCustom ? 'Back to colors' : 'Back to goal'}</button>
      </div>

      {!isCustom ? (
        <div className="goal-palette-panel">
          <div className="goal-palette-grid" role="group" aria-label="Preset goal colors">
            {GOAL_COLORS.map(item => {
              const selected = getAccentColor(item.hex, isLight) === goal.accentColor;
              return (
                <button key={item.hex} type="button" className="goal-palette-option" aria-pressed={selected} disabled={saving} onClick={() => applyColor(item.hex)}>
                  <span className="goal-palette-swatch" style={{ backgroundColor: getAccentColor(item.hex, isLight) }} aria-hidden="true">
                    {selected && <svg aria-hidden="true" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m5 12 4 4L19 6" /></svg>}
                  </span>
                  <span>{item.name}</span>
                  {selected && <small>Current</small>}
                </button>
              );
            })}
            <button type="button" className="goal-custom-option" onClick={onCustom}>
              <span className="goal-custom-icon" aria-hidden="true"><svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 3a9 9 0 0 1 9 9h-9z" /><path d="M12 12 5.6 5.6" /></svg></span>
              <span><strong>Custom color</strong><small>Open the color wheel</small></span>
              <svg aria-hidden="true" className="goal-custom-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="m9 18 6-6-6-6" /></svg>
            </button>
          </div>
          <div className="goal-color-guidance"><span className="goal-appearance-swatch" style={{ backgroundColor: goal.accentColor || '#7652ed' }} /><p>Goal colors appear as small accents on the carousel, so your study progress stays easy to read.</p></div>
        </div>
      ) : (
        <div className="goal-custom-layout">
          <div className="goal-wheel-panel">
            {error && <p className="inline-error" role="alert">{error}</p>}
            <div className="goal-wheel-control-row">
              <div
                className="goal-hue-wheel"
                role="slider"
                tabIndex={0}
                aria-label="Hue color wheel"
                aria-valuemin={0}
                aria-valuemax={359}
                aria-valuenow={Math.round(color.hue)}
                aria-valuetext={`${Math.round(color.hue)} degrees hue`}
                onKeyDown={handleWheelKeyDown}
                onPointerDown={event => { event.currentTarget.setPointerCapture(event.pointerId); updateHueFromPointer(event); }}
                onPointerMove={event => { if (event.currentTarget.hasPointerCapture(event.pointerId)) updateHueFromPointer(event); }}
                style={{ '--wheel-hue': `${color.hue}deg` }}
              >
                <span className="goal-hue-wheel-hole" />
                <span className="goal-hue-wheel-indicator" style={{ left: `${50 + 43 * Math.cos((color.hue - 90) * Math.PI / 180)}%`, top: `${50 + 43 * Math.sin((color.hue - 90) * Math.PI / 180)}%` }} />
              </div>
              <div className="goal-wheel-readout"><span>Selected color</span><strong>{customHex.toUpperCase()}</strong><i style={{ backgroundColor: customHex }} /></div>
            </div>
            <label className="field-label" htmlFor="goal-color-saturation">Saturation <span>{Math.round(color.saturation)}%</span></label>
            <input id="goal-color-saturation" className="goal-color-range" type="range" min="0" max="100" value={Math.round(color.saturation)} onChange={event => setColor(current => ({ ...current, saturation: Number(event.target.value) }))} />
            <label className="field-label" htmlFor="goal-color-brightness">Brightness <span>{Math.round(color.value)}%</span></label>
            <input id="goal-color-brightness" className="goal-color-range" type="range" min="0" max="100" value={Math.round(color.value)} onChange={event => setColor(current => ({ ...current, value: Number(event.target.value) }))} />
            <div className="goal-edit-footer-actions">
              <button type="button" className="quiet-button" onClick={onBack} disabled={saving}>Cancel</button>
              <button type="button" className="primary-action" onClick={() => applyColor(customHex)} disabled={saving}>{saving ? 'Applying…' : 'Apply color'}</button>
            </div>
          </div>

          <article className="goal-color-preview" style={{ '--goal-accent': customHex }}>
            <span className="goal-focus-overline"><span className="goal-focus-color-dot" /> Live preview</span>
            <h2>{goal.name}</h2>
            <p>{Math.round(goal.target_hours > 0 ? Math.min(100, (goal.valid_hours / goal.target_hours) * 100) : 0)}% of target completed</p>
            <div className="goal-progress-track"><span style={{ width: `${goal.target_hours > 0 ? Math.min(100, (goal.valid_hours / goal.target_hours) * 100) : 0}%` }} /></div>
            <span className="goal-preview-note">Neutral surfaces and text keep custom colors in balance.</span>
          </article>
        </div>
      )}
    </section>
  );
}
