import { Injectable, InjectionToken, inject, signal, DestroyRef } from '@angular/core';
import { Observable, Subject, share } from 'rxjs';
import { WsConnectionState, WsEvent } from './models';

export const WS_URL = new InjectionToken<string>('WS_URL', {
  providedIn: 'root',
  factory: () => 'ws://localhost:3001/ws',
});

export const WS_FACTORY = new InjectionToken<(url: string) => WebSocket>('WS_FACTORY', {
  providedIn: 'root',
  factory: () => (url: string) => new WebSocket(url),
});

const BACKOFF_MS = [500, 1000, 2000, 4000, 8000];

@Injectable({ providedIn: 'root' })
export class WsService {
  private readonly url = inject(WS_URL);
  private readonly factory = inject(WS_FACTORY);
  private readonly destroyRef = inject(DestroyRef);

  private socket: WebSocket | null = null;
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private intentionallyClosed = false;

  private readonly _state = signal<WsConnectionState>('offline');
  private readonly _lastEventAt = signal<Date | null>(null);
  private readonly subject = new Subject<WsEvent>();

  readonly connectionState = this._state.asReadonly();
  readonly lastEventAt = this._lastEventAt.asReadonly();

  // share({ resetOnRefCountZero: false }) - the WS lifecycle is owned by the service
  // (singleton via providedIn: 'root'), not by subscriber refcount. Without this option,
  // a refcount-zero teardown plus a pending reconnect timer can race and produce
  // duplicate sockets.
  readonly events$: Observable<WsEvent> = new Observable<WsEvent>((subscriber) => {
    this.connect();
    const sub = this.subject.subscribe(subscriber);
    return () => sub.unsubscribe();
  }).pipe(share({ resetOnRefCountZero: false }));

  constructor() {
    this.destroyRef.onDestroy(() => this.disconnect());
  }

  connect(): void {
    if (this.socket || this.intentionallyClosed) {
      // already connecting/live, or explicitly disconnected and not resuming
      if (this.intentionallyClosed) {
        this.intentionallyClosed = false;
      } else {
        return;
      }
    }
    this.openSocket();
  }

  disconnect(): void {
    this.intentionallyClosed = true;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.socket) {
      try { this.socket.close(); } catch { /* ignore */ }
      this.socket = null;
    }
    this._state.set('offline');
  }

  private openSocket(): void {
    this._state.set('connecting');
    const ws = this.factory(this.url);
    this.socket = ws;

    ws.onopen = () => {
      // We stay in 'connecting' until the first hello arrives; that's the
      // server's "I'm ready" signal.
    };

    ws.onmessage = (ev: { data: string }) => {
      let parsed: WsEvent;
      try {
        parsed = JSON.parse(ev.data) as WsEvent;
      } catch {
        return;
      }
      this._lastEventAt.set(new Date());
      if (parsed.type === 'hello') {
        this._state.set('live');
        this.reconnectAttempt = 0;
      }
      this.subject.next(parsed);
    };

    ws.onclose = () => {
      this.socket = null;
      if (this.intentionallyClosed) {
        this._state.set('offline');
        return;
      }
      this._state.set('reconnecting');
      this.scheduleReconnect();
    };

    ws.onerror = () => {
      // Errors are followed by close; let onclose handle reconnect.
    };
  }

  private scheduleReconnect(): void {
    const delay = BACKOFF_MS[Math.min(this.reconnectAttempt, BACKOFF_MS.length - 1)];
    this.reconnectAttempt++;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (!this.intentionallyClosed) this.openSocket();
    }, delay);
  }
}
