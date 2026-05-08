import assert from 'node:assert/strict';
import { after, before, test } from 'node:test';
import { WebSocket } from 'ws';
import { startServer } from './server.js';

let server;
const BASE = 'http://localhost:3001';

before(async () => {
  server = await startServer(3001);
});

after(async () => {
  await new Promise((resolve) => server.close(resolve));
});

test('GET /api/projects returns 200 and the full project list', async () => {
  const res = await fetch(`${BASE}/api/projects`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body));
  assert.equal(body.length, 36);
});

test('GET /api/projects items have the documented shape', async () => {
  const res = await fetch(`${BASE}/api/projects`);
  const [first] = await res.json();
  assert.ok(typeof first.id === 'string');
  assert.ok(typeof first.name === 'string');
  assert.ok(['not_started', 'in_progress', 'completed', 'overdue'].includes(first.status));
  assert.ok(typeof first.owner.initials === 'string');
  assert.ok(typeof first.owner.avatarColor === 'string');
});

test('GET /api/activity returns 200 and an array of 20 items, newest-first', async () => {
  const res = await fetch(`${BASE}/api/activity`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.length, 20);
  const t0 = new Date(body[0].timestamp).getTime();
  const t1 = new Date(body[1].timestamp).getTime();
  assert.ok(t0 >= t1, 'activity should be sorted newest-first');
});

test('?fail=true returns 500 with an error body', async () => {
  const res = await fetch(`${BASE}/api/projects?fail=true`);
  assert.equal(res.status, 500);
  const body = await res.json();
  assert.equal(body.error, 'Something went wrong');
});

test('?empty=true returns 200 with an empty array', async () => {
  const res = await fetch(`${BASE}/api/activity?empty=true`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.deepEqual(body, []);
});

test('responses are delayed by at least 20ms', async () => {
  const t0 = Date.now();
  await fetch(`${BASE}/api/projects`);
  const elapsed = Date.now() - t0;
  assert.ok(elapsed >= 20, `expected delay ≥20ms, got ${elapsed}ms`);
});

test('CORS allows any origin', async () => {
  const res = await fetch(`${BASE}/api/projects`);
  assert.equal(res.headers.get('access-control-allow-origin'), '*');
});

test('PATCH /api/projects/:id updates whitelisted fields and ignores derived ones', async () => {
  const res = await fetch(`${BASE}/api/projects/p_012`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'in_progress', progress: 0.99, tasksDone: 999 }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.id, 'p_012');
  assert.equal(body.status, 'in_progress');
  assert.equal(body.name, 'Knowledge Base');
  assert.notEqual(body.progress, 0.99, 'progress should be derived, not patchable');
  assert.notEqual(body.tasksDone, 999, 'tasksDone should be derived, not patchable');
});

test('PATCH /api/projects/:id returns 404 for unknown id', async () => {
  const res = await fetch(`${BASE}/api/projects/p_does_not_exist`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'completed' }),
  });
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.error, 'Project not found');
});

test('PATCH ?fail=true returns 500 with an error body', async () => {
  const res = await fetch(`${BASE}/api/projects/p_001?fail=true`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'completed' }),
  });
  assert.equal(res.status, 500);
  const body = await res.json();
  assert.equal(body.error, 'Something went wrong');
});

test('DELETE /api/projects/:id removes the project', async () => {
  const res = await fetch(`${BASE}/api/projects/p_011`, { method: 'DELETE' });
  assert.equal(res.status, 204);
  const list = await fetch(`${BASE}/api/projects`).then((r) => r.json());
  assert.ok(!list.some((p) => p.id === 'p_011'), 'p_011 should no longer be in the list');
});

test('DELETE /api/projects/:id returns 404 for unknown id', async () => {
  const res = await fetch(`${BASE}/api/projects/p_011`, { method: 'DELETE' });
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.error, 'Project not found');
});

test('DELETE ?fail=true returns 500 with an error body', async () => {
  const res = await fetch(`${BASE}/api/projects/p_001?fail=true`, { method: 'DELETE' });
  assert.equal(res.status, 500);
  const body = await res.json();
  assert.equal(body.error, 'Something went wrong');
});

test('GET /api/projects/:id/tasks returns tasks for that project only', async () => {
  const project = await fetch(`${BASE}/api/projects`).then((r) => r.json()).then((all) => all.find((p) => p.id === 'p_001'));
  const res = await fetch(`${BASE}/api/projects/p_001/tasks`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body));
  assert.equal(body.length, project.tasksTotal);
  assert.ok(body.every((t) => t.projectId === 'p_001'));
  assert.equal(body.filter((t) => t.status === 'completed').length, project.tasksDone);
  // Tasks now have realistic titles and a description field.
  assert.ok(body.every((t) => typeof t.title === 'string' && t.title.length > 0));
  assert.ok(body.every((t) => typeof t.description === 'string'));
});

test('GET /api/projects/:id/tasks returns 404 for unknown project', async () => {
  const res = await fetch(`${BASE}/api/projects/p_does_not_exist/tasks`);
  assert.equal(res.status, 404);
});

test('POST /api/projects/:id/tasks creates a task and returns the recomputed project', async () => {
  const before = await fetch(`${BASE}/api/projects`).then((r) => r.json()).then((all) => all.find((p) => p.id === 'p_005'));
  const res = await fetch(`${BASE}/api/projects/p_005/tasks`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'New deliverable', description: 'A task added by the test.' }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.task.projectId, 'p_005');
  assert.equal(body.task.title, 'New deliverable');
  assert.equal(body.task.description, 'A task added by the test.');
  assert.equal(body.task.status, 'not_started');
  assert.equal(body.project.id, 'p_005');
  assert.equal(body.project.tasksTotal, before.tasksTotal + 1);
  assert.equal(body.project.tasksDone, before.tasksDone);
});

test('POST task auto-promotes a not_started project when status is in_progress', async () => {
  // p_008 starts as not_started
  const res = await fetch(`${BASE}/api/projects/p_008/tasks`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Kickoff', status: 'in_progress' }),
  });
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.project.status, 'in_progress', 'project was promoted');
});

test('POST task returns 400 when title is missing or blank', async () => {
  const res = await fetch(`${BASE}/api/projects/p_001/tasks`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: '   ' }),
  });
  assert.equal(res.status, 400);
});

test('POST task returns 404 for unknown project', async () => {
  const res = await fetch(`${BASE}/api/projects/p_does_not_exist/tasks`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'Anything' }),
  });
  assert.equal(res.status, 404);
});

test('PATCH /api/tasks/:taskId updates the task and returns recomputed project counts', async () => {
  const tasks = await fetch(`${BASE}/api/projects/p_002/tasks`).then((r) => r.json());
  const target = tasks.find((t) => t.status === 'not_started');
  assert.ok(target, 'expected at least one not_started task in p_002');
  const beforeProject = await fetch(`${BASE}/api/projects`).then((r) => r.json()).then((all) => all.find((p) => p.id === 'p_002'));
  const res = await fetch(`${BASE}/api/tasks/${target.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'completed' }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.task.id, target.id);
  assert.equal(body.task.status, 'completed');
  assert.equal(body.project.id, 'p_002');
  assert.equal(body.project.tasksDone, beforeProject.tasksDone + 1);
});

test('PATCH task auto-promotes a not_started project', async () => {
  // p_008 status was promoted earlier by POST. Verify reverting a task to
  // not_started does NOT demote (server only promotes).
  const tasks = await fetch(`${BASE}/api/projects/p_008/tasks`).then((r) => r.json());
  const anyTask = tasks[0];
  const res = await fetch(`${BASE}/api/tasks/${anyTask.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'not_started' }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.project.status, 'in_progress', 'server does not demote on task revert');
});

test('PATCH task returns 404 for unknown id', async () => {
  const res = await fetch(`${BASE}/api/tasks/does_not_exist`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'completed' }),
  });
  assert.equal(res.status, 404);
});

test('DELETE /api/tasks/:taskId removes the task and recomputes the project', async () => {
  const tasks = await fetch(`${BASE}/api/projects/p_003/tasks`).then((r) => r.json());
  const completed = tasks.find((t) => t.status === 'completed');
  assert.ok(completed, 'expected at least one completed task in p_003');
  const beforeProject = await fetch(`${BASE}/api/projects`).then((r) => r.json()).then((all) => all.find((p) => p.id === 'p_003'));
  const res = await fetch(`${BASE}/api/tasks/${completed.id}`, { method: 'DELETE' });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.project.id, 'p_003');
  assert.equal(body.project.tasksTotal, beforeProject.tasksTotal - 1);
  assert.equal(body.project.tasksDone, beforeProject.tasksDone - 1);
  const list = await fetch(`${BASE}/api/projects/p_003/tasks`).then((r) => r.json());
  assert.ok(!list.some((t) => t.id === completed.id));
});

test('DELETE task returns 404 for unknown id', async () => {
  const res = await fetch(`${BASE}/api/tasks/does_not_exist`, { method: 'DELETE' });
  assert.equal(res.status, 404);
});

test('PATCH a past dueDate forces status to overdue', async () => {
  // p_005 starts in_progress with a future dueDate. Patch dueDate to the past
  // and the server should auto-set status to overdue.
  const res = await fetch(`${BASE}/api/projects/p_005`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ dueDate: '2025-01-01' }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.dueDate, '2025-01-01');
  assert.equal(body.status, 'overdue', 'status should be auto-set to overdue');
});

test('GET /api/projects refreshes overdue status before returning', async () => {
  const list = await fetch(`${BASE}/api/projects`).then((r) => r.json());
  // p_005 was force-overdue by the previous test; verify it's still overdue.
  const p005 = list.find((p) => p.id === 'p_005');
  assert.ok(p005, 'p_005 still present');
  assert.equal(p005.status, 'overdue');
  // Completed projects with past dueDate must NOT be flipped to overdue.
  const p004 = list.find((p) => p.id === 'p_004');
  assert.equal(p004.status, 'completed');
});

test('Task endpoints respect ?fail=true', async () => {
  const tasks = await fetch(`${BASE}/api/projects/p_001/tasks`).then((r) => r.json());
  const anyTaskId = tasks[0].id;

  const get = await fetch(`${BASE}/api/projects/p_001/tasks?fail=true`);
  assert.equal(get.status, 500);

  const post = await fetch(`${BASE}/api/projects/p_001/tasks?fail=true`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ title: 'x' }),
  });
  assert.equal(post.status, 500);

  const patch = await fetch(`${BASE}/api/tasks/${anyTaskId}?fail=true`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ status: 'completed' }),
  });
  assert.equal(patch.status, 500);

  const del = await fetch(`${BASE}/api/tasks/${anyTaskId}?fail=true`, { method: 'DELETE' });
  assert.equal(del.status, 500);
});

test('GET /api/ticker returns 200 and an array of items', async () => {
  const res = await fetch(`${BASE}/api/ticker`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body));
  assert.ok(body.length > 0, 'ticker should be seeded with at least one item');
  const first = body[0];
  assert.ok(typeof first.id === 'string');
  assert.ok(['announcement', 'incident', 'milestone'].includes(first.kind));
  assert.ok(typeof first.message === 'string');
  assert.ok(typeof first.timestamp === 'string');
});

test('GET /api/ticker is sorted newest-first', async () => {
  const res = await fetch(`${BASE}/api/ticker`);
  const body = await res.json();
  for (let i = 1; i < body.length; i++) {
    const t0 = new Date(body[i - 1].timestamp).getTime();
    const t1 = new Date(body[i].timestamp).getTime();
    assert.ok(t0 >= t1, `ticker not newest-first at index ${i}`);
  }
});

test('GET /api/ticker respects ?fail=true and ?empty=true', async () => {
  const fail = await fetch(`${BASE}/api/ticker?fail=true`);
  assert.equal(fail.status, 500);
  const empty = await fetch(`${BASE}/api/ticker?empty=true`);
  assert.equal(empty.status, 200);
  assert.deepEqual(await empty.json(), []);
});

test('GET /api/presence returns 200 and an array', async () => {
  const res = await fetch(`${BASE}/api/presence`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body));
  if (body.length > 0) {
    const first = body[0];
    assert.ok(first.user && typeof first.user.id === 'string');
    assert.ok(typeof first.projectId === 'string');
    assert.ok(typeof first.projectName === 'string');
    assert.ok(typeof first.since === 'string');
  }
});

test('GET /api/presence respects ?fail=true and ?empty=true', async () => {
  const fail = await fetch(`${BASE}/api/presence?fail=true`);
  assert.equal(fail.status, 500);
  const empty = await fetch(`${BASE}/api/presence?empty=true`);
  assert.equal(empty.status, 200);
  assert.deepEqual(await empty.json(), []);
});

test('GET /api/__debug/snapshot returns the full in-memory state', async () => {
  const res = await fetch(`${BASE}/api/__debug/snapshot`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.ok(Array.isArray(body.projects));
  assert.ok(Array.isArray(body.tasks));
  assert.ok(Array.isArray(body.activity));
  assert.ok(Array.isArray(body.ticker));
  assert.ok(Array.isArray(body.presence));
  assert.ok(typeof body.simulatorTickCount === 'number');
});

test('PATCH /api/tasks/:taskId can update description', async () => {
  const tasks = await fetch(`${BASE}/api/projects/p_001/tasks`).then((r) => r.json());
  const target = tasks[0];
  const newDesc = 'Updated by the test.';
  const res = await fetch(`${BASE}/api/tasks/${target.id}`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ description: newDesc }),
  });
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.task.id, target.id);
  assert.equal(body.task.description, newDesc);
  assert.equal(body.task.title, target.title, 'title preserved');
  assert.equal(body.task.status, target.status, 'status preserved');
});

test('WebSocket: hello message arrives on connect', async () => {
  const ws = new WebSocket('ws://localhost:3001/ws');
  const hello = await new Promise((resolve, reject) => {
    ws.on('message', (data) => resolve(JSON.parse(data.toString())));
    ws.on('error', reject);
    setTimeout(() => reject(new Error('timeout waiting for hello')), 2000);
  });
  ws.close();
  assert.equal(hello.type, 'hello');
  assert.equal(hello.protocolVersion, 1);
  assert.ok(typeof hello.serverTime === 'string');
});

test('WebSocket: simulator emits drift events while a client is connected', { timeout: 15000 }, async () => {
  const ws = new WebSocket('ws://localhost:3001/ws');
  const events = [];
  await new Promise((resolve, reject) => {
    ws.on('message', (data) => {
      const ev = JSON.parse(data.toString());
      events.push(ev);
      if (events.length >= 3) resolve();
    });
    ws.on('error', reject);
    setTimeout(() => reject(new Error('timeout - got ' + events.length + ' events')), 12000);
  });
  ws.close();
  assert.equal(events[0].type, 'hello', 'first event is hello');
  assert.ok(events.length >= 3, 'should have hello + at least 2 drift events');
  const driftTypes = events.slice(1).map((e) => e.type);
  assert.ok(driftTypes.every((t) => [
    'activity_added', 'project_updated', 'task_updated',
    'ticker_updated', 'presence_changed',
  ].includes(t)), `unexpected drift type in ${JSON.stringify(driftTypes)}`);
});
