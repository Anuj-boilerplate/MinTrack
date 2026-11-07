import { useMemo } from 'react';
import { useStateContext } from '../../contexts/StateContext';
import { getDaysLeft, getStartOfDay } from '../../utils';


// ── SVG chart constants ────────────────────────────────────────────────────
const CW = 320, CH = 130;
const PAD = { t: 8, r: 12, b: 20, l: 32 };
const IW = CW - PAD.l - PAD.r;
const IH = CH - PAD.t - PAD.b;

function toPath(points) {
  if (!points.length) return '';
  return points
    .map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(' ');
}

// ── Shared data hook ───────────────────────────────────────────────────────
function useDayBuckets(subjects, term) {
  return useMemo(() => {
    if (!term?.startDate || !term?.endDate) return null;

    const termStart = getStartOfDay(new Date(term.startDate));
    const termEnd   = getStartOfDay(new Date(term.endDate));
    const today     = getStartOfDay();
    const cutoff    = today <= termEnd ? today : termEnd;

    const totalTermDays = Math.max(1, Math.ceil((termEnd  - termStart) / 86400000));
    const daysElapsed   = Math.max(1, Math.ceil((cutoff   - termStart) / 86400000) + 1);
    const totalTarget   = subjects.reduce((s, sub) => s + (sub.target_hours || 0), 0);

    const allSessions = subjects
      .flatMap(s => s.sessions || [])
      .filter(s => !s.is_discarded);

    if (allSessions.length === 0) {
      return { empty: true, totalTarget, totalTermDays, daysElapsed };
    }

    const days = [];
    let cumulative = 0;

    for (let i = 0; i < daysElapsed; i++) {
      const dayStart = termStart.getTime() + i * 86400000;
      const dayEnd   = dayStart + 86400000;

      const dayHours = allSessions
        .filter(s => {
          const t = new Date(s.start_time).getTime();
          return t >= dayStart && t < dayEnd;
        })
        .reduce((sum, s) => sum + (s.duration_minutes || 0) / 60, 0);

      cumulative += dayHours;

      const daysRemaining = Math.max(1, totalTermDays - i);
      const requiredRate  = Math.max(0, (totalTarget - cumulative) / daysRemaining);

      days.push({ i, dayHours, cumulative, requiredRate });
    }

    return { days, totalTarget, totalTermDays, daysElapsed };
  }, [subjects, term]);
}

// ── Option A: Cumulative hours vs ideal pace ───────────────────────────────
function ChartA({ data }) {
  const { days, totalTarget, totalTermDays } = data;

  // X axis should scale to the entire term, not just the days elapsed.
  const n = totalTermDays - 1 || 1;

  const xS = i => PAD.l + (i / n) * IW;
  const yS = v => PAD.t + IH - Math.min(1, v / totalTarget) * IH;

  const actualPts = days.map(d => ({ x: xS(d.i), y: yS(d.cumulative) }));
  
  // The ideal line stretches from day 0 to the end of the term
  const idealPts  = [
    { x: xS(0), y: yS(0) },
    { x: xS(totalTermDays - 1), y: yS(totalTarget) }
  ];

  // Y axis ticks: 0, 25%, 50%, 75%, 100% of totalTarget
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map(f => ({
    value: Math.round(f * totalTarget),
    y: yS(f * totalTarget)
  }));

  // X axis ticks: evenly spaced day numbers, max 5, stretching across the entire term
  const xTickCount = Math.min(5, totalTermDays);
  const xTicks = Array.from({ length: xTickCount }, (_, k) => {
    const idx = Math.round((k / (xTickCount - 1 || 1)) * (totalTermDays - 1));
    return { label: `Day ${idx + 1}`, x: xS(idx) };
  });

  return (
    <svg viewBox={`0 0 ${CW} ${CH}`} width="100%" className="digest-chart">

      {/* Y grid lines + labels */}
      {yTicks.map(tick => (
        <g key={tick.value}>
          <line
            x1={PAD.l} x2={CW - PAD.r}
            y1={tick.y} y2={tick.y}
            stroke="currentColor" strokeOpacity="0.07" strokeWidth="1"
          />
          <text
            x={PAD.l - 4}
            y={tick.y}
            textAnchor="end"
            dominantBaseline="middle"
            fontSize="3"
            fontFamily="var(--font-mono, monospace)"
            fill="currentColor"
            opacity="0.35"
          >
            {tick.value}h
          </text>
        </g>
      ))}

      {/* X axis tick labels */}
      {xTicks.map(tick => (
        <text
          key={tick.label}
          x={tick.x}
          y={CH - 5}
          textAnchor="middle"
          fontSize="3"
          fontFamily="var(--font-mono, monospace)"
          fill="currentColor"
          opacity="0.35"
        >
          {tick.label}
        </text>
      ))}

      {/* Ideal line — dashed, muted */}
      <path
        className="digest-chart-ideal"
        d={toPath(idealPts)}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="1"
        strokeDasharray="4 3"
      />

      {/* Actual line — solid */}
      <path
        className="digest-chart-actual"
        d={toPath(actualPts)}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.8"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Chart Card wrapper ─────────────────────────────────────────────────────
function ChartCard({ label, legend, chart, empty }) {
  return (
    <div className="digest-card digest-card--chart">
      <span className="digest-card__label">{label}</span>

      {empty ? (
        <div className="digest-card__empty-message">
          No session history yet.
          <br />
          <span>Study for a few days and this graph will populate.</span>
        </div>
      ) : (
        <>
          {chart}
          <div className="digest-chart-legend">
            <span className="digest-chart-legend__actual">— Actual</span>
            <span className="digest-chart-legend__ideal">- - Ideal</span>
          </div>
          <div className="digest-card__verdict">{legend}</div>
        </>
      )}
    </div>
  );
}

// ── Existing cards ─────────────────────────────────────────────────────────
function DaysRemainingCard({ term }) {
  if (!term?.endDate) return null;

  const daysLeft    = getDaysLeft(getStartOfDay(), term.endDate);
  const termStart   = getStartOfDay(new Date(term.startDate));
  const termEnd     = getStartOfDay(new Date(term.endDate));
  const totalDays   = Math.ceil((termEnd - termStart) / (1000 * 60 * 60 * 24));
  const daysElapsed = Math.max(0, totalDays - Math.max(0, daysLeft));
  const progressPct = totalDays > 0 ? Math.min(100, (daysElapsed / totalDays) * 100) : 0;

  const formattedEnd = new Date(term.endDate).toLocaleDateString(undefined, {
    month: 'long', day: 'numeric', year: 'numeric'
  });

  return (
    <div className="digest-card">
      <span className="digest-card__label">Term ends</span>
      <div className="digest-card__number">
        {Math.max(0, daysLeft)}
        <span className="digest-card__number-unit">days</span>
      </div>
      <div className="digest-card__meta">{formattedEnd}</div>
      <div className="digest-card__bar-track">
        <div className="digest-card__bar-fill" style={{ width: `${progressPct}%` }} />
      </div>
      <div className="digest-card__bar-labels">
        <span>Start</span>
        <span>{Math.round(progressPct)}% through</span>
        <span>End</span>
      </div>
    </div>
  );
}

function DailyAverageCard({ subjects, term }) {
  const stats = useMemo(() => {
    if (!term?.startDate) return null;

    const allSessions = subjects.flatMap(s => s.sessions || []).filter(s => !s.is_discarded);
    if (allSessions.length === 0) return null;

    const totalHours  = allSessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0) / 60;
    const termStart   = getStartOfDay(new Date(term.startDate));
    const today       = getStartOfDay();
    const studyDays   = new Set(
      allSessions.map(s => getStartOfDay(new Date(s.start_time)).toDateString())
    ).size;
    // Clamp daysElapsed so it's never less than studyDays — prevents "3 active out of 2 days"
    const rawDaysElapsed  = Math.max(1, Math.ceil((today - termStart) / (1000 * 60 * 60 * 24)));
    const daysElapsed     = Math.max(rawDaysElapsed, studyDays);
    const average         = totalHours / daysElapsed;

    return { average, daysElapsed, studyDays };
  }, [subjects, term]);

  if (!stats) {
    return (
      <div className="digest-card digest-card--empty">
        <span className="digest-card__label">Daily average</span>
        <div className="digest-card__empty-message">
          No sessions recorded yet.
          <br />
          <span>Your real daily average will appear here once you start studying.</span>
        </div>
      </div>
    );
  }

  const { average, daysElapsed, studyDays } = stats;
  const avgHours = Math.floor(average);
  const avgMins  = Math.round((average - avgHours) * 60);
  const idleDays = Math.max(0, daysElapsed - studyDays);

  return (
    <div className="digest-card">
      <span className="digest-card__label">Daily average</span>
      <div className="digest-card__number">
        {avgHours > 0 && <>{avgHours}<span className="digest-card__number-unit">h</span></>}
        {avgMins  > 0 && <>{avgHours > 0 ? '\u00a0' : ''}{avgMins}<span className="digest-card__number-unit">m</span></>}
      </div>
      <div className="digest-card__meta">
        across {daysElapsed} day{daysElapsed !== 1 ? 's' : ''} &mdash; {studyDays} active, {idleDays} idle
      </div>
      <div className="digest-card__verdict">
        {average < 0.5  ? "Barely any consistent effort yet."
        : average < 1.5 ? "Light but present. There's room to push."
        : average < 3   ? "A solid foundation. Keep it steady."
        :                 "Strong output. Sustain it."}
      </div>
    </div>
  );
}

export default function DigestScreen() {
  const { state } = useStateContext();
  const buckets   = useDayBuckets(state.subjects, state.term);
  const isEmpty   = !buckets || buckets.empty;

  return (
    <div
      id="digest-screen"
      className="dashboard-shell"
    >
      <div className="digest-header">
        <h1 className="digest-header__title">The Digest</h1>
        <p className="digest-header__date">
          {new Date().toLocaleDateString(undefined, {
            weekday: 'long', month: 'long', day: 'numeric'
          })}
        </p>
      </div>

      <div className="digest-grid">
        <DaysRemainingCard term={state.term} />
        <DailyAverageCard subjects={state.subjects} term={state.term} />

        <ChartCard
          label="Cumulative hours"
          legend="Solid line is your actual progress. Dashed is the ideal straight-line pace."
          empty={isEmpty}
          chart={isEmpty ? null : <ChartA data={buckets} />}
        />
      </div>
    </div>
  );
}
