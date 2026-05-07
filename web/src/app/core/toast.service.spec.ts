import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ToastService } from './toast.service';

describe('ToastService', () => {
  let service: ToastService;
  let snackBar: jasmine.SpyObj<MatSnackBar>;

  beforeEach(() => {
    snackBar = jasmine.createSpyObj<MatSnackBar>('MatSnackBar', ['open']);
    TestBed.configureTestingModule({
      providers: [
        ToastService,
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    service = TestBed.inject(ToastService);
  });

  it('success() opens a snackbar with the success panel class', () => {
    service.success('Saved');
    expect(snackBar.open).toHaveBeenCalled();
    const [message, action, config] = snackBar.open.calls.mostRecent().args;
    expect(message).toBe('Saved');
    expect(action).toBe('Dismiss');
    expect(config?.panelClass).toEqual(['snack-success']);
  });

  it('error() opens a snackbar with the error panel class', () => {
    service.error('Boom');
    const config = snackBar.open.calls.mostRecent().args[2];
    expect(config?.panelClass).toEqual(['snack-error']);
  });

  it('info() opens a snackbar with the info panel class', () => {
    service.info('FYI');
    const config = snackBar.open.calls.mostRecent().args[2];
    expect(config?.panelClass).toEqual(['snack-info']);
  });
});
