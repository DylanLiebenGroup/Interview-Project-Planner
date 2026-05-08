import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-instructions',
  standalone: true,
  imports: [RouterLink],
  template: `
    <article class="brief">
      <header>
        <h1>Frontend Take-Home: Build a Live Project Dashboard</h1>
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
        <p>
          This is a take-home with a target effort of around a weekend (~12-16 hours). The
          dashboard should surface live data: a ticker, stat cards, a project list, an
          activity feed, presence info, and a footer that reflects the WebSocket connection
          state. The server's data <em>drifts</em> every few seconds - your dashboard should
          react.
        </p>
      </section>

      <section>
        <h2>The brief</h2>

        <h3>Must-have - without these, the build doesn't ship</h3>
        <ol>
          <li><strong>Stat cards row.</strong> Four cards across the top: <em>Total</em>, <em>In progress</em>, <em>Overdue</em>, <em>Completed</em>. Counts derived from the projects data.</li>
          <li><strong>Project list/table.</strong> Render projects with status, owner, progress, and due date.</li>
          <li><strong>Loading state.</strong> While data is fetching, show a skeleton at the right height. The API delay varies (20-500ms) - your loading UI should feel intentional.</li>
          <li><strong>Error state.</strong> If a fetch fails (test with <code>?fail=true</code>), show a clear inline error within that section. Don't blank the dashboard.</li>
          <li><strong>Footer.</strong> Always-visible footer with the WebSocket connection state ("live" / "reconnecting" / "offline"), last-sync timestamp, and a build label.</li>
          <li><strong>Layout-shift discipline.</strong> Reserve space before data arrives. The dashboard must not flash, jump, or push content around when data lands or when WS events arrive.</li>
        </ol>

        <h3>Should-have - depth and polish</h3>
        <ol start="7">
          <li><strong>Activity feed.</strong> Render recent activity (<code>getActivity()</code>). Friendly timestamps ("2h ago" or similar). New items prepend without push-jumping the visible list.</li>
          <li><strong>Responsive layout.</strong> Looks good on a typical desktop (≥1280px) and at 1920×1080 with 125% Windows scaling (~1536×864). Acceptable down to ~768px.</li>
          <li><strong>Visual polish.</strong> Status pills, hover states, spacing rhythm, type hierarchy. Use Angular Material, the existing CSS variables in <code>styles.scss</code>, or roll your own.</li>
          <li><strong>Custom spinner.</strong> Material's <code>mat-progress-spinner</code> is fine for momentary states. For your primary loading boundaries (projects panel, activity feed), build something intentional - skeleton, dot-pulse, branded spinner, scanning bar.</li>
          <li><strong>Polling.</strong> At least one section auto-refreshes on an interval, smoothly (no flicker). Sensible cadence (≥1s; the server tick is ~3s).</li>
          <li><strong>Ticker.</strong> Slim banner at top with rotating live items from <code>getTicker()</code>. Fixed height; never resizes the page.</li>
          <li><strong>Dialogs.</strong> At least one interaction opens a dialog you built (e.g., a project quick-view or a confirm dialog). The <code>/projects</code> page has working dialogs to learn from.</li>
          <li><strong>Independent section loads.</strong> Each section owns its own loading/error state. One slow request must not block the rest of the dashboard.</li>
        </ol>

        <h3>Nice-to-have - if there's time</h3>
        <ol start="15">
          <li><strong>WebSockets.</strong> Use <code>WsService.events$</code> to replace polling on at least one section, or to add live presence/push-toast updates.</li>
          <li><strong>Filter or sort.</strong> The project list - pick one (status filter, owner filter, sort by due date).</li>
          <li><strong>Empty state.</strong> Test with <code>?empty=true</code> on every endpoint. Show something deliberate, not a blank panel.</li>
          <li><strong>Animated updates.</strong> New items fade or slide in - no flashing.</li>
          <li><strong>Optimistic UI.</strong> On at least one mutation, update the UI before the server confirms.</li>
          <li><strong>Component decomposition.</strong> Break the dashboard into small, focused components (e.g., <code>StatCard</code>, <code>ProjectListItem</code>, <code>ActivityFeed</code>).</li>
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

        <h3><code>GET /api/ticker</code></h3>
        <p>Returns the most recent ~12 ticker items, newest first. <code>kind</code> is one of: <code>"announcement"</code> | <code>"incident"</code> | <code>"milestone"</code>.</p>
<pre><code>{{ tickerSample }}</code></pre>

        <h3><code>GET /api/presence</code></h3>
        <p>Returns who is "viewing" what. Drifts on the server every several ticks.</p>
<pre><code>{{ presenceSample }}</code></pre>

        <h3>WebSocket - <code>ws://localhost:3001/ws</code></h3>
        <p>
          Server-push only. Use the pre-wired <code>WsService</code> in <code>core/ws.service.ts</code> -
          <strong>do not open the socket yourself</strong>. The service handles connect, reconnect,
          and exposes a typed event stream.
        </p>
<pre><code>{{ wsEventSample }}</code></pre>
        <p>
          Each event carries enough state for the client to update without re-fetching.
          <code>task_updated</code> and <code>project_updated</code> include the recomputed parent
          project, mirroring the existing mutation-response pattern.
        </p>

        <h3>Test modes</h3>
        <ul>
          <li><code>?fail=true</code> - returns 500 with <code>&#123; "error": "Something went wrong" &#125;</code>.</li>
          <li><code>?empty=true</code> - returns <code>[]</code>.</li>
          <li>Drift continues regardless of test toggles - polling and WS still produce changing data.</li>
        </ul>
        <p>All endpoints share a 20-500ms artificial delay. Use Chrome DevTools network throttling to verify your loading UI behaves under slower conditions.</p>

        <h3>Mutation endpoints</h3>
        <p class="muted">
          These power the existing <a routerLink="/projects">/projects</a> page. They aren't required
          for the dashboard build, but are documented here so you can extend things if you have time.
          <code>Task</code> now has a <code>description</code> field; mutation responses include it.
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

        <h4><code>POST /api/projects/:id/tasks</code></h4>
        <p>
          Creates a task on the given project. Body: <code>&#123; title: string, description?: string, status?: TaskStatus &#125;</code>.
          Returns <code>201</code> with both the new task and the recomputed project so the UI can update
          counts in one round-trip. <code>400</code> if title is missing or blank.
        </p>
<pre><code>{{ taskMutationSample }}</code></pre>

        <h4><code>PATCH /api/tasks/:taskId</code></h4>
        <p>
          Updates a task's <code>title</code>, <code>description</code>, or <code>status</code>. Same response
          shape as POST (<code>&#123; task, project &#125;</code>).
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
            <code>ApiService</code> in <code>core/api.service.ts</code> - all read methods
            (<code>getProjects()</code>, <code>getActivity()</code>, <code>getTasks(id)</code>,
            <code>getTicker()</code>, <code>getPresence()</code>) and mutation methods
            (<code>updateProject</code>, <code>deleteProject</code>, <code>createTask</code>,
            <code>updateTask</code>, <code>deleteTask</code>) already typed and ready.
            <strong>Do not add new methods to ApiService</strong> - everything you need is there.
          </li>
          <li>
            <code>WsService</code> in <code>core/ws.service.ts</code> - typed event stream
            (<code>events$</code>), connection state signal (<code>connectionState()</code>), and last-event
            timestamp signal (<code>lastEventAt()</code>). Auto-reconnects on drop.
            <strong>Do not open WebSockets yourself</strong> - subscribe to the service.
          </li>
          <li><code>Project</code>, <code>ActivityItem</code>, <code>Task</code>, <code>TickerItem</code>, <code>PresenceEntry</code>, <code>WsEvent</code>, and the status enums in <code>core/models.ts</code>.</li>
          <li><code>ToastService</code> in <code>core/toast.service.ts</code> wraps <code>MatSnackBar</code> with <code>success/error/info</code> methods if you need notifications.</li>
          <li>The <code>/dashboard</code> route is already registered. You only need to fill in <code>features/dashboard/dashboard.component.ts</code>.</li>
        </ul>
      </section>

      <section>
        <h2>How to submit</h2>
        <ol>
          <li>Push your work to a private repository under your own GitHub account.</li>
          <li>Add the reviewer (we'll send their handle) as a collaborator (read access is enough).</li>
          <li>Reply to the original email with the repo URL.</li>
        </ol>
        <p>
          Commit as you finish each tier (Must / Should / Nice). We read the commit history -
          it tells us how you sequenced the work, where you got stuck, and what you cleaned up
          before submitting. Don't squash. Don't hide. Honest commits beat polished ones.
        </p>
      </section>

      <section>
        <h2>What we're looking for</h2>
        <ul>
          <li>Idiomatic Angular 20+ - signals, standalone, <code>inject()</code>, the new control flow.</li>
          <li>Real handling of loading, error, and empty states across <em>every</em> data source - not just the projects panel.</li>
          <li>Independent section loading. The dashboard never blanks because one fetch is slow or one section errored.</li>
          <li>Layout-shift discipline. Reserved heights, sensible skeletons, no flashing.</li>
          <li>Considered choice between polling and WS. Either one shipped well beats both shipped sloppy.</li>
          <li>Visual taste. Spacing rhythm, type hierarchy, status differentiation.</li>
          <li>Honest commit history. Tier-marked, attributable, debuggable.</li>
        </ul>
      </section>

      <section>
        <h2>Tips</h2>
        <ul>
          <li>Don't gate the whole dashboard on one fetch. Each section owns its own loading state.</li>
          <li>Reserve space before data arrives. A skeleton at the right height is worth more than an exact shimmer.</li>
          <li>Polling vs WS: if you're not sure, ship polling first. The brief lists WS in the Nice tier - it's a stretch, not a baseline.</li>
          <li>Pick a sensible polling cadence. The server tick is ~3s; polling at &lt;1s is just noise.</li>
          <li>Custom spinner: Material's <code>mat-progress-spinner</code> is fine for momentary states. For your primary loaders, build something intentional.</li>
          <li>Drift is real. The data changes every few seconds. If your projects panel doesn't react to a status change you can <em>see</em> coming through the activity feed, that's a bug.</li>
          <li>Commit when you finish each tier so we can see your progress.</li>
          <li>If <code>npm start</code> hangs on the web side: delete <code>web/.angular/</code> and <code>web/node_modules/</code>, then re-run <code>npm install --prefix web</code>.</li>
          <li>If port 3001 or 4300 is in use: <code>npx kill-port 3001 4300</code>, then <code>npm start</code> again.</li>
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

  readonly tickerSample = `[
  {
    "id": "tk_a91b",
    "kind": "milestone",
    "message": "Apollo Migration just hit 70%",
    "projectId": "p_001",
    "projectName": "Apollo Migration",
    "timestamp": "2026-05-08T14:02:11Z"
  }
]`;

  readonly presenceSample = `[
  {
    "user": { "id": "u_03", "name": "Sarah Chen", "initials": "SC" },
    "projectId": "p_001",
    "projectName": "Apollo Migration",
    "since": "2026-05-08T14:01:50Z"
  }
]`;

  readonly wsEventSample = `// Sample events received via WsService.events$:
{ "type": "hello", "serverTime": "2026-05-08T14:02:00Z", "protocolVersion": 1 }
{ "type": "activity_added", "item": { /* ActivityItem */ } }
{ "type": "project_updated", "project": { /* Project */ } }
{ "type": "task_updated", "task": { /* Task */ }, "project": { /* recomputed parent */ } }
{ "type": "ticker_updated", "item": { /* TickerItem */ } }
{ "type": "presence_changed", "entries": [ /* PresenceEntry[] */ ] }`;

  readonly taskSample = `[
  {
    "id": "p_001_t001",
    "projectId": "p_001",
    "title": "Audit existing OAuth scopes",
    "description": "Walk through the current scope map, flag deprecated grants, and document the migration target for each.",
    "status": "completed"
  }
]`;

  readonly taskMutationSample = `{
  "task": {
    "id": "p_001_t025",
    "projectId": "p_001",
    "title": "New deliverable",
    "description": "",
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
