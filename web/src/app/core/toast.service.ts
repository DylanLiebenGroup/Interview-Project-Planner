import { Injectable, inject } from '@angular/core';
import { MatSnackBar, MatSnackBarConfig } from '@angular/material/snack-bar';

const SUCCESS_DURATION_MS = 4000;
const ERROR_DURATION_MS = 6000;

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly snackBar = inject(MatSnackBar);

  success(message: string): void {
    this.show(message, this.config(SUCCESS_DURATION_MS, 'snack-success'));
  }

  error(message: string): void {
    this.show(message, this.config(ERROR_DURATION_MS, 'snack-error'));
  }

  info(message: string): void {
    this.show(message, this.config(SUCCESS_DURATION_MS, 'snack-info'));
  }

  private show(message: string, config: MatSnackBarConfig): void {
    this.snackBar.open(message, 'Dismiss', config);
  }

  private config(duration: number, panelClass: string): MatSnackBarConfig {
    return {
      duration,
      panelClass: [panelClass],
      horizontalPosition: 'right',
      verticalPosition: 'top',
    };
  }
}
