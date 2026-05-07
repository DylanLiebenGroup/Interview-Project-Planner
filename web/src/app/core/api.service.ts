import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Project, ActivityItem, Task, TaskStatus } from './models';

const API_BASE = 'http://localhost:3001/api';

export interface TaskMutationResponse {
  task: Task;
  project: Project;
}

export interface TaskDeleteResponse {
  project: Project;
}

@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);

  getProjects(): Observable<Project[]> {
    return this.http.get<Project[]>(`${API_BASE}/projects`);
  }

  getActivity(): Observable<ActivityItem[]> {
    return this.http.get<ActivityItem[]>(`${API_BASE}/activity`);
  }

  updateProject(id: string, patch: Partial<Project>): Observable<Project> {
    return this.http.patch<Project>(`${API_BASE}/projects/${id}`, patch);
  }

  deleteProject(id: string): Observable<void> {
    return this.http.delete<void>(`${API_BASE}/projects/${id}`);
  }

  getTasks(projectId: string): Observable<Task[]> {
    return this.http.get<Task[]>(`${API_BASE}/projects/${projectId}/tasks`);
  }

  createTask(
    projectId: string,
    payload: { title: string; status?: TaskStatus },
  ): Observable<TaskMutationResponse> {
    return this.http.post<TaskMutationResponse>(
      `${API_BASE}/projects/${projectId}/tasks`,
      payload,
    );
  }

  updateTask(
    taskId: string,
    patch: Partial<Pick<Task, 'title' | 'status'>>,
  ): Observable<TaskMutationResponse> {
    return this.http.patch<TaskMutationResponse>(`${API_BASE}/tasks/${taskId}`, patch);
  }

  deleteTask(taskId: string): Observable<TaskDeleteResponse> {
    return this.http.delete<TaskDeleteResponse>(`${API_BASE}/tasks/${taskId}`);
  }
}
