// State-drift simulator. Mutates fixture state and emits matching WS events.
// Pure functions are exported for unit testing; the loop binds them to the
// running server's mutable state and the broadcast function.

const TICK_MS = 3000;

const ACTION_WEIGHTS = {
  advance_task: 40,
  flip_project_status: 20,
  rotate_presence: 15,
  derive_ticker: 15,
  seed_ticker: 10,
};

/**
 * Pick one key from a weighted record. `random` should be in [0, 1).
 * Exposed for testing - production code calls with Math.random().
 */
export function pickWeightedAction(weights, random) {
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  let target = random * total;
  for (const [key, w] of Object.entries(weights)) {
    target -= w;
    if (target < 0) return key;
  }
  // Fallback for floating-point edge cases.
  return Object.keys(weights).at(-1);
}

export const ACTIONS = {
  advance_task,
  flip_project_status,
  rotate_presence,
  derive_ticker,
  seed_ticker,
};

// ---- Action implementations ------------------------------------------------
//
// Each action takes a `state` object: { projects, tasks, activity, ticker,
// presence, tickerSeeds, recomputeProject, maybePromoteProject } and returns
// an array of WS events to broadcast (zero or more).

function advance_task(state) {
  const advanceable = state.tasks.filter((t) => t.status !== 'completed');
  if (advanceable.length === 0) return [];
  const t = advanceable[Math.floor(Math.random() * advanceable.length)];
  const next = t.status === 'not_started' ? 'in_progress' : 'completed';
  t.status = next;
  state.maybePromoteProject(t.projectId, next);
  const project = state.recomputeProject(t.projectId);
  const activity = appendActivity(state, {
    type: next === 'completed' ? 'task_completed' : 'status_changed',
    projectId: t.projectId,
    projectName: project.name,
    actor: pickRandomActor(state),
    message: next === 'completed' ? `completed "${t.title}"` : `started "${t.title}"`,
  });
  const events = [
    { type: 'task_updated', task: t, project },
    { type: 'activity_added', item: activity },
  ];
  // Project status may have been promoted - emit project_updated too.
  events.push({ type: 'project_updated', project });
  return events;
}

function flip_project_status(state) {
  const flippable = state.projects.filter((p) => p.status !== 'completed');
  if (flippable.length === 0) return [];
  const p = flippable[Math.floor(Math.random() * flippable.length)];
  p.status = 'completed';
  // Child tasks are intentionally NOT force-completed - this action models a PM
  // marking the project done as an external override, not a bottom-up task rollup.
  // No task_updated events are emitted as a result.
  const project = state.recomputeProject(p.id);
  const activity = appendActivity(state, {
    type: 'status_changed',
    projectId: p.id,
    projectName: p.name,
    actor: pickRandomActor(state),
    message: `marked "${p.name}" as completed`,
  });
  return [
    { type: 'project_updated', project },
    { type: 'activity_added', item: activity },
  ];
}

function rotate_presence(state) {
  if (state.presence.length === 0 || state.projects.length === 0) return [];
  const i = Math.floor(Math.random() * state.presence.length);
  const otherProjects = state.projects.filter((p) => p.id !== state.presence[i].projectId);
  if (otherProjects.length === 0) return [];
  const next = otherProjects[Math.floor(Math.random() * otherProjects.length)];
  state.presence[i] = {
    ...state.presence[i],
    projectId: next.id,
    projectName: next.name,
    since: new Date().toISOString(),
  };
  return [{ type: 'presence_changed', entries: [...state.presence] }];
}

function derive_ticker(state) {
  // Pick a project that's making progress and emit a milestone item.
  const candidates = state.projects.filter((p) => p.progress > 0 && p.progress < 1);
  if (candidates.length === 0) return [];
  const p = candidates[Math.floor(Math.random() * candidates.length)];
  const pct = Math.round(p.progress * 100);
  const item = {
    id: `tk_${Date.now().toString(36)}`,
    kind: 'milestone',
    message: `${p.name} just hit ${pct}%`,
    projectId: p.id,
    projectName: p.name,
    timestamp: new Date().toISOString(),
  };
  state.ticker.unshift(item);
  if (state.ticker.length > 12) state.ticker.length = 12;
  return [{ type: 'ticker_updated', item }];
}

function seed_ticker(state) {
  if (state.tickerSeeds.length === 0) return [];
  const seed = state.tickerSeeds[Math.floor(Math.random() * state.tickerSeeds.length)];
  const item = {
    ...seed,
    id: `tk_${Date.now().toString(36)}`,
    timestamp: new Date().toISOString(),
  };
  state.ticker.unshift(item);
  if (state.ticker.length > 12) state.ticker.length = 12;
  return [{ type: 'ticker_updated', item }];
}

// ---- Helpers ---------------------------------------------------------------

function appendActivity(state, partial) {
  const activity = {
    id: `a_${Date.now().toString(36)}_${Math.floor(Math.random() * 1000)}`,
    timestamp: new Date().toISOString(),
    ...partial,
  };
  state.activity.unshift(activity);
  return activity;
}

function pickRandomActor(state) {
  // Pull from the unique set of project owners. The simulator doesn't read
  // a separate users list - owners are good enough.
  const seen = new Set();
  const actors = [];
  for (const p of state.projects) {
    if (!seen.has(p.owner.id)) {
      seen.add(p.owner.id);
      actors.push({ id: p.owner.id, name: p.owner.name, initials: p.owner.initials });
    }
  }
  return actors[Math.floor(Math.random() * actors.length)];
}

// ---- Loop ------------------------------------------------------------------

/**
 * Start the simulator. Returns { stop, isRunning, getTickCount }.
 *
 * The loop pauses when `getClientCount()` returns 0 and resumes when it goes
 * back above 0. Pause is checked at each tick boundary (cheap polling).
 */
export function startSimulator({ state, broadcast, getClientCount, intervalMs = TICK_MS }) {
  let tickCount = 0;
  let interval = null;

  function tick() {
    if (getClientCount() === 0) return; // Pause condition - skip this tick.
    const action = pickWeightedAction(ACTION_WEIGHTS, Math.random());
    const events = ACTIONS[action](state);
    for (const ev of events) broadcast(ev);
    tickCount++;
    state.simulatorTickCount = tickCount;
  }

  interval = setInterval(tick, intervalMs);

  return {
    stop() {
      if (interval) {
        clearInterval(interval);
        interval = null;
      }
    },
    isRunning() {
      return interval !== null;
    },
    getTickCount() {
      return tickCount;
    },
  };
}
