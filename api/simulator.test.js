import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pickWeightedAction, ACTIONS } from './simulator.js';

test('pickWeightedAction returns one of the action keys', () => {
  const weights = { a: 1, b: 1, c: 1 };
  const choice = pickWeightedAction(weights, 0.5); // synthetic random
  assert.ok(['a', 'b', 'c'].includes(choice));
});

test('pickWeightedAction respects weighting', () => {
  const weights = { rare: 1, common: 99 };
  // With random=0.0 it picks the first bucket; with random=0.99 it picks the last.
  assert.equal(pickWeightedAction(weights, 0.0), 'rare');
  assert.equal(pickWeightedAction(weights, 0.5), 'common');
  assert.equal(pickWeightedAction(weights, 0.99), 'common');
});

test('advance_task moves a not_started task to in_progress and emits events', () => {
  const project = {
    id: 'p_x', name: 'Test', status: 'not_started', progress: 0, tasksTotal: 1, tasksDone: 0,
    owner: { id: 'u_01', name: 'Alice', initials: 'A', avatarColor: '#000' },
    description: '', dueDate: '2030-01-01', tags: [],
  };
  const task = { id: 't1', projectId: 'p_x', title: 'Do it', description: '', status: 'not_started' };
  const state = {
    projects: [project],
    tasks: [task],
    activity: [],
    ticker: [],
    presence: [],
    tickerSeeds: [],
    recomputeProject(id) {
      const p = this.projects.find((x) => x.id === id);
      const ts = this.tasks.filter((t) => t.projectId === id);
      p.tasksTotal = ts.length;
      p.tasksDone = ts.filter((t) => t.status === 'completed').length;
      p.progress = p.tasksTotal === 0 ? 0 : p.tasksDone / p.tasksTotal;
      return p;
    },
    maybePromoteProject(id, status) {
      const p = this.projects.find((x) => x.id === id);
      if (p.status === 'not_started' && (status === 'in_progress' || status === 'completed')) {
        p.status = 'in_progress';
      }
    },
  };

  const events = ACTIONS.advance_task(state);

  assert.ok(['in_progress', 'completed'].includes(task.status));
  assert.equal(project.status, 'in_progress', 'project promoted from not_started');
  assert.ok(events.some((e) => e.type === 'task_updated'));
  assert.ok(events.some((e) => e.type === 'activity_added'));
  assert.ok(events.some((e) => e.type === 'project_updated'));
});

test('rotate_presence moves a presence entry to a different project', () => {
  const projects = [
    { id: 'p_a', name: 'A', owner: { id: 'u_01', name: 'X', initials: 'X', avatarColor: '#000' }, description: '', status: 'in_progress', dueDate: '', progress: 0, tasksTotal: 0, tasksDone: 0, tags: [] },
    { id: 'p_b', name: 'B', owner: { id: 'u_02', name: 'Y', initials: 'Y', avatarColor: '#000' }, description: '', status: 'in_progress', dueDate: '', progress: 0, tasksTotal: 0, tasksDone: 0, tags: [] },
  ];
  const state = {
    projects,
    tasks: [],
    activity: [],
    ticker: [],
    presence: [{ user: { id: 'u_01', name: 'X', initials: 'X' }, projectId: 'p_a', projectName: 'A', since: '2026-05-01T00:00:00Z' }],
    tickerSeeds: [],
    recomputeProject() {},
    maybePromoteProject() {},
  };

  const events = ACTIONS.rotate_presence(state);
  assert.equal(state.presence[0].projectId, 'p_b', 'presence rotated to the other project');
  assert.ok(events.some((e) => e.type === 'presence_changed'));
});
