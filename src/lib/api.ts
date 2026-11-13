import { getFreshIdToken } from './auth.ts';
import type { CreateTaskInput, TaskItem, UpdateTaskInput } from '../types/task.ts';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

async function authorizedFetch(
  input: string,
  init: RequestInit = {}
): Promise<Response> {
  const url = input.startsWith('http://') || input.startsWith('https://')
    ? input
    : `${API_BASE_URL}${input}`;

  let token = await getFreshIdToken(false);
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  let response = await fetch(url, { ...init, headers });

  if (response.status === 401) {
    token = await getFreshIdToken(true);
    headers.set('Authorization', `Bearer ${token}`);
    response = await fetch(url, { ...init, headers });
  }

  return response;
}

async function parseJsonOrThrow<T>(response: Response): Promise<T> {
  const data = (await response.json().catch(() => ({}))) as T & { error?: string };
  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }
  return data;
}

export async function fetchTasks(): Promise<TaskItem[]> {
  const response = await authorizedFetch('/api/tasks');
  const data = await parseJsonOrThrow<{ tasks: TaskItem[] }>(response);
  return data.tasks;
}

export async function createTaskRequest(payload: CreateTaskInput): Promise<TaskItem> {
  const response = await authorizedFetch('/api/tasks', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const data = await parseJsonOrThrow<{ task: TaskItem }>(response);
  return data.task;
}

export async function updateTaskRequest(
  id: string,
  payload: UpdateTaskInput
): Promise<TaskItem> {
  const response = await authorizedFetch(`/api/tasks/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  });
  const data = await parseJsonOrThrow<{ task: TaskItem }>(response);
  return data.task;
}

export async function deleteTaskRequest(id: string): Promise<void> {
  const response = await authorizedFetch(`/api/tasks/${id}`, {
    method: 'DELETE',
  });
  await parseJsonOrThrow<{ deleted: boolean; id: string }>(response);
}
