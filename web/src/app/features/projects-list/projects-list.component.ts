import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../core/api.service';
import { ToastService } from '../../core/toast.service';
import { Project, ProjectStatus } from '../../core/models';
import {
  ConfirmDialogComponent,
  ConfirmDialogData,
} from './dialogs/confirm-dialog.component';
import {
  EditProjectDialogComponent,
  EditProjectDialogData,
  EditProjectFormValue,
} from './dialogs/edit-project-dialog.component';
import {
  TasksDialogComponent,
  TasksDialogData,
} from './dialogs/tasks-dialog.component';

const STATUS_LABEL: Record<ProjectStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
  overdue: 'Overdue',
};

@Component({
  selector: 'app-projects-list',
  standalone: true,
  imports: [
    DatePipe,
    MatButtonModule,
    MatChipsModule,
    MatIconModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTableModule,
    MatTooltipModule,
  ],
  templateUrl: './projects-list.component.html',
  styleUrl: './projects-list.component.scss',
})
export class ProjectsListComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);

  readonly projects = signal<Project[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly projectCount = computed(() => this.projects().length);

  readonly displayedColumns = ['name', 'status', 'owner', 'progress', 'dueDate', 'actions'];

  constructor() {
    this.api.getProjects().subscribe({
      next: (projects) => {
        this.projects.set(projects);
        this.loading.set(false);
      },
      error: (err) => {
        this.error.set(this.errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  statusLabel(s: ProjectStatus): string {
    return STATUS_LABEL[s];
  }

  nextStatus(s: ProjectStatus): ProjectStatus | null {
    if (s === 'in_progress') return 'completed';
    if (s === 'not_started' || s === 'overdue') return 'in_progress';
    return null;
  }

  nextStatusLabel(s: ProjectStatus): string {
    return s === 'in_progress' ? 'Mark complete' : 'Mark in progress';
  }

  openEdit(project: Project): void {
    const ref = this.dialog.open<EditProjectDialogComponent, EditProjectDialogData, EditProjectFormValue>(
      EditProjectDialogComponent,
      { data: { project }, autoFocus: 'dialog' },
    );
    ref.afterClosed().subscribe((value) => {
      if (!value) return;
      this.api.updateProject(project.id, value).subscribe({
        next: (updated) => {
          this.applyProjectUpdate(updated);
          this.toast.success(`Updated "${updated.name}"`);
        },
        error: (err) => this.toast.error(`Failed to save project: ${this.errorMessage(err)}`),
      });
    });
  }

  openTasks(project: Project): void {
    this.dialog.open<TasksDialogComponent, TasksDialogData>(TasksDialogComponent, {
      data: {
        project,
        onProjectUpdate: (updated) => this.applyProjectUpdate(updated),
      },
      width: '640px',
      autoFocus: 'dialog',
    });
  }

  toggleProjectStatus(p: Project, next: ProjectStatus): void {
    this.api.updateProject(p.id, { status: next }).subscribe({
      next: (updated) => {
        this.applyProjectUpdate(updated);
        this.toast.success(`"${updated.name}" marked ${STATUS_LABEL[next].toLowerCase()}`);
      },
      error: (err) => this.toast.error(`Failed to update status: ${this.errorMessage(err)}`),
    });
  }

  confirmDeleteProject(p: Project): void {
    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        data: {
          title: 'Delete project?',
          message: `This will permanently delete "${p.name}". This can't be undone.`,
          confirmLabel: 'Delete',
          destructive: true,
        },
      },
    );
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) this.deleteProject(p);
    });
  }

  private deleteProject(p: Project): void {
    this.api.deleteProject(p.id).subscribe({
      next: () => {
        this.projects.update((arr) => arr.filter((x) => x.id !== p.id));
        this.toast.success(`Deleted "${p.name}"`);
      },
      error: (err) => this.toast.error(`Failed to delete project: ${this.errorMessage(err)}`),
    });
  }

  private applyProjectUpdate(updated: Project): void {
    this.projects.update((arr) => arr.map((p) => (p.id === updated.id ? updated : p)));
  }

  private errorMessage(err: { error?: { error?: string }; message?: string }): string {
    return err.error?.error ?? err.message ?? 'Unknown error';
  }
}
