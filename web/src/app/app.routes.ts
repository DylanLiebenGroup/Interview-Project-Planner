import { Routes } from '@angular/router';

export const routes: Routes = [
  {
    path: '',
    loadComponent: () => import('./features/home/home.component').then(m => m.HomeComponent),
  },
  {
    path: 'projects',
    loadComponent: () =>
      import('./features/projects-list/projects-list.component').then(m => m.ProjectsListComponent),
  },
  {
    path: 'instructions',
    loadComponent: () =>
      import('./features/instructions/instructions.component').then(m => m.InstructionsComponent),
  },
  {
    path: 'dashboard',
    loadComponent: () =>
      import('./features/dashboard/dashboard.component').then(m => m.DashboardComponent),
  },
  { path: '**', redirectTo: '' },
];
