import { Component, ElementRef, inject, signal, viewChildren } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import {
  MAT_DIALOG_DATA,
  MatDialog,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ApiService } from '../../../core/api.service';
import { ToastService } from '../../../core/toast.service';
import { Project, Task, TaskStatus } from '../../../core/models';
import { ConfirmDialogComponent, ConfirmDialogData } from './confirm-dialog.component';

export interface TasksDialogData {
  project: Project;
  onProjectUpdate: (project: Project) => void;
}

const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  not_started: 'Not started',
  in_progress: 'In progress',
  completed: 'Completed',
};

@Component({
  selector: 'app-tasks-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatChipsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ project().name }} — tasks</h2>
    <mat-dialog-content>
      <p class="muted">
        {{ project().tasksDone }}/{{ project().tasksTotal }} complete · {{ progressPct() }}%
      </p>
      <mat-progress-bar mode="determinate" [value]="project().progress * 100"></mat-progress-bar>

      <form (submit)="addTask($event)" class="add-task">
        <mat-form-field appearance="outline" class="add-task__field">
          <mat-label>New task title</mat-label>
          <input matInput [(ngModel)]="newTaskTitle" name="newTaskTitle" required [disabled]="addingTask()">
        </mat-form-field>
        <button
          mat-flat-button
          color="primary"
          type="submit"
          [disabled]="addingTask() || !newTaskTitle.trim()"
        >
          {{ addingTask() ? 'Adding…' : 'Add' }}
        </button>
      </form>

      @if (loading()) {
        <div class="state"><mat-spinner diameter="24"></mat-spinner><span>Loading tasks…</span></div>
      } @else if (loadError()) {
        <p class="state error">{{ loadError() }}</p>
      } @else if (tasks().length === 0) {
        <p class="state">No tasks yet — add one above.</p>
      } @else {
        <ul class="task-list">
          @for (t of tasks(); track t.id) {
            <li class="task" [class.task--completed]="t.status === 'completed'">
              <mat-chip [class]="'chip-' + t.status" disabled>{{ taskStatusLabel(t.status) }}</mat-chip>
              @if (editingTaskId() === t.id) {
                <input
                  #titleInput
                  type="text"
                  class="task__title-input"
                  [value]="t.title"
                  (blur)="saveTaskTitle(t, titleInput.value)"
                  (keydown.enter)="titleInput.blur()"
                  (keydown.escape)="cancelTaskEdit($event, titleInput, t.title)"
                >
              } @else {
                <span
                  class="task__title"
                  matTooltip="Click to rename"
                  matTooltipShowDelay="500"
                  tabindex="0"
                  role="button"
                  (click)="startEditTask(t)"
                  (keydown.enter)="startEditTask(t)"
                >{{ t.title }}</span>
              }
              <button
                mat-icon-button
                [matTooltip]="taskCycleLabel(t.status)"
                [class]="taskCycleClass(t.status)"
                (click)="cycleTaskStatus(t)"
              >
                <mat-icon>{{ taskCycleIcon(t.status) }}</mat-icon>
              </button>
              <button
                mat-icon-button
                matTooltip="Delete task"
                class="task-action-delete"
                (click)="confirmDeleteTask(t)"
              >
                <mat-icon>delete</mat-icon>
              </button>
            </li>
          }
        </ul>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()">Close</button>
    </mat-dialog-actions>
  `,
  styles: [`
    :host { display: block; min-width: 560px; }
    .muted { margin: 0; color: var(--text-secondary); font-size: var(--font-size-sm); }
    .add-task {
      display: flex;
      gap: var(--space-2);
      margin-top: var(--space-3);
      align-items: flex-start;
    }
    .add-task__field { flex: 1; }
    .state {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: var(--space-3);
      color: var(--text-secondary);
      &.error { color: var(--status-overdue); }
    }
    .task-list {
      list-style: none;
      margin: 0;
      padding: 0;
      max-height: 360px;
      overflow-y: auto;
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-sm);
    }
    .task {
      display: grid;
      grid-template-columns: auto 1fr auto auto;
      align-items: center;
      gap: var(--space-3);
      padding: var(--space-2) var(--space-3);
      border-bottom: 1px solid var(--border-subtle);
      &:last-child { border-bottom: 0; }
      &:hover { background: var(--bg-hover); }
    }
    .task__title {
      font-size: var(--font-size-base);
      cursor: text;
      padding: 4px 6px;
      border-radius: var(--radius-sm);
      &:hover { background: var(--bg-hover); }
      &:focus { outline: 2px solid var(--accent); outline-offset: 1px; }
    }
    .task__title-input {
      font-family: inherit;
      font-size: var(--font-size-base);
      padding: 4px 6px;
      border: 1px solid var(--accent);
      border-radius: var(--radius-sm);
      background: var(--bg-panel);
      color: var(--text-primary);
      width: 100%;
      &:focus { outline: 2px solid var(--accent); outline-offset: -1px; }
    }
    .task--completed .task__title {
      color: var(--text-muted);
      text-decoration: line-through;
    }
    .task-action-progress { --mdc-icon-button-icon-color: var(--accent);           color: var(--accent); }
    .task-action-complete { --mdc-icon-button-icon-color: var(--status-completed); color: var(--status-completed); }
    .task-action-delete   { --mdc-icon-button-icon-color: var(--status-overdue);   color: var(--status-overdue); }
    // Status-chip colours live in global styles.scss (Material 3's text label
    // sits in a child element that view encapsulation can't target).
  `],
})
export class TasksDialogComponent {
  private readonly api = inject(ApiService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly data = inject<TasksDialogData>(MAT_DIALOG_DATA);
  protected readonly dialogRef = inject<MatDialogRef<TasksDialogComponent>>(MatDialogRef);

  protected readonly project = signal<Project>(this.data.project);
  protected readonly tasks = signal<Task[]>([]);
  protected readonly loading = signal(true);
  protected readonly loadError = signal<string | null>(null);
  protected readonly addingTask = signal(false);
  protected readonly editingTaskId = signal<string | null>(null);
  protected newTaskTitle = '';

  private readonly titleInputs = viewChildren<ElementRef<HTMLInputElement>>('titleInput');

  constructor() {
    this.api.getTasks(this.data.project.id).subscribe({
      next: (tasks) => {
        this.tasks.set(tasks);
        this.loading.set(false);
      },
      error: (err) => {
        this.loadError.set(this.errorMessage(err));
        this.loading.set(false);
      },
    });
  }

  progressPct(): string {
    return (this.project().progress * 100).toFixed(0);
  }

  taskStatusLabel(s: TaskStatus): string {
    return TASK_STATUS_LABEL[s];
  }

  taskCycleLabel(s: TaskStatus): string {
    if (this.isProjectOverdue()) {
      return s === 'completed' ? 'Reopen' : 'Mark complete';
    }
    if (s === 'not_started') return 'Start';
    if (s === 'in_progress') return 'Complete';
    return 'Reopen';
  }

  taskCycleIcon(s: TaskStatus): string {
    if (this.isProjectOverdue()) {
      return s === 'completed' ? 'replay' : 'check';
    }
    if (s === 'not_started') return 'play_arrow';
    if (s === 'in_progress') return 'check';
    return 'replay';
  }

  taskCycleClass(s: TaskStatus): string {
    if (this.isProjectOverdue()) {
      return s === 'completed' ? 'task-action-progress' : 'task-action-complete';
    }
    return s === 'in_progress' ? 'task-action-complete' : 'task-action-progress';
  }

  private isProjectOverdue(): boolean {
    return this.project().status === 'overdue';
  }

  startEditTask(t: Task): void {
    this.editingTaskId.set(t.id);
    setTimeout(() => {
      const el = this.titleInputs()[0]?.nativeElement;
      el?.focus();
      el?.select();
    });
  }

  cancelTaskEdit(event: Event, input: HTMLInputElement, originalTitle: string): void {
    event.preventDefault();
    input.value = originalTitle;
    this.editingTaskId.set(null);
  }

  saveTaskTitle(t: Task, rawValue: string): void {
    const newTitle = rawValue.trim();
    this.editingTaskId.set(null);
    if (!newTitle || newTitle === t.title) return;
    this.api.updateTask(t.id, { title: newTitle }).subscribe({
      next: ({ task, project }) => {
        this.tasks.update((arr) => arr.map((x) => (x.id === t.id ? task : x)));
        this.applyProjectUpdate(project);
        this.toast.success(`Renamed to "${task.title}"`);
      },
      error: (err) => this.toast.error(`Failed to rename task: ${this.errorMessage(err)}`),
    });
  }

  private nextTaskStatus(s: TaskStatus): TaskStatus {
    if (this.isProjectOverdue()) {
      return s === 'completed' ? 'in_progress' : 'completed';
    }
    if (s === 'not_started') return 'in_progress';
    if (s === 'in_progress') return 'completed';
    return 'in_progress';
  }

  addTask(event: Event): void {
    event.preventDefault();
    const title = this.newTaskTitle.trim();
    if (!title) return;
    this.addingTask.set(true);
    this.api.createTask(this.project().id, { title }).subscribe({
      next: ({ task, project }) => {
        this.tasks.update((arr) => [...arr, task]);
        this.applyProjectUpdate(project);
        this.newTaskTitle = '';
        this.addingTask.set(false);
        this.toast.success(`Added "${task.title}"`);
      },
      error: (err) => {
        this.addingTask.set(false);
        this.toast.error(`Failed to add task: ${this.errorMessage(err)}`);
      },
    });
  }

  cycleTaskStatus(t: Task): void {
    const next = this.nextTaskStatus(t.status);
    this.api.updateTask(t.id, { status: next }).subscribe({
      next: ({ task, project }) => {
        this.tasks.update((arr) => arr.map((x) => (x.id === t.id ? task : x)));
        this.applyProjectUpdate(project);
        this.toast.success(`"${task.title}" marked ${TASK_STATUS_LABEL[next].toLowerCase()}`);
      },
      error: (err) => this.toast.error(`Failed to update task: ${this.errorMessage(err)}`),
    });
  }

  confirmDeleteTask(t: Task): void {
    const ref = this.dialog.open<ConfirmDialogComponent, ConfirmDialogData, boolean>(
      ConfirmDialogComponent,
      {
        data: {
          title: 'Delete task?',
          message: `This will permanently delete "${t.title}". This can't be undone.`,
          confirmLabel: 'Delete',
          destructive: true,
        },
      },
    );
    ref.afterClosed().subscribe((confirmed) => {
      if (confirmed) this.deleteTask(t);
    });
  }

  private deleteTask(t: Task): void {
    this.api.deleteTask(t.id).subscribe({
      next: ({ project }) => {
        this.tasks.update((arr) => arr.filter((x) => x.id !== t.id));
        this.applyProjectUpdate(project);
        this.toast.success(`Deleted "${t.title}"`);
      },
      error: (err) => this.toast.error(`Failed to delete task: ${this.errorMessage(err)}`),
    });
  }

  private applyProjectUpdate(updated: Project): void {
    this.project.set(updated);
    this.data.onProjectUpdate(updated);
  }

  private errorMessage(err: { error?: { error?: string }; message?: string }): string {
    return err.error?.error ?? err.message ?? 'Unknown error';
  }
}
