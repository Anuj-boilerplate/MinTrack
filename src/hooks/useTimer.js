import { useState, useEffect, useRef, useCallback } from 'react';
import { getStartOfDay, getDaysLeft } from '../utils';

export function useTimer(state, updateState) {
  const [displayTime, setDisplayTime] = useState('00:00');
  const [phaseInfo, setPhaseInfo] = useState({ phase: 'Focus Phase', phaseClass: 'focus-tag', cycleText: 'Cycle 1' });
  const [dailyProgressPct, setDailyProgressPct] = useState(0);
  const [isDone, setIsDone] = useState(false);
  
  const workerRef = useRef(null);
  const audioCtxRef = useRef(null);
  const stateRef = useRef(state);
  const lastNotifiedPhaseIdRef = useRef(state.activeSession?.lastNotifiedPhaseId ?? null);

  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  useEffect(() => {
    lastNotifiedPhaseIdRef.current = state.activeSession?.lastNotifiedPhaseId ?? null;
  }, [state.activeSession]);

  const initAudio = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtxRef.current.state === 'suspended') {
      audioCtxRef.current.resume();
    }
  }, []);

  const playBeep = useCallback((frequency) => {
    if (!audioCtxRef.current) return;
    const osc = audioCtxRef.current.createOscillator();
    const gain = audioCtxRef.current.createGain();
    osc.connect(gain);
    gain.connect(audioCtxRef.current.destination);

    osc.type = 'sine';
    osc.frequency.setValueAtTime(frequency, audioCtxRef.current.currentTime);
    gain.gain.setValueAtTime(0, audioCtxRef.current.currentTime);
    gain.gain.linearRampToValueAtTime(0.5, audioCtxRef.current.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.01, audioCtxRef.current.currentTime + 0.5);

    osc.start();
    osc.stop(audioCtxRef.current.currentTime + 0.5);
  }, []);

  const startFocusSession = (subjectId, uiSettings) => {
    initAudio();
    const startTime = Date.now();
    updateState({
      activeSession: {
        subjectId,
        startTime,
        startedAt: new Date(startTime).toISOString(),
        ui: uiSettings,
        lastNotifiedPhaseId: null
      }
    });
  };

  const updateTimerDisplay = useCallback(() => {
    const currentState = stateRef.current;
    const active = currentState.activeSession;
    if (!active) return;

    const elapsedMs = Date.now() - active.startTime;

    const sub = currentState.subjects.find((subject) => subject.id === active.subjectId);
    if (sub && currentState.term) {
      const daysLeft = getDaysLeft(getStartOfDay(), currentState.term.endDate);
      const tHours = sub.target_hours || 0;
      const vHours = sub.valid_hours || 0;
      
      const dailyReq = daysLeft >= 0 ? (tHours - vHours) / Math.max(1, daysLeft) : 0;
      const totalPressure = dailyReq + (sub.carryover || 0);

      const sessionElapsedHours = elapsedMs / (1000 * 60 * 60);
      const currentCompleted = (sub.completed_today || 0) + sessionElapsedHours;

      let progressPct = 0;
      if (totalPressure > 0) {
        progressPct = Math.min((currentCompleted / totalPressure) * 100, 100);
      }
      setDailyProgressPct(progressPct);
    }

    const fMs = active.ui.focusLength * 60000;
    const bMs = active.ui.breakLength * 60000;
    const cycleMs = fMs + bMs;
    const totalCycles = active.ui.cycles;

    const currentCycle = Math.floor(elapsedMs / cycleMs);
    const timeInCycle = elapsedMs % cycleMs;

    let phase = "Focus Phase";
    let phaseClass = "focus-tag";
    let countdownMs = fMs - timeInCycle;

    if (timeInCycle >= fMs) {
      phase = "Break Phase";
      phaseClass = "break-tag";
      countdownMs = cycleMs - timeInCycle;
    }

    if (currentCycle >= totalCycles) {
      workerRef.current?.postMessage('stop');
      setDisplayTime('00:00');
      setIsDone(true);
      return;
    }

    setPhaseInfo({ phase, phaseClass, cycleText: `Cycle ${currentCycle + 1} of ${totalCycles}` });

    const totalSecs = Math.floor(countdownMs / 1000);

    if (totalSecs <= 3 && totalSecs > 0) {
      const currentPhaseId = currentCycle + "-" + phase;
      if (lastNotifiedPhaseIdRef.current !== currentPhaseId) {
        lastNotifiedPhaseIdRef.current = currentPhaseId;
        if (phase === "Focus Phase") playBeep(800);
        else if (phase === "Break Phase") playBeep(400);
      }
    }

    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    setDisplayTime(String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0'));
  }, [playBeep]);

  const calculateNetFocusTime = () => {
    const activeSession = stateRef.current.activeSession;
    if (!activeSession) return 0;
    let rawElapsedMs = Date.now() - activeSession.startTime;
    const fMs = activeSession.ui.focusLength * 60000;
    const bMs = activeSession.ui.breakLength * 60000;
    const cycleMs = fMs + bMs;
    const maxMs = activeSession.ui.cycles * cycleMs;
    
    if (rawElapsedMs > maxMs) rawElapsedMs = maxMs; 
    
    const fullCycles = Math.floor(rawElapsedMs / cycleMs);
    const remainder = rawElapsedMs % cycleMs;
    const netFocusMs = (fullCycles * fMs) + Math.min(remainder, fMs);
    
    return netFocusMs / (1000 * 60 * 60);
  };

  const clearSession = () => {
    updateState({ activeSession: null });
    lastNotifiedPhaseIdRef.current = null;
    setDisplayTime('00:00');
    setIsDone(false);
  };

  useEffect(() => {
    if (!state.activeSession) return;
    updateTimerDisplay();

    if (!workerRef.current) {
      workerRef.current = new Worker('/worker.js');
      workerRef.current.onmessage = () => {
        updateTimerDisplay();
      };
    }
    workerRef.current.postMessage('start');

    return () => {
      if (workerRef.current) {
        workerRef.current.postMessage('stop');
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [state.activeSession, updateTimerDisplay]);

  return { startFocusSession, displayTime, phaseInfo, dailyProgressPct, isDone, calculateNetFocusTime, clearSession };
}
