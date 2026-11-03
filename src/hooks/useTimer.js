import { useState, useEffect, useRef, useCallback } from 'react';
import { getStartOfDay, getDaysLeft } from '../utils';

export function useTimer(state, timerAction) {
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

  const startFocusSession = async (subjectId, uiSettings) => {
    initAudio();
    return timerAction('start_timer', {
      p_subject_id: subjectId,
      p_task_id: uiSettings?.taskId || null,
      p_focus_length: uiSettings.focusLength,
      p_break_length: uiSettings.breakLength,
      p_cycles: uiSettings.cycles,
    });
  };

  const pause = async () => {
    const active = stateRef.current.activeSession;
    if (!active || active.isPaused) return;
    return timerAction('pause_timer');
  };

  const resume = async () => {
    const active = stateRef.current.activeSession;
    if (!active || !active.isPaused) return;
    return timerAction('resume_timer');
  };

  const updateTimerDisplay = useCallback(() => {
    const currentState = stateRef.current;
    const active = currentState.activeSession;
    if (!active || active.status === 'review') return;

    const now = active.isPaused ? active.pausedAt : Date.now();
    const elapsedMs = now - active.startTime - (active.totalPausedMs || 0);

    const sub = currentState.subjects.find((subject) => subject.id === active.subjectId);
    if (sub && (sub.deadline || currentState.term)) {
      const subDeadline = sub.deadline || currentState.term.endDate;
      const daysLeft = getDaysLeft(getStartOfDay(), subDeadline);
      const tHours = sub.target_hours || 0;
      const vHours = sub.valid_hours || 0;

      const dailyReq = daysLeft >= 0 ? (tHours - vHours) / Math.max(1, daysLeft) : 0;
      const totalPressure = dailyReq;

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

  const calculateNetFocusTime = (session) => {
    const activeSession = session || stateRef.current.activeSession;
    if (!activeSession) return 0;
    const now = activeSession.stoppedAt ? Date.parse(activeSession.stoppedAt) :
      activeSession.isPaused ? activeSession.pausedAt : Date.now();
    let rawElapsedMs = now - activeSession.startTime - (activeSession.totalPausedMs || 0);
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
    lastNotifiedPhaseIdRef.current = null;
    setDisplayTime('00:00');
    setIsDone(false);
  };

  useEffect(() => {
    if (!state.activeSession || state.activeSession.status === 'review') return;
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

  useEffect(() => {
    if (state.activeSession?.status === 'running' || state.activeSession?.status === 'paused') return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDone(false);
  }, [state.activeSession?.status]);

  return {
    startFocusSession,
    displayTime,
    phaseInfo,
    dailyProgressPct,
    isDone,
    calculateNetFocusTime,
    clearSession,
    pause,
    resume,
    isPaused: state.activeSession?.isPaused ?? false
  };
}
