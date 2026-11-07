const TEST_USER_ID = '11111111-2222-3333-4444-555555555555';
const DUMMY_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMTExMTExMS0yMjIyLTMzMzMtNDQ0NC01NTU1NTU1NTU1NTUiLCJlbWFpbCI6ImFsZXhhbmRyaWEuc3R1ZGVudEB0ZXN0LmVkdSIsImV4cCI6MTk5OTk5OTk5OX0.sig';

export function createMockDatabase(initialState = {}) {
  let profile = initialState.profile !== undefined ? initialState.profile : {
    id: TEST_USER_ID,
    term_start_date: '2026-06-01T00:00:00.000Z',
    term_end_date: '2026-12-31T00:00:00.000Z'
  };

  let subjects = initialState.subjects !== undefined ? initialState.subjects : [
    {
      id: 'sub-algebra',
      user_id: TEST_USER_ID,
      name: 'Linear Algebra',
      target_hours: 60,
      valid_hours: 15,
      deadline: '2026-11-30T00:00:00.000Z',
      accent_color: '#5b7a99',
      version: 1
    },
    {
      id: 'sub-algorithms',
      user_id: TEST_USER_ID,
      name: 'Algorithms & Data Structures',
      target_hours: 90,
      valid_hours: 32,
      deadline: '2026-12-15T00:00:00.000Z',
      accent_color: '#c97b6e',
      version: 1
    }
  ];

  let todos = initialState.todos !== undefined ? initialState.todos : [
    {
      id: 'todo-problem-set-1',
      user_id: TEST_USER_ID,
      title: 'Complete Problem Set 4',
      note: 'Focus on eigenvalues and eigenvectors',
      is_completed: false,
      is_scratched_today: false,
      recurrence_days: null,
      recurring_group_id: null,
      scheduled_date: new Date().toISOString().split('T')[0],
      display_order: 0,
      created_at: new Date().toISOString(),
      deadline: null,
      original_date: null,
      version: 1
    },
    {
      id: 'todo-read-ch6',
      user_id: TEST_USER_ID,
      title: 'Read Graph Theory Chapter 6',
      note: 'Dijkstra and A* algorithm proofs',
      is_completed: true,
      is_scratched_today: false,
      recurrence_days: null,
      recurring_group_id: null,
      scheduled_date: new Date().toISOString().split('T')[0],
      display_order: 1,
      created_at: new Date().toISOString(),
      deadline: null,
      original_date: null,
      version: 1
    }
  ];

  let sessions = initialState.sessions !== undefined ? initialState.sessions : [
    {
      id: 'sess-alg-1',
      subject_id: 'sub-algebra',
      task_id: 'todo-problem-set-1',
      start_time: '2026-11-01T14:00:00.000Z',
      end_time: '2026-11-01T15:30:00.000Z',
      duration_minutes: 90,
      is_discarded: false
    },
    {
      id: 'sess-algo-2',
      subject_id: 'sub-algorithms',
      task_id: null,
      start_time: '2026-11-02T10:00:00.000Z',
      end_time: '2026-11-02T11:00:00.000Z',
      duration_minutes: 60,
      is_discarded: false
    }
  ];

  let activeTimer = initialState.activeTimer !== undefined ? initialState.activeTimer : null;

  return {
    get profile() { return profile; },
    set profile(val) { profile = val; },
    get subjects() { return subjects; },
    get todos() { return todos; },
    get sessions() { return sessions; },
    get activeTimer() { return activeTimer; },
    set activeTimer(val) { activeTimer = val; },

    // Handlers
    handleProfiles(method, body) {
      if (method === 'POST') {
        profile = { ...profile, ...body };
        return profile;
      }
      return profile;
    },

    handleSubjects(method, url, body) {
      if (method === 'GET') return subjects;
      if (method === 'POST') {
        const item = { ...body, id: body.id || crypto.randomUUID(), version: 1 };
        subjects.push(item);
        return item;
      }
      if (method === 'PATCH') {
        const idMatch = url.searchParams.get('id')?.replace('eq.', '');
        const index = subjects.findIndex(s => s.id === idMatch);
        if (index >= 0) {
          subjects[index] = { ...subjects[index], ...body, version: (subjects[index].version || 1) + 1 };
          return subjects[index];
        }
        return null;
      }
      if (method === 'DELETE') {
        const idMatch = url.searchParams.get('id')?.replace('eq.', '');
        subjects = subjects.filter(s => s.id !== idMatch);
        sessions = sessions.filter(s => s.subject_id !== idMatch);
        return [{ id: idMatch }];
      }
      return [];
    },

    handleTodos(method, url, body) {
      if (method === 'GET') return todos;
      if (method === 'POST') {
        const items = Array.isArray(body) ? body : [body];
        const inserted = items.map(t => ({ ...t, id: t.id || crypto.randomUUID(), version: 1 }));
        todos.push(...inserted);
        return inserted;
      }
      if (method === 'PATCH') {
        const idMatch = url.searchParams.get('id')?.replace('eq.', '');
        const index = todos.findIndex(t => t.id === idMatch);
        if (index >= 0) {
          todos[index] = { ...todos[index], ...body, version: (todos[index].version || 1) + 1 };
          return todos[index];
        }
        return null;
      }
      if (method === 'DELETE') {
        const idMatch = url.searchParams.get('id')?.replace('eq.', '');
        const groupMatch = url.searchParams.get('recurring_group_id')?.replace('eq.', '');
        if (groupMatch) {
          const removed = todos.filter(t => t.recurring_group_id === groupMatch);
          todos = todos.filter(t => t.recurring_group_id !== groupMatch);
          return removed.map(t => ({ id: t.id }));
        }
        if (idMatch) {
          todos = todos.filter(t => t.id !== idMatch);
          return [{ id: idMatch }];
        }
      }
      return [];
    },

    handleSessions(method, url, body) {
      if (method === 'GET') return sessions;
      if (method === 'POST') {
        const items = Array.isArray(body) ? body : [body];
        sessions.push(...items);
        return items;
      }
      if (method === 'DELETE') {
        const idMatch = url.searchParams.get('id')?.replace('eq.', '');
        sessions = sessions.filter(s => s.id !== idMatch);
        return [{ id: idMatch }];
      }
      return [];
    },

    handleActiveTimers(method) {
      if (method === 'GET') return activeTimer;
      return null;
    },

    handleRpc(functionName, payload) {
      if (functionName === 'start_timer') {
        activeTimer = {
          user_id: TEST_USER_ID,
          subject_id: payload.p_subject_id,
          task_id: payload.p_task_id || null,
          started_at: new Date().toISOString(),
          paused_at: null,
          stopped_at: null,
          total_paused_ms: 0,
          focus_length: payload.p_focus_length,
          break_length: payload.p_break_length,
          cycles: payload.p_cycles,
          status: 'running',
          version: 1
        };
        return activeTimer;
      }
      if (functionName === 'pause_timer') {
        if (activeTimer) {
          activeTimer = { ...activeTimer, status: 'paused', paused_at: new Date().toISOString() };
        }
        return activeTimer;
      }
      if (functionName === 'resume_timer') {
        if (activeTimer) {
          activeTimer = { ...activeTimer, status: 'running', paused_at: null };
        }
        return activeTimer;
      }
      if (functionName === 'stop_timer') {
        if (activeTimer) {
          activeTimer = { ...activeTimer, status: 'review', stopped_at: new Date().toISOString() };
        }
        return activeTimer;
      }
      if (functionName === 'clear_timer') {
        activeTimer = null;
        return null;
      }
      if (functionName === 'complete_timer') {
        if (Array.isArray(payload.p_sessions)) {
          for (const s of payload.p_sessions) {
            sessions.push({
              id: s.id || crypto.randomUUID(),
              subject_id: activeTimer?.subject_id || subjects[0]?.id,
              task_id: activeTimer?.task_id || null,
              start_time: s.start_time,
              end_time: s.end_time,
              duration_minutes: s.duration_minutes,
              is_discarded: false
            });
          }
        }
        if (payload.p_mark_task_completed && activeTimer?.task_id) {
          const t = todos.find(item => item.id === activeTimer.task_id);
          if (t) t.is_completed = true;
        }
        activeTimer = null;
        return null;
      }
      if (functionName === 'clear_all_study_data') {
        activeTimer = null;
        todos = [];
        subjects = [];
        sessions = [];
        if (profile) {
          profile.term_start_date = null;
          profile.term_end_date = null;
        }
        return null;
      }
      return null;
    }
  };
}

export async function setupMockSupabase(page, db, options = { authenticated: true }) {
  if (options.authenticated) {
    await page.addInitScript(({ userId, jwt }) => {
      const nowSeconds = Math.floor(Date.now() / 1000);
      const mockSession = {
        access_token: jwt,
        token_type: 'bearer',
        expires_in: 86400,
        expires_at: nowSeconds + 86400,
        refresh_token: 'mock-refresh-token',
        user: {
          id: userId,
          aud: 'authenticated',
          role: 'authenticated',
          email: 'alexandria.student@test.edu',
          app_metadata: { provider: 'google' },
          user_metadata: { full_name: 'Alexandria Student' },
          created_at: '2026-01-01T00:00:00.000Z'
        }
      };
      window.localStorage.setItem('sb-cefpifzgesftnjcqlzrw-auth-token', JSON.stringify(mockSession));
      window.localStorage.setItem('seen_update_2.5.2', 'true');
      window.localStorage.setItem('seen_update_0.0.0', 'true');
    }, { userId: TEST_USER_ID, jwt: DUMMY_JWT });
  }

  // Intercept all Supabase REST / RPC HTTP calls
  await page.route('https://cefpifzgesftnjcqlzrw.supabase.co/**', async route => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const pathname = url.pathname;

    let postData = null;
    try {
      const text = request.postData();
      if (text) postData = JSON.parse(text);
    } catch {
      // ignore
    }

    // Auth endpoints
    if (pathname.startsWith('/auth/v1/user')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: TEST_USER_ID,
          aud: 'authenticated',
          role: 'authenticated',
          email: 'alexandria.student@test.edu'
        })
      });
    }

    if (pathname.startsWith('/auth/v1/token')) {
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          access_token: DUMMY_JWT,
          token_type: 'bearer',
          expires_in: 86400,
          expires_at: Math.floor(Date.now() / 1000) + 86400,
          refresh_token: 'mock-refresh-token',
          user: {
            id: TEST_USER_ID,
            aud: 'authenticated',
            role: 'authenticated',
            email: 'alexandria.student@test.edu'
          }
        })
      });
    }

    // RPC endpoints
    if (pathname.startsWith('/rest/v1/rpc/')) {
      const fnName = pathname.replace('/rest/v1/rpc/', '');
      const result = db.handleRpc(fnName, postData || {});
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(result)
      });
    }

    // REST tables
    if (pathname.startsWith('/rest/v1/profiles')) {
      const res = db.handleProfiles(method, postData);
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(res)
      });
    }

    if (pathname.startsWith('/rest/v1/subjects')) {
      const res = db.handleSubjects(method, url, postData);
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(res)
      });
    }

    if (pathname.startsWith('/rest/v1/todos')) {
      const res = db.handleTodos(method, url, postData);
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(res)
      });
    }

    if (pathname.startsWith('/rest/v1/sessions')) {
      const res = db.handleSessions(method, url, postData);
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(res)
      });
    }

    if (pathname.startsWith('/rest/v1/active_timers')) {
      const res = db.handleActiveTimers(method);
      return route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(res)
      });
    }

    // Default fallback
    return route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([])
    });
  });
}
