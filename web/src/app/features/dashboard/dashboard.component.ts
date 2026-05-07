import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Build the dashboard here. Full brief: /instructions
 *
 * API service is pre-wired in core/api.service.ts:
 *   - apiService.getProjects()   → Observable<Project[]>
 *   - apiService.getActivity()   → Observable<ActivityItem[]>
 *
 * Tier checklist:
 *   Must:   stat cards (Total / In Progress / Overdue / Completed),
 *           project list/table, loading + error states
 *   Should: activity feed, responsive layout, visual polish
 *   Nice:   filter or sort, empty state, status badge component
 *
 * Good luck!
 */
@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink],
  template: `
    <h1>Dashboard</h1>
    <p>This is your canvas. See <a routerLink="/instructions">/instructions</a> for the brief.</p>
  `,
})
export class DashboardComponent {}
