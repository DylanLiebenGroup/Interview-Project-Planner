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
  description: string;
  status: TaskStatus;
}

export type TickerKind = 'announcement' | 'incident' | 'milestone';

export interface TickerItem {
  id: string;
  kind: TickerKind;
  message: string;
  projectId?: string;
  projectName?: string;
  timestamp: string;
}

export interface PresenceEntry {
  user: Actor;
  projectId: string;
  projectName: string;
  since: string;
}

export type WsConnectionState =
  | 'connecting'
  | 'live'
  | 'reconnecting'
  | 'offline';

export type WsEvent =
  | { type: 'hello';            serverTime: string; protocolVersion: 1 }
  | { type: 'activity_added';   item: ActivityItem }
  | { type: 'project_updated';  project: Project }
  | { type: 'task_updated';     task: Task; project: Project }
  | { type: 'ticker_updated';   item: TickerItem }
  | { type: 'presence_changed'; entries: PresenceEntry[] };
