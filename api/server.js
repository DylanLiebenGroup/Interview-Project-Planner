import cors from 'cors';
import express from 'express';
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startSimulator } from './simulator.js';
import { attachWsServer } from './ws.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROJECT_PATCH_FIELDS = ['name', 'description', 'status', 'dueDate', 'tags'];
const TASK_PATCH_FIELDS = ['title', 'description', 'status'];

async function loadJson(name) {
  const raw = await readFile(join(__dirname, 'data', `${name}.json`), 'utf-8');
  return JSON.parse(raw);
}

function delayMiddleware(req, _res, next) {
  const ms = Math.floor(Math.random() * 481) + 20; // 20–500ms
  setTimeout(next, ms);
}

function makeHandler(dataset) {
  return (req, res) => {
    if (req.query.fail === 'true') {
      return res.status(500).json({ error: 'Something went wrong' });
    }
    if (req.query.empty === 'true') {
      return res.json([]);
    }
    res.json(dataset);
  };
}

function pickFields(body, allowed) {
  const out = {};
  for (const key of allowed) {
    if (body && body[key] !== undefined) out[key] = body[key];
  }
  return out;
}

export async function startServer(port) {
  const projects = await loadJson('projects');
  const activity = await loadJson('activity');
  activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  let tasks = await loadJson('tasks');

  // Boot-time sanity check: every project's tasksTotal/tasksDone must match
  // counts derivable from tasks.json. Catches drift during fixture edits.
  for (const p of projects) {
    const ts = tasks.filter((t) => t.projectId === p.id);
    const done = ts.filter((t) => t.status === 'completed').length;
    if (ts.length !== p.tasksTotal) {
      throw new Error(`Fixture drift: project ${p.id} has tasksTotal=${p.tasksTotal} but tasks.json contains ${ts.length}`);
    }
    if (done !== p.tasksDone) {
      throw new Error(`Fixture drift: project ${p.id} has tasksDone=${p.tasksDone} but tasks.json contains ${done} completed`);
    }
  }

  let nextTaskSeq =
    tasks.reduce((max, t) => {
      const n = parseInt(t.id.split('_t')[1] ?? '0', 10);
      return n > max ? n : max;
    }, 0) + 1;

  const tickerSeeds = await loadJson('ticker-seeds');
  let presence = await loadJson('presence-seed');

  // Live ticker buffer - capped at 12, newest-first. Initialised from seeds.
  let ticker = [...tickerSeeds]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 12);

  const todayMidnight = () => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  };

  const applyOverdueIfPast = (project) => {
    if (!project || project.status === 'completed') return;
    if (!project.dueDate) return;
    if (new Date(project.dueDate) < todayMidnight()) {
      project.status = 'overdue';
    }
  };

  const refreshAllOverdue = () => {
    for (const p of projects) applyOverdueIfPast(p);
  };

  const recomputeProject = (projectId) => {
    const project = projects.find((p) => p.id === projectId);
    if (!project) return null;
    const projectTasks = tasks.filter((t) => t.projectId === projectId);
    project.tasksTotal = projectTasks.length;
    project.tasksDone = projectTasks.filter((t) => t.status === 'completed').length;
    project.progress = project.tasksTotal === 0 ? 0 : project.tasksDone / project.tasksTotal;
    applyOverdueIfPast(project);
    return project;
  };

  const maybePromoteProject = (projectId, taskStatus) => {
    if (taskStatus !== 'in_progress' && taskStatus !== 'completed') return;
    const project = projects.find((p) => p.id === projectId);
    if (project && project.status === 'not_started') {
      project.status = 'in_progress';
    }
  };

  // Live state object - used by the simulator and the snapshot endpoint.
  // Most arrays are mutated in place; only `tasks` is rebound (DELETE project
  // filters it), so it needs a getter to keep the snapshot fresh.
  const state = {
    projects,
    get tasks() { return tasks; },
    activity,
    ticker,
    presence,
    tickerSeeds,
    recomputeProject,
    maybePromoteProject,
    simulatorTickCount: 0,
  };

  // Initial sweep so the seed reflects today's date.
  refreshAllOverdue();

  const app = express();
  app.use(cors({ origin: '*' }));
  app.use(express.json());
  app.use(delayMiddleware);

  app.get('/api/projects', (req, res) => {
    if (req.query.fail === 'true') {
      return res.status(500).json({ error: 'Something went wrong' });
    }
    if (req.query.empty === 'true') {
      return res.json([]);
    }
    refreshAllOverdue();
    res.json(projects);
  });
  app.get('/api/activity', makeHandler(activity));

  app.get('/api/ticker', (req, res) => {
    if (req.query.fail === 'true') {
      return res.status(500).json({ error: 'Something went wrong' });
    }
    if (req.query.empty === 'true') {
      return res.json([]);
    }
    res.json(ticker);
  });

  app.get('/api/presence', (req, res) => {
    if (req.query.fail === 'true') {
      return res.status(500).json({ error: 'Something went wrong' });
    }
    if (req.query.empty === 'true') {
      return res.json([]);
    }
    res.json(presence);
  });

  app.patch('/api/projects/:id', (req, res) => {
    if (req.query.fail === 'true') {
      return res.status(500).json({ error: 'Something went wrong' });
    }
    const idx = projects.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const patch = pickFields(req.body, PROJECT_PATCH_FIELDS);
    projects[idx] = { ...projects[idx], ...patch };
    applyOverdueIfPast(projects[idx]);
    res.json(projects[idx]);
  });

  app.delete('/api/projects/:id', (req, res) => {
    if (req.query.fail === 'true') {
      return res.status(500).json({ error: 'Something went wrong' });
    }
    const idx = projects.findIndex((p) => p.id === req.params.id);
    if (idx === -1) {
      return res.status(404).json({ error: 'Project not found' });
    }
    projects.splice(idx, 1);
    tasks = tasks.filter((t) => t.projectId !== req.params.id);
    res.status(204).end();
  });

  app.get('/api/projects/:id/tasks', (req, res) => {
    if (req.query.fail === 'true') {
      return res.status(500).json({ error: 'Something went wrong' });
    }
    const project = projects.find((p) => p.id === req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    if (req.query.empty === 'true') {
      return res.json([]);
    }
    res.json(tasks.filter((t) => t.projectId === req.params.id));
  });

  app.post('/api/projects/:id/tasks', (req, res) => {
    if (req.query.fail === 'true') {
      return res.status(500).json({ error: 'Something went wrong' });
    }
    const project = projects.find((p) => p.id === req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    const title = (req.body?.title ?? '').trim();
    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }
    const status = req.body?.status ?? 'not_started';
    const description = req.body?.description ?? '';
    const task = {
      id: `${project.id}_t${String(nextTaskSeq++).padStart(3, '0')}`,
      projectId: project.id,
      title,
      description,
      status,
    };
    tasks.push(task);
    maybePromoteProject(project.id, status);
    res.status(201).json({ task, project: recomputeProject(project.id) });
  });

  app.patch('/api/tasks/:taskId', (req, res) => {
    if (req.query.fail === 'true') {
      return res.status(500).json({ error: 'Something went wrong' });
    }
    const idx = tasks.findIndex((t) => t.id === req.params.taskId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const existing = tasks[idx];
    const patch = pickFields(req.body, TASK_PATCH_FIELDS);
    const updated = { ...existing, ...patch, id: existing.id, projectId: existing.projectId };
    tasks[idx] = updated;
    maybePromoteProject(existing.projectId, updated.status);
    res.json({ task: updated, project: recomputeProject(existing.projectId) });
  });

  app.delete('/api/tasks/:taskId', (req, res) => {
    if (req.query.fail === 'true') {
      return res.status(500).json({ error: 'Something went wrong' });
    }
    const idx = tasks.findIndex((t) => t.id === req.params.taskId);
    if (idx === -1) {
      return res.status(404).json({ error: 'Task not found' });
    }
    const [removed] = tasks.splice(idx, 1);
    res.json({ project: recomputeProject(removed.projectId) });
  });

  app.get('/api/__debug/snapshot', (_req, res) => {
    res.json({
      projects: state.projects,
      tasks: state.tasks,
      activity: state.activity,
      ticker: state.ticker,
      presence: state.presence,
      simulatorTickCount: state.simulatorTickCount,
    });
  });

  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`API listening on http://localhost:${port}`);

      // Mount WS server on the same port.
      const ws = attachWsServer(server, '/ws');

      // Start the drift simulator. Pauses while no clients are connected.
      const simulator = startSimulator({
        state,
        broadcast: ws.broadcast,
        getClientCount: ws.clientCount,
      });

      // Tests call server.close(); ensure WS + simulator tear down too.
      const originalClose = server.close.bind(server);
      server.close = (cb) => {
        simulator.stop();
        ws.close().then(() => originalClose(cb));
      };

      resolve(server);
    });
  });
}

// Run when invoked directly (not when imported by tests)
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  startServer(3001).catch((err) => {
    console.error('Failed to start API:', err.message);
    process.exit(1);
  });
}
