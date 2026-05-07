import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-instructions',
  standalone: true,
  imports: [RouterLink],
  template: `
    <article class="brief">
      <header>
        <h1>Frontend Interview: Build a Project Dashboard</h1>
      </header>

      <aside class="notice">
        <h2>Please don't use AI tools</h2>
        <p>
          This is your chance to showcase <em>your</em> skills. We're not interested in how
          well Claude, ChatGPT, Copilot, or any other AI assistant can write code - we need
          to see that <strong>you</strong> know what you're doing.
        </p>
        <p class="muted">
          That means no AI autocomplete, no chat assistants, and no pasting the brief into
          a model. Plain editor, docs, and your own thinking. If you're unsure about
          something, ask us - we'd rather talk it through than have a model answer for you.
        </p>
      </aside>

      <section>
        <h2>Context</h2>
        <p>
          You're building the <code>/dashboard</code> route in this app. The rest of the site
          is already built; treat the existing <a routerLink="/projects">/projects</a> page as a
          reference for the codebase patterns we use (signals, standalone components,
          <code>inject()</code>, the new <code>&#64;if</code>/<code>&#64;for</code> control flow,
          and Angular Material).
        </p>
      </section>

      <section>
        <h2>The brief</h2>

        <h3>Must-have - without these, the build doesn't ship</h3>
        <ol>
          <li><strong>Fetch and display projects.</strong> Call <code>apiService.getProjects()</code>. Render the list (table, card grid - your choice).</li>
          <li><strong>Stat cards row.</strong> Four cards across the top: <em>Total</em>, <em>In progress</em>, <em>Overdue</em>, <em>Completed</em>. Each shows a count derived from the projects data.</li>
          <li><strong>Loading state.</strong> While projects are fetching, show a loading indicator. The API delay varies (20–500ms) - your loading UI should feel intentional under both conditions.</li>
          <li><strong>Error state.</strong> If the API fails (test with <code>?fail=true</code>), show a clear error message. Don't render the dashboard as if it were empty.</li>
        </ol>

        <h3>Should-have - depth and polish</h3>
        <ol start="5">
          <li><strong>Activity feed.</strong> Call <code>apiService.getActivity()</code> and render the recent activity list somewhere on the dashboard. Format timestamps in a friendly way ("2h ago", or another sensible format).</li>
          <li><strong>Responsive layout.</strong> Looks good on a typical desktop (≥1280px) and at 1920×1080 with 125% Windows scaling (effective ~1536×864 - common in our user base). Acceptable down to ~768px. Stat cards stack or wrap; the project list remains usable.</li>
          <li><strong>Visual polish.</strong> Consistent spacing, sensible typography, hover states where appropriate. Status should be visually distinguishable (a coloured badge or pill, not just text). Use Angular Material components, the existing CSS variables in <code>styles.scss</code>, or roll your own - all are fine; arbitrary styling is not.</li>
        </ol>

        <h3>Nice-to-have - if there's time</h3>
        <ol start="8">
          <li><strong>Filter or sort the project list.</strong> Pick one (status filter, owner filter, sort by due date). Use Angular signals or computed values.</li>
          <li><strong>Empty state.</strong> Test with <code>?empty=true</code>. Show something useful when there are no projects/activity instead of a blank panel.</li>
          <li><strong>Component decomposition.</strong> Break the dashboard into 2–3 smaller components (e.g. <code>StatCard</code>, <code>ProjectListItem</code>, <code>ActivityFeed</code>) rather than one big file.</li>
        </ol>
      </section>

      <section>
        <h2>API reference</h2>

        <h3><code>GET /api/projects</code></h3>
        <p>Returns an array of projects.</p>
<pre><code>{{ projectSample }}</code></pre>
        <p><code>status</code> is one of: <code>"not_started"</code> | <code>"in_progress"</code> | <code>"completed"</code> | <code>"overdue"</code>.</p>

        <h3><code>GET /api/activity</code></h3>
        <p>Returns an array of recent activity, newest first.</p>
<pre><code>{{ activitySample }}</code></pre>
        <p><code>type</code> is one of: <code>"task_completed"</code> | <code>"project_created"</code> | <code>"comment_added"</code> | <code>"status_changed"</code>.</p>

        <h3>Test modes</h3>
        <ul>
          <li><code>?fail=true</code> - returns 500 with <code>&#123; "error": "Something went wrong" &#125;</code>.</li>
          <li><code>?empty=true</code> - returns <code>[]</code>.</li>
        </ul>
        <p>All endpoints share a 20–500ms artificial delay. Use Chrome DevTools network throttling to verify your loading UI behaves under slower conditions.</p>

        <h3>Mutation endpoints</h3>
        <p class="muted">
          These power the existing <a routerLink="/projects">/projects</a> page. They aren't required for the
          dashboard build, but are documented here so you can extend things if you have time.
        </p>

        <h4><code>PATCH /api/projects/:id</code></h4>
        <p>
          Updates whitelisted fields: <code>name</code>, <code>description</code>, <code>status</code>,
          <code>dueDate</code>, <code>tags</code>. Any other fields in the body are ignored.
          <code>tasksTotal</code>, <code>tasksDone</code>, and <code>progress</code> are <strong>derived</strong>
          from the project's tasks - you can't set them directly. Returns the updated <code>Project</code>.
          <code>404</code> if the id doesn't exist.
        </p>

        <h4><code>DELETE /api/projects/:id</code></h4>
        <p>Removes the project and cascades to all of its tasks. Returns <code>204</code> on success, <code>404</code> if missing.</p>

        <h4><code>GET /api/projects/:id/tasks</code></h4>
        <p>Returns the tasks for a project. Supports <code>?empty=true</code> and <code>?fail=true</code>.</p>
<pre><code>{{ taskSample }}</code></pre>
        <p>Task <code>status</code> is one of: <code>"not_started"</code> | <code>"in_progress"</code> | <code>"completed"</code>.</p>

        <h4><code>POST /api/projects/:id/tasks</code></h4>
        <p>
          Creates a task on the given project. Body: <code>&#123; title: string, status?: TaskStatus &#125;</code>.
          Returns <code>201</code> with both the new task and the recomputed project so the UI can update
          counts in one round-trip. <code>400</code> if title is missing or blank.
        </p>
<pre><code>{{ taskMutationSample }}</code></pre>

        <h4><code>PATCH /api/tasks/:taskId</code></h4>
        <p>
          Updates a task's <code>title</code> or <code>status</code>. Same response shape as POST
          (<code>&#123; task, project &#125;</code>). The server recomputes <code>tasksDone</code> and
          <code>progress</code> on the parent project.
        </p>

        <h4><code>DELETE /api/tasks/:taskId</code></h4>
        <p>Removes a task. Returns <code>200</code> with <code>&#123; project &#125;</code> so the parent's counts stay in sync.</p>

        <h3>Server-side cascades</h3>
        <ul>
          <li>Every task mutation recomputes the parent project's <code>tasksDone</code>, <code>tasksTotal</code>, and <code>progress</code> before returning.</li>
          <li>If a task on a <code>not_started</code> project moves to <code>in_progress</code> or <code>completed</code>, the project is auto-promoted to <code>in_progress</code>. The server only promotes - it never demotes.</li>
        </ul>
      </section>

      <section>
        <h2>What's pre-wired for you</h2>
        <ul>
          <li>
            <code>ApiService</code> in <code>core/api.service.ts</code> - read methods (<code>getProjects()</code>,
            <code>getActivity()</code>, <code>getTasks(projectId)</code>) and mutation methods
            (<code>updateProject</code>, <code>deleteProject</code>, <code>createTask</code>,
            <code>updateTask</code>, <code>deleteTask</code>) all already typed.
          </li>
          <li><code>Project</code>, <code>ActivityItem</code>, <code>Task</code>, <code>ProjectStatus</code>, and <code>TaskStatus</code> types in <code>core/models.ts</code>.</li>
          <li><code>ToastService</code> in <code>core/toast.service.ts</code> wraps <code>MatSnackBar</code> with <code>success/error/info</code> methods if you need notifications.</li>
          <li>The <code>/dashboard</code> route is already registered. You only need to fill in <code>features/dashboard/dashboard.component.ts</code>.</li>
        </ul>
      </section>

      <section>
        <h2>Tips</h2>
        <ul>
          <li>Commit when you finish each tier so we can see your progress.</li>
          <li>If you're stuck, talk it through - we're not grading silence.</li>
          <li>Polish matters, but only after Must-have works.</li>
          <li>The laptop's display may not match the test resolutions; resize the browser window to verify.</li>
          <li>The site uses Angular Material with the azure-blue prebuilt theme. CSS variables in <code>styles.scss</code> hold the rest of the palette. Use Material components, extend the tokens, or roll your own - just be intentional.</li>
        </ul>
      </section>

      <section>
        <h2>What we're looking for</h2>
        <ul>
          <li>Idiomatic Angular 20+.</li>
          <li>Real handling of loading, error, and empty states.</li>
          <li>Visual taste - does the dashboard feel considered?</li>
        </ul>
      </section>

      <p class="signoff">Good luck!</p>
    </article>
  `,
  styles: [`
    .brief {
      max-width: 800px;
      margin: 0 auto;
      background: var(--bg-panel);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-md);
      padding: var(--space-6);
      box-shadow: var(--shadow-card);
    }
    .meta { color: var(--text-secondary); margin: 0 0 var(--space-5); }
    .notice {
      background: color-mix(in srgb, var(--status-overdue) 8%, var(--bg-panel));
      border: 1px solid color-mix(in srgb, var(--status-overdue) 35%, transparent);
      border-left: 4px solid var(--status-overdue);
      border-radius: var(--radius-md);
      padding: var(--space-4) var(--space-5);
      margin-bottom: var(--space-6);
    }
    .notice h2 { margin: 0 0 var(--space-2); font-size: var(--font-size-lg); }
    .notice p { margin: 0 0 var(--space-2); }
    .notice p:last-child { margin-bottom: 0; }
    section { margin-bottom: var(--space-6); }
    h2 { margin-top: 0; }
    h3 { font-size: var(--font-size-base); margin: var(--space-4) 0 var(--space-2); }
    h4 {
      font-size: var(--font-size-base);
      font-weight: 600;
      margin: var(--space-3) 0 var(--space-1);
      color: var(--text-primary);
    }
    .muted { color: var(--text-secondary); margin: 0 0 var(--space-2); }
    code {
      background: var(--bg-app);
      padding: 1px 4px;
      border-radius: var(--radius-sm);
      font-family: Consolas, "Courier New", monospace;
      font-size: 0.9em;
    }
    pre {
      background: var(--bg-app);
      padding: var(--space-3);
      border-radius: var(--radius-md);
      overflow-x: auto;
      font-size: var(--font-size-sm);
    }
    pre code { background: transparent; padding: 0; }
    ol, ul { padding-left: var(--space-5); }
    li { margin-bottom: var(--space-2); }
    .signoff { font-style: italic; color: var(--text-secondary); }
  `],
})
export class InstructionsComponent {
  readonly projectSample = `[
  {
    "id": "p_001",
    "name": "Apollo Migration",
    "description": "Migrate legacy auth service to new platform",
    "status": "in_progress",
    "owner": {
      "id": "u_01",
      "name": "Sarah Chen",
      "initials": "SC",
      "avatarColor": "#3B6EDF"
    },
    "dueDate": "2026-06-15",
    "progress": 0.65,
    "tasksTotal": 24,
    "tasksDone": 16,
    "tags": ["backend", "infra"]
  }
]`;

  readonly activitySample = `[
  {
    "id": "a_001",
    "type": "task_completed",
    "actor": { "id": "u_03", "name": "Sarah Chen", "initials": "SC" },
    "projectId": "p_001",
    "projectName": "Apollo Migration",
    "message": "completed \\"Database schema review\\"",
    "timestamp": "2026-04-29T08:32:00Z"
  }
]`;

  readonly taskSample = `[
  {
    "id": "p_001_t001",
    "projectId": "p_001",
    "title": "Task 1",
    "status": "completed"
  }
]`;

  readonly taskMutationSample = `{
  "task": {
    "id": "p_001_t025",
    "projectId": "p_001",
    "title": "New deliverable",
    "status": "not_started"
  },
  "project": {
    "id": "p_001",
    "name": "Apollo Migration",
    "status": "in_progress",
    "progress": 0.64,
    "tasksTotal": 25,
    "tasksDone": 16,
    ...
  }
}`;
}
