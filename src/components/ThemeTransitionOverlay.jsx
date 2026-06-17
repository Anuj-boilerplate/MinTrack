import { useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

function cubicBezier(p1x, p1y, p2x, p2y) {
  const cx = 3.0 * p1x;
  const bx = 3.0 * (p2x - p1x) - cx;
  const ax = 1.0 - cx - bx;
  const cy = 3.0 * p1y;
  const by = 3.0 * (p2y - p1y) - cy;
  const ay = 1.0 - cy - by;

  function sampleCurveX(t) { return ((ax * t + bx) * t + cx) * t; }
  function sampleCurveY(t) { return ((ay * t + by) * t + cy) * t; }
  function sampleCurveDerivativeX(t) { return (3.0 * ax * t + 2.0 * bx) * t + cx; }
  function solveCurveX(x, epsilon = 1e-6) {
    let t2 = x, t1, t0, x2, d2;
    for (let i = 0; i < 8; i++) {
      x2 = sampleCurveX(t2) - x;
      if (Math.abs(x2) < epsilon) return t2;
      d2 = sampleCurveDerivativeX(t2);
      if (Math.abs(d2) < epsilon) break;
      t2 = t2 - x2 / d2;
    }
    t0 = 0.0; t1 = 1.0; t2 = x;
    if (t2 < t0) return t0;
    if (t2 > t1) return t1;
    while (t0 < t1) {
      x2 = sampleCurveX(t2);
      if (Math.abs(x2 - x) < epsilon) return t2;
      if (x > x2) t0 = t2; else t1 = t2;
      t2 = (t1 - t0) * 0.5 + t0;
    }
    return t2; // Failure
  }
  return (x) => sampleCurveY(solveCurveX(x));
}

const ease = cubicBezier(0.4, 0, 0.2, 1);

export default function ThemeTransitionOverlay({ targetTheme, onDone }) {
  const canvasRef = useRef(null);
  const svgRef = useRef(null);
  const grainLinesRef = useRef([]);

  const isDarkTarget = targetTheme === 'dark';
  const overlayColor = isDarkTarget ? '#2a2118' : '#e8dfc8';

  useLayoutEffect(() => {
    // 1. We will apply the new theme beneath the overlay halfway through the animation.
    // document.documentElement.setAttribute('data-theme', targetTheme);
    // Disable body transition so the background changes instantly underneath
    document.documentElement.style.setProperty('transition', 'none', 'important');
    document.body.style.setProperty('transition', 'none', 'important');

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });

    let width = window.innerWidth;
    let height = window.innerHeight;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Diagonal config
    const diagonal = Math.sqrt(width * width + height * height);
    
    // Generate static grain lines (parallel to diagonal)
    const numLines = 35;
    const angle = Math.atan2(-height, width); // Bottom-left to top-right angle
    const perpAngle = angle + Math.PI / 2;
    
    grainLinesRef.current = [];
    for (let i = 0; i < numLines; i++) {
      const offsetP = i / numLines;
      const offsetDist = (offsetP - 0.5) * diagonal * 1.5;
      const jitter = (Math.random() - 0.5) * (diagonal * 0.05);
      const perpDist = offsetDist + jitter;
      
      const cx = width / 2;
      const cy = height / 2;
      const px = cx + Math.cos(perpAngle) * perpDist;
      const py = cy + Math.sin(perpAngle) * perpDist;

      const p1x = px - Math.cos(angle) * diagonal;
      const p1y = py - Math.sin(angle) * diagonal;
      const p2x = px + Math.cos(angle) * diagonal;
      const p2y = py + Math.sin(angle) * diagonal;
      
      grainLinesRef.current.push({ p1x, p1y, p2x, p2y });
    }

    let animationFrameId;
    const startTime = performance.now();
    const duration = 800;
    let hasSwitchedTheme = false;

    const render = (time) => {
      const elapsed = time - startTime;
      const rawT = Math.min(elapsed / duration, 1);
      
      // Wave progress finishes at 70% of the duration
      const waveT = Math.min(rawT / 0.7, 1);
      const easedT = ease(waveT);

      // Switch theme when the screen is completely covered
      if (rawT > 0.7 && !hasSwitchedTheme) {
        document.documentElement.setAttribute('data-theme', targetTheme);
        hasSwitchedTheme = true;
      }

      // Trailing dissolve logic
      let globalAlpha = 1;
      if (rawT > 0.7) {
        globalAlpha = 1 - ((rawT - 0.7) / 0.3);
      }

      ctx.clearRect(0, 0, width, height);
      ctx.globalAlpha = globalAlpha;

      // -----------------------------------------------------
      // Wavefront Geometry
      // -----------------------------------------------------
      // diagonal + 160 ensures it fully covers the screen
      const advance = easedT * (diagonal + 160); 

      // Center of the wave along the diagonal
      const wave_cx = 0 + Math.cos(angle) * advance;
      const wave_cy = height + Math.sin(angle) * advance;

      const perpAngle = angle + Math.PI / 2;
      const waveLength = diagonal * 2; // Extra length to cover the screen fully

      ctx.beginPath();
      const numSamples = 65;
      for (let i = 0; i <= numSamples; i++) {
        const p = (i / numSamples) - 0.5; // -0.5 to +0.5
        
        // Position along the wavefront line
        let wx = wave_cx + Math.cos(perpAngle) * (p * waveLength);
        let wy = wave_cy + Math.sin(perpAngle) * (p * waveLength);

        // Sine wobble
        const freq = 0.22;
        const phase = elapsed * 0.0025;
        const amplitude = 12;
        const offset = Math.sin(i * freq + phase) * amplitude;

        // Offset is in the direction of the wave movement
        wx += Math.cos(angle) * offset;
        wy += Math.sin(angle) * offset;

        if (i === 0) {
          ctx.moveTo(wx, wy);
        } else {
          ctx.lineTo(wx, wy);
        }
      }

      // Close the path far "behind" the wave (towards bottom-left)
      // Since wavefront goes roughly top-left to bottom-right, we are currently at bottom-right
      ctx.lineTo(width * 2, height * 2); // far bottom-right
      ctx.lineTo(-width * 2, height * 2); // far bottom-left
      ctx.lineTo(-width * 2, -height * 2); // far top-left
      ctx.closePath();

      // Fill the main wave
      ctx.fillStyle = overlayColor;
      ctx.fill();

      // Soft leading edge using gradient stroke
      ctx.lineWidth = 32;
      const gradStart = advance;
      const gradEnd = advance + 32;
      
      const gradient = ctx.createLinearGradient(
        0 + Math.cos(angle) * gradStart, height + Math.sin(angle) * gradStart,
        0 + Math.cos(angle) * gradEnd, height + Math.sin(angle) * gradEnd
      );
      gradient.addColorStop(0, overlayColor);
      gradient.addColorStop(1, isDarkTarget ? 'rgba(42, 33, 24, 0)' : 'rgba(232, 223, 200, 0)');
      
      // To stroke just the wavefront, we can stroke the same line path
      ctx.beginPath();
      for (let i = 0; i <= numSamples; i++) {
        const p = (i / numSamples) - 0.5;
        let wx = wave_cx + Math.cos(perpAngle) * (p * waveLength);
        let wy = wave_cy + Math.sin(perpAngle) * (p * waveLength);

        const freq = 0.22;
        const phase = elapsed * 0.0025;
        const amplitude = 12;
        const offset = Math.sin(i * freq + phase) * amplitude;

        wx += Math.cos(angle) * offset;
        wy += Math.sin(angle) * offset;

        if (i === 0) ctx.moveTo(wx, wy);
        else ctx.lineTo(wx, wy);
      }
      
      ctx.strokeStyle = gradient;
      ctx.stroke();

      // -----------------------------------------------------
      // Grain Lines
      // -----------------------------------------------------
      ctx.globalAlpha = globalAlpha * 0.06;
      ctx.lineWidth = 0.8;
      ctx.strokeStyle = isDarkTarget ? '#000' : '#8a7d6e';
      ctx.beginPath();
      for (const line of grainLinesRef.current) {
        ctx.moveTo(line.p1x, line.p1y);
        ctx.lineTo(line.p2x, line.p2y);
      }
      ctx.stroke();

      // -----------------------------------------------------
      // Film Grain Noise (SVG update)
      // -----------------------------------------------------
      if (elapsed > 80 && svgRef.current) {
        svgRef.current.setAttribute('seed', Math.floor(Math.random() * 9999));
      }

      // Loop or Exit
      if (rawT < 1) {
        animationFrameId = requestAnimationFrame(render);
      } else {
        // Cleanup transition hacks
        document.documentElement.style.removeProperty('transition');
        document.body.style.removeProperty('transition');
        onDone();
      }
    };

    animationFrameId = requestAnimationFrame(render);

    const handleResize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.scale(dpr, dpr);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
      document.documentElement.style.removeProperty('transition');
      document.body.style.removeProperty('transition');
    };
  }, [targetTheme, overlayColor, isDarkTarget, onDone]);

  return createPortal(
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9998,
          pointerEvents: 'none'
        }}
      />
      <svg
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          zIndex: 9999,
          opacity: 0.045,
          pointerEvents: 'none'
        }}
      >
        <filter id="tto-grain" x="0%" y="0%" width="100%" height="100%" colorInterpolationFilters="linearRGB">
          <feTurbulence
            ref={svgRef}
            type="fractalNoise"
            baseFrequency="0.72 0.68"
            numOctaves="4"
            seed="1"
            stitchTiles="stitch"
            result="noise"
          />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#tto-grain)" />
      </svg>
    </>,
    document.body
  );
}
