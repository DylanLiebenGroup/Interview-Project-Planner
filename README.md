# Frontend Take-Home Assignment

Welcome! This repo is a local Angular 20 + Express app for your frontend take-home. Your task is to build the `/dashboard` route - the rest of the site is already wired up for you.

## Please don't use AI tools

This is your chance to showcase **your** skills. We're not interested in how well Claude, ChatGPT, Copilot, or any other AI assistant can write code - we need to see that you know what you're doing.

That means no AI autocomplete, no chat assistants, and no pasting the brief into a model. Plain editor, docs, and your own thinking. If you're stuck, ask us - we'd much rather talk it through than have a model answer for you.

## Prerequisites

- Node 20+

## Setup

```bash
npm run install:all
```

Installs dependencies for the root, the Express API, and the Angular app.

## Run the app

```bash
npm start
```

This starts both the API (`http://localhost:3001`, with WebSocket at `/ws`) and the Angular dev server (`http://localhost:4300`) in one terminal.

Open `http://localhost:4300` in your browser. You'll land on the home page; from there:

- **`/instructions`** - your brief. Read this first. It covers must-have / should-have / nice-to-have requirements, the API + WebSocket reference, and what we're looking for.
- **`/projects`** - a fully built reference page. Use it as a guide for the codebase patterns we use (signals, standalone components, `inject()`, `@if`/`@for`, Angular Material).
- **`/dashboard`** - empty. **This is where your work goes.**

## Where to write your code

Fill in `web/src/app/features/dashboard/dashboard.component.ts`. The route is already registered, and `ApiService` + `WsService` are already typed and ready to call. You should not need to add new methods to either service - everything is pre-wired.

## How to submit

1. Push your work to a private repository under your own GitHub account.
2. Add the reviewer (we'll send their handle) as a collaborator with read access.
3. Reply to the original email with the repo URL.

Commit as you finish each tier (Must / Should / Nice). We read the commit history.

## Tips

- Commit when you finish each tier so we can see your progress.
- If `npm start` hangs on the web side: delete `web/.angular/` and `web/node_modules/`, then re-run `npm install --prefix web`.
- If port 3001 or 4300 is in use: `npx kill-port 3001 4300`, then `npm start` again.

Good luck!
