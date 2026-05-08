import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { WsEvent } from './models';
import { WS_FACTORY, WS_URL, WsService } from './ws.service';

class FakeWebSocket {
  static instances: FakeWebSocket[] = [];
  onopen: ((ev: any) => void) | null = null;
  onclose: ((ev: any) => void) | null = null;
  onerror: ((ev: any) => void) | null = null;
  onmessage: ((ev: { data: string }) => void) | null = null;
  readyState = 0; // CONNECTING
  closedExplicitly = false;

  constructor(public url: string) {
    FakeWebSocket.instances.push(this);
  }

  open() {
    this.readyState = 1;
    this.onopen?.({});
  }

  emit(event: WsEvent) {
    this.onmessage?.({ data: JSON.stringify(event) });
  }

  close() {
    this.readyState = 3;
    this.closedExplicitly = true;
    this.onclose?.({ code: 1000, reason: 'normal' });
  }

  // Simulate a server-initiated drop.
  drop() {
    this.readyState = 3;
    this.onclose?.({ code: 1006, reason: 'abnormal' });
  }
}

describe('WsService', () => {
  let service: WsService;

  beforeEach(() => {
    FakeWebSocket.instances = [];
    TestBed.configureTestingModule({
      providers: [
        WsService,
        { provide: WS_URL, useValue: 'ws://test/ws' },
        { provide: WS_FACTORY, useValue: (url: string) => new FakeWebSocket(url) as any },
      ],
    });
    service = TestBed.inject(WsService);
  });

  it('starts in connecting state on first subscription', () => {
    service.events$.subscribe();
    expect(service.connectionState()).toBe('connecting');
    expect(FakeWebSocket.instances.length).toBe(1);
  });

  it('transitions to live on hello event', fakeAsync(() => {
    service.events$.subscribe();
    const sock = FakeWebSocket.instances[0];
    sock.open();
    sock.emit({ type: 'hello', serverTime: '2026-05-08T00:00:00Z', protocolVersion: 1 });
    tick();
    expect(service.connectionState()).toBe('live');
  }));

  it('emits typed events to subscribers', fakeAsync(() => {
    const received: WsEvent[] = [];
    service.events$.subscribe((ev) => received.push(ev));
    const sock = FakeWebSocket.instances[0];
    sock.open();
    sock.emit({ type: 'hello', serverTime: 't', protocolVersion: 1 });
    sock.emit({ type: 'activity_added', item: { id: 'a1', type: 'task_completed', actor: { id: 'u', name: 'X', initials: 'X' }, projectId: 'p', projectName: 'P', message: 'm', timestamp: 't' } });
    tick();
    expect(received.length).toBe(2);
    expect(received[0].type).toBe('hello');
    expect(received[1].type).toBe('activity_added');
  }));

  it('reconnects with backoff on unexpected close', fakeAsync(() => {
    service.events$.subscribe();
    const sock1 = FakeWebSocket.instances[0];
    sock1.open();
    sock1.emit({ type: 'hello', serverTime: 't', protocolVersion: 1 });
    tick();
    expect(service.connectionState()).toBe('live');

    sock1.drop();
    tick();
    expect(service.connectionState()).toBe('reconnecting');

    // Backoff schedules a reconnect - advance fake time past the first delay (500ms).
    tick(500);
    expect(FakeWebSocket.instances.length).toBe(2);
  }));

  it('disconnect() puts the service into offline and stops reconnecting', fakeAsync(() => {
    service.events$.subscribe();
    const sock = FakeWebSocket.instances[0];
    sock.open();
    sock.emit({ type: 'hello', serverTime: 't', protocolVersion: 1 });
    service.disconnect();
    tick();
    expect(service.connectionState()).toBe('offline');
    expect(sock.closedExplicitly).toBe(true);

    // Even after backoff, no new socket is created.
    tick(10000);
    expect(FakeWebSocket.instances.length).toBe(1);
  }));

  it('does not open a second socket when a second subscriber joins', () => {
    service.events$.subscribe();
    service.events$.subscribe();
    expect(FakeWebSocket.instances.length).toBe(1);
  });

  it('lastEventAt updates on every event', fakeAsync(() => {
    expect(service.lastEventAt()).toBeNull();
    service.events$.subscribe();
    const sock = FakeWebSocket.instances[0];
    sock.open();
    sock.emit({ type: 'hello', serverTime: 't', protocolVersion: 1 });
    tick();
    expect(service.lastEventAt()).not.toBeNull();
  }));
});
