import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, MatButtonModule],
  template: `
    <section class="hero">
      <h1>Project Tracker</h1>
      <p class="subtitle">Track your team's projects and recent activity in one place.</p>
      <div class="actions">
        <a mat-flat-button color="primary" routerLink="/dashboard">Open dashboard</a>
        <a mat-stroked-button routerLink="/instructions">Read interview brief</a>
      </div>
    </section>
  `,
  styles: [`
    .hero {
      max-width: 720px;
      padding: var(--space-6) 0;
    }
    .subtitle {
      color: var(--text-secondary);
      font-size: var(--font-size-lg);
      margin: 0 0 var(--space-5);
    }
    .actions { display: flex; gap: var(--space-3); }
  `],
})
export class HomeComponent {}
