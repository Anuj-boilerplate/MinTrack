export default function MinTrackMark({ size = 36, className = '' }) {
  return (
    <svg
      role="img"
      aria-label="MinTrack"
      className={className}
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="1" y="1" width="38" height="38" rx="12" fill="var(--brand-mark-bg, #20202f)" />
      <path d="M10 27V14.5C10 12.57 12.33 11.61 13.69 12.97L20 19.28L26.31 12.97C27.67 11.61 30 12.57 30 14.5V27" stroke="var(--brand-mark-line, #9864a0)" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="30" cy="27" r="3.2" fill="var(--brand-mark-dot, #75417d)" />
    </svg>
  );
}
