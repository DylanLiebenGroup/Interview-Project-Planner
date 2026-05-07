import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { ApiService, TaskMutationResponse, TaskDeleteResponse } from './api.service';
import { Project, ActivityItem, Task } from './models';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ApiService,
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('getProjects() hits /api/projects and returns the array', (done) => {
    const fake: Project[] = [];
    service.getProjects().subscribe((projects) => {
      expect(projects).toBe(fake);
      done();
    });
    const req = httpMock.expectOne('http://localhost:3001/api/projects');
    expect(req.request.method).toBe('GET');
    req.flush(fake);
  });

  it('getActivity() hits /api/activity and returns the array', (done) => {
    const fake: ActivityItem[] = [];
    service.getActivity().subscribe((items) => {
      expect(items).toBe(fake);
      done();
    });
    const req = httpMock.expectOne('http://localhost:3001/api/activity');
    expect(req.request.method).toBe('GET');
    req.flush(fake);
  });

  it('updateProject() PATCHes /api/projects/:id with the patch body', (done) => {
    const patch: Partial<Project> = { status: 'completed', progress: 1 };
    const fake = { id: 'p_001' } as Project;
    service.updateProject('p_001', patch).subscribe((p) => {
      expect(p).toBe(fake);
      done();
    });
    const req = httpMock.expectOne('http://localhost:3001/api/projects/p_001');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual(patch);
    req.flush(fake);
  });

  it('deleteProject() DELETEs /api/projects/:id', (done) => {
    service.deleteProject('p_001').subscribe(() => done());
    const req = httpMock.expectOne('http://localhost:3001/api/projects/p_001');
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });

  it('getTasks() GETs the project tasks', (done) => {
    const fake: Task[] = [];
    service.getTasks('p_001').subscribe((tasks) => {
      expect(tasks).toBe(fake);
      done();
    });
    const req = httpMock.expectOne('http://localhost:3001/api/projects/p_001/tasks');
    expect(req.request.method).toBe('GET');
    req.flush(fake);
  });

  it('createTask() POSTs to the project tasks endpoint', (done) => {
    const fake = { task: {} as Task, project: {} as Project } satisfies TaskMutationResponse;
    service.createTask('p_001', { title: 'Hello' }).subscribe((r) => {
      expect(r).toBe(fake);
      done();
    });
    const req = httpMock.expectOne('http://localhost:3001/api/projects/p_001/tasks');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ title: 'Hello' });
    req.flush(fake);
  });

  it('updateTask() PATCHes /api/tasks/:taskId with the patch body', (done) => {
    const fake = { task: {} as Task, project: {} as Project } satisfies TaskMutationResponse;
    service.updateTask('p_001_t001', { status: 'completed' }).subscribe((r) => {
      expect(r).toBe(fake);
      done();
    });
    const req = httpMock.expectOne('http://localhost:3001/api/tasks/p_001_t001');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ status: 'completed' });
    req.flush(fake);
  });

  it('deleteTask() DELETEs /api/tasks/:taskId and returns the recomputed project', (done) => {
    const fake = { project: {} as Project } satisfies TaskDeleteResponse;
    service.deleteTask('p_001_t001').subscribe((r) => {
      expect(r).toBe(fake);
      done();
    });
    const req = httpMock.expectOne('http://localhost:3001/api/tasks/p_001_t001');
    expect(req.request.method).toBe('DELETE');
    req.flush(fake);
  });
});
