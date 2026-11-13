export type TaskStatus = 'Planned' | 'In Progress' | 'Complete';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export const TASK_STATUSES: readonly TaskStatus[] = [
  'Planned',
  'In Progress',
  'Complete',
] as const;

export const TASK_PRIORITIES: readonly TaskPriority[] = [
  'Low',
  'Medium',
  'High',
] as const;

export interface TaskItem {
  id: string;
  userId: string;
  title: string;
  description: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  photoUrl: string;
}

export interface CreateTaskInput {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  dueDate?: string | null;
}
