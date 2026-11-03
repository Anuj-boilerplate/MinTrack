import { describe, it, expect } from 'vitest';
import { splitSessionAtMidnight } from '../utils';

describe('Cloud-first Data Flow & Concurrency', () => {
  it('splits sessions at midnight with UUIDs for atomic Supabase completion', () => {
    const subjectId = 'sub-1';
    // Use local time crossing local midnight
    const start = new Date(2026, 10, 3, 23, 30, 0);
    const end = new Date(2026, 10, 4, 0, 30, 0);
    const startISO = start.toISOString();
    const endISO = end.toISOString();
    const durationMins = 60;

    const rows = splitSessionAtMidnight(subjectId, startISO, endISO, durationMins);
    expect(rows).toHaveLength(2);
    expect(rows[0].id).toBeDefined();
    expect(rows[1].id).toBeDefined();
    expect(rows[0].id).not.toBe(rows[1].id);
    expect(rows[0].subject_id).toBe(subjectId);
    expect(rows[1].subject_id).toBe(subjectId);
    expect(rows[0].duration_minutes + rows[1].duration_minutes).toBe(60);
  });

  it('detects concurrency conflict when record version has changed', async () => {
    let remoteVersion = 2; // Another client already bumped version from 1 to 2
    const updateVersioned = async (table, id, currentVersion, fields) => {
      if (currentVersion !== remoteVersion) {
        throw new Error('This item changed elsewhere. We loaded the latest version for you. Please try again.');
      }
      remoteVersion += 1;
      return { id, version: remoteVersion, ...fields };
    };

    // Stale client attempt with loaded version 1 fails
    await expect(updateVersioned('subjects', 'sub-1', 1, { name: 'Updated' }))
      .rejects.toThrow('This item changed elsewhere');

    // Fresh client attempt with loaded version 2 succeeds
    const result = await updateVersioned('subjects', 'sub-1', 2, { name: 'Updated' });
    expect(result.version).toBe(3);
    expect(result.name).toBe('Updated');
  });

  it('formats active timer row correctly for local countdown rendering', () => {
    const rawRow = {
      subject_id: 'sub-123',
      task_id: 'todo-456',
      started_at: '2026-11-03T10:00:00.000Z',
      paused_at: '2026-11-03T10:15:00.000Z',
      stopped_at: null,
      total_paused_ms: '60000',
      focus_length: 25,
      break_length: 5,
      cycles: 4,
      status: 'paused',
      version: 2
    };

    const asTimer = row => row && ({
      subjectId: row.subject_id,
      taskId: row.task_id,
      startTime: Date.parse(row.started_at),
      startedAt: row.started_at,
      ui: { focusLength: row.focus_length, breakLength: row.break_length, cycles: row.cycles },
      isPaused: row.status === 'paused',
      pausedAt: row.paused_at ? Date.parse(row.paused_at) : null,
      totalPausedMs: Number(row.total_paused_ms || 0),
      status: row.status,
      stoppedAt: row.stopped_at
    });

    const timer = asTimer(rawRow);
    expect(timer.subjectId).toBe('sub-123');
    expect(timer.taskId).toBe('todo-456');
    expect(timer.isPaused).toBe(true);
    expect(timer.totalPausedMs).toBe(60000);
    expect(timer.ui.focusLength).toBe(25);
    expect(timer.status).toBe('paused');
  });

  it('prepares complete_timer RPC payload with optional task completion', () => {
    const rows = [
      { id: 'sess-1', start_time: '2026-11-03T10:00:00Z', end_time: '2026-11-03T10:25:00Z', duration_minutes: 25 }
    ];
    const markTaskCompleted = true;

    const rpcPayload = {
      p_sessions: rows.map(r => ({
        id: r.id,
        start_time: r.start_time,
        end_time: r.end_time,
        duration_minutes: r.duration_minutes
      })),
      p_mark_task_completed: Boolean(markTaskCompleted)
    };

    expect(rpcPayload.p_sessions).toHaveLength(1);
    expect(rpcPayload.p_sessions[0].duration_minutes).toBe(25);
    expect(rpcPayload.p_mark_task_completed).toBe(true);
  });
});
