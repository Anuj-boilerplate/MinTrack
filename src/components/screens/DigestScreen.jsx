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
  const { days, totalTarget, totalTermDays, daysElapsed } = data;

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
        d={toPath(idealPts)}
        fill="none"
        stroke="currentColor"
        strokeOpacity="0.25"
        strokeWidth="1"
        strokeDasharray="4 3"
      />

      {/* Actual line — solid */}
      <path
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

// ── Today's Progress Card ─────────────────────────────────────────────────
function TodayProgressCard({ subjects }) {
  const stats = useMemo(() => {
    const today     = getStartOfDay();
    const todayEnd  = today.getTime() + 86400000;

    // Per-subject: daily_target and hours studied today
    const perSubject = subjects
      .filter(s => (s.daily_target || 0) > 0 || (s.sessions || []).length > 0)
      .map(s => {
        const todayHours = (s.sessions || [])
          .filter(sess => !sess.is_discarded)
          .filter(sess => {
            const t = new Date(sess.start_time).getTime();
            return t >= today.getTime() && t < todayEnd;
          })
          .reduce((sum, sess) => sum + (sess.duration_minutes || 0) / 60, 0);

        return {
          id:          s.id,
          name:        s.name,
          color:       s.accentColor || s.accent_color || 'var(--text-muted)',
          target:      s.daily_target || 0,
          studiedToday: todayHours,
        };
      })
      .filter(s => s.target > 0);

    const totalTarget  = perSubject.reduce((sum, s) => sum + s.target, 0);
    const totalStudied = perSubject.reduce((sum, s) => sum + s.studiedToday, 0);

    return { perSubject, totalTarget, totalStudied };
  }, [subjects]);

  const { perSubject, totalTarget, totalStudied } = stats;

  if (perSubject.length === 0) {
    return (
      <div className="digest-card digest-card--wide digest-card--empty">
        <span className="digest-card__label">Today&rsquo;s goal</span>
        <div className="digest-card__empty-message">
          No daily targets set yet.
          <br />
          <span>Set a target hours goal on each subject to see today&rsquo;s combined goal here.</span>
        </div>
      </div>
    );
  }

  const overallPct   = Math.min(1, totalTarget > 0 ? totalStudied / totalTarget : 0);
  const remaining    = Math.max(0, totalTarget - totalStudied);
  const doneHours    = Math.floor(totalStudied);
  const doneMins     = Math.round((totalStudied - doneHours) * 60);
  const targetHours  = Math.floor(totalTarget);
  const targetMins   = Math.round((totalTarget - targetHours) * 60);
  const remHours     = Math.floor(remaining);
  const remMins      = Math.round((remaining - remHours) * 60);

  const verdict =
    overallPct >= 1    ? "All goals met for today. Well done."
    : overallPct >= 0.75 ? "Almost there — one more push."
    : overallPct >= 0.5  ? "Halfway through. Keep it going."
    : overallPct >= 0.25 ? "Off to a start. More to do."
    :                      "Day's barely begun. Time to open the books.";

  // Build segmented bar: each subject fills proportional to (their target / totalTarget)
  // within that segment, their studied portion is opaque; the rest is muted.
  return (
    <div className="digest-card digest-card--wide">
      <div className="digest-today__header">
        <span className="digest-card__label">Today&rsquo;s goal</span>
        <span className="digest-today__tally">
          <span className="digest-today__tally-done">
            {doneHours > 0 && <>{doneHours}<span className="digest-today__tally-unit">h</span></>}
            {doneMins  > 0 && <>{doneHours > 0 ? '\u00a0' : ''}{doneMins}<span className="digest-today__tally-unit">m</span></>}
            {totalStudied === 0 && <span style={{ opacity: 0.4 }}>0<span className="digest-today__tally-unit">h</span></span>}
          </span>
          <span className="digest-today__tally-sep">/</span>
          <span className="digest-today__tally-total">
            {targetHours > 0 && <>{targetHours}<span className="digest-today__tally-unit">h</span></>}
            {targetMins  > 0 && <>{targetHours > 0 ? '\u00a0' : ''}{targetMins}<span className="digest-today__tally-unit">m</span></>}
          </span>
        </span>
      </div>

      {/* Segmented progress bar */}
      <div className="digest-today__bar-track" role="meter" aria-valuenow={Math.round(overallPct * 100)} aria-valuemin={0} aria-valuemax={100}>
        {perSubject.map((s, i) => {
          const segWidth  = totalTarget > 0 ? (s.target / totalTarget) * 100 : 0;
          const fillPct   = s.target > 0 ? Math.min(1, s.studiedToday / s.target) * 100 : 0;
          const isLast    = i === perSubject.length - 1;
          return (
            <div
              key={s.id}
              className="digest-today__bar-seg"
              style={{
                width: `${segWidth}%`,
                borderRight: isLast ? 'none' : '2px solid var(--bg-main)',
              }}
            >
              <div
                className="digest-today__bar-seg-fill"
                style={{ width: `${fillPct}%`, background: s.color }}
              />
            </div>
          );
        })}
      </div>

      {/* Subject legend */}
      <div className="digest-today__legend">
        {perSubject.map(s => (
          <div key={s.id} className="digest-today__legend-item">
            <span className="digest-today__legend-dot" style={{ background: s.color }} />
            <span className="digest-today__legend-name">{s.name}</span>
            <span className="digest-today__legend-val">
              {s.target > 0
                ? `${Math.floor(s.studiedToday)}h ${Math.round((s.studiedToday % 1) * 60)}m / ${Math.floor(s.target)}h ${Math.round((s.target % 1) * 60)}m`
                : '—'
              }
            </span>
          </div>
        ))}
      </div>

      <div className="digest-today__footer">
        {remaining > 0 && (
          <span className="digest-today__remaining">
            {remHours > 0 && <>{remHours}<span style={{ fontSize: '0.7em', marginLeft: '1px' }}>h</span></>}
            {remMins  > 0 && <>{remHours > 0 ? '\u00a0' : ''}{remMins}<span style={{ fontSize: '0.7em', marginLeft: '1px' }}>m</span></>}
            {' '}remaining
          </span>
        )}
        <span className="digest-card__verdict" style={{ marginTop: 0 }}>{verdict}</span>
      </div>
    </div>
  );
}

// ── Digest Screen ──────────────────────────────────────────────────────────
export default function DigestScreen() {
  const { state } = useStateContext();
  const buckets   = useDayBuckets(state.subjects, state.term);
  const isEmpty   = !buckets || buckets.empty;

  return (
    <div
      id="digest-screen"
      className="dashboard-shell animate-[screenFade_0.6s_cubic-bezier(0.25,0.46,0.45,0.94)]"
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
        <TodayProgressCard subjects={state.subjects} />

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
