export type ProjectStatus = 'not_started' | 'in_progress' | 'completed' | 'overdue';

export interface Owner {
  id: string;
  name: string;
  initials: string;
  avatarColor: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  status: ProjectStatus;
  owner: Owner;
  dueDate: string;        // ISO date (YYYY-MM-DD)
  progress: number;       // 0..1
  tasksTotal: number;
  tasksDone: number;
  tags: string[];
}

export type ActivityType =
  | 'task_completed'
  | 'project_created'
  | 'comment_added'
  | 'status_changed';

export interface Actor {
  id: string;
  name: string;
  initials: string;
}

export interface ActivityItem {
  id: string;
  type: ActivityType;
  actor: Actor;
  projectId: string;
  projectName: string;
  message: string;
  timestamp: string;      // ISO datetime
}

export type TaskStatus = 'not_started' | 'in_progress' | 'completed';

export interface Task {
  id: string;
  projectId: string;
  title: string;
  status: TaskStatus;
}
