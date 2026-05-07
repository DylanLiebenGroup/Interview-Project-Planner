import express from 'express';
import cors from 'cors';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const PROJECT_PATCH_FIELDS = ['name', 'description', 'status', 'dueDate', 'tags'];
const TASK_PATCH_FIELDS = ['title', 'status'];

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

// Generate one task per unit of project.tasksTotal, with the first
// project.tasksDone marked completed. Stable IDs so URLs are deterministic.
function seedTasksFromProjects(projects) {
  const tasks = [];
  for (const p of projects) {
    for (let i = 1; i <= p.tasksTotal; i++) {
      tasks.push({
        id: `${p.id}_t${String(i).padStart(3, '0')}`,
        projectId: p.id,
        title: `Task ${i}`,
        status: i <= p.tasksDone ? 'completed' : 'not_started',
      });
    }
  }
  return tasks;
}

export async function startServer(port) {
  const projects = await loadJson('projects');
  const activity = await loadJson('activity');
  activity.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  let tasks = seedTasksFromProjects(projects);
  let nextTaskSeq = tasks.length + 1;

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
    const task = {
      id: `${project.id}_t${String(nextTaskSeq++).padStart(3, '0')}`,
      projectId: project.id,
      title,
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

  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`API listening on http://localhost:${port}`);
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
