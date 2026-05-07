import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDatepickerModule } from '@angular/material/datepicker';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { Project, ProjectStatus } from '../../../core/models';

export interface EditProjectDialogData {
  project: Project;
}

export interface EditProjectFormValue {
  name: string;
  description: string;
  status: ProjectStatus;
  dueDate: string;
}

@Component({
  selector: 'app-edit-project-dialog',
  standalone: true,
  imports: [
    FormsModule,
    MatButtonModule,
    MatDatepickerModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
  ],
  template: `
    <h2 mat-dialog-title>Edit project</h2>
    <mat-dialog-content>
      <form #editForm="ngForm" (submit)="save($event)" class="edit-form">
        <mat-form-field appearance="outline">
          <mat-label>Name</mat-label>
          <input matInput [(ngModel)]="form.name" name="name" required>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Description</mat-label>
          <textarea matInput [(ngModel)]="form.description" name="description" rows="2"></textarea>
        </mat-form-field>

        <div class="row">
          <mat-form-field appearance="outline">
            <mat-label>Status</mat-label>
            <mat-select [(ngModel)]="form.status" name="status">
              <mat-option value="not_started">Not started</mat-option>
              <mat-option value="in_progress">In progress</mat-option>
              <mat-option value="completed">Completed</mat-option>
              <mat-option value="overdue">Overdue</mat-option>
            </mat-select>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Due date</mat-label>
            <input matInput [matDatepicker]="picker" [(ngModel)]="dueDateValue" name="dueDate">
            <mat-datepicker-toggle matIconSuffix [for]="picker"></mat-datepicker-toggle>
            <mat-datepicker #picker></mat-datepicker>
          </mat-form-field>
        </div>

        <p class="hint">
          Progress is calculated from this project's tasks. Use the
          <strong>Tasks</strong> button on the row to manage them.
        </p>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="dialogRef.close()" [disabled]="saving()">Cancel</button>
      <button
        mat-flat-button
        color="primary"
        (click)="save($event)"
        [disabled]="saving() || !form.name.trim()"
      >
        {{ saving() ? 'Saving…' : 'Save' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    .edit-form {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      min-width: 420px;
      padding-top: 8px;
    }
    .row { display: flex; gap: var(--space-3); }
    .row > mat-form-field { flex: 1; }
    .hint {
      margin: 0;
      padding: var(--space-2) var(--space-3);
      background: var(--bg-app);
      border-radius: var(--radius-sm);
      font-size: var(--font-size-sm);
      color: var(--text-secondary);
    }
  `],
})
export class EditProjectDialogComponent {
  protected readonly data = inject<EditProjectDialogData>(MAT_DIALOG_DATA);
  protected readonly dialogRef =
    inject<MatDialogRef<EditProjectDialogComponent, EditProjectFormValue>>(MatDialogRef);
  protected readonly saving = signal(false);

  protected form = {
    name: this.data.project.name,
    description: this.data.project.description,
    status: this.data.project.status,
  };
  protected dueDateValue: Date | null = this.data.project.dueDate
    ? new Date(this.data.project.dueDate)
    : null;

  save(event: Event): void {
    event.preventDefault();
    if (!this.form.name?.trim()) return;
    this.saving.set(true);
    this.dialogRef.close({
      name: this.form.name.trim(),
      description: this.form.description ?? '',
      status: this.form.status,
      dueDate: this.dueDateValue ? this.toIsoDate(this.dueDateValue) : '',
    });
  }

  private toIsoDate(d: Date): string {
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
  }
}
