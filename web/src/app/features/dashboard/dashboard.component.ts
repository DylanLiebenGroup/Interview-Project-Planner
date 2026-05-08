import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Build the dashboard here. Full brief: /instructions
 *
 * Pre-wired services in core/:
 *   ApiService - full read + mutation surface, including new endpoints
 *     getProjects()  → Observable<Project[]>
 *     getActivity()  → Observable<ActivityItem[]>
 *     getTasks(id)   → Observable<Task[]>
 *     getTicker()    → Observable<TickerItem[]>
 *     getPresence()  → Observable<PresenceEntry[]>
 *
 *   WsService - typed WebSocket client with auto-reconnect
 *     events$            Observable<WsEvent>
 *     connectionState()  Signal<'connecting' | 'live' | 'reconnecting' | 'offline'>
 *     lastEventAt()      Signal<Date | null>
 *
 *   ToastService - success/error/info wrappers around MatSnackBar
 *
 * Required sections (see /instructions for tier mapping):
 *   ticker, stat cards, projects panel, activity feed, presence strip, footer
 *
 * The brief is tiered Must / Should / Nice. Read it before coding.
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
