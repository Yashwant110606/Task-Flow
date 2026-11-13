import type { TaskStatus } from '../types/task.ts';

export function getLocalTodayYmd(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDueDateLabel(dueDate: string): string {
  const parts = dueDate.split('-').map(Number);
  if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) {
    return dueDate;
  }
  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);
  const currentYear = new Date().getFullYear();

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    ...(year !== currentYear ? { year: 'numeric' } : {}),
  }).format(date);
}

export interface DueDateMeta {
  isOverdue: boolean;
  isDueToday: boolean;
  text: string;
}

export function getDueDateMeta(
  dueDate: string | null,
  status: TaskStatus
): DueDateMeta | null {
  if (!dueDate) return null;

  const today = getLocalTodayYmd();
  const formatted = formatDueDateLabel(dueDate);

  if (status !== 'Complete' && dueDate < today) {
    return {
      isOverdue: true,
      isDueToday: false,
      text: `Overdue · ${formatted}`,
    };
  }

  if (status !== 'Complete' && dueDate === today) {
    return {
      isOverdue: false,
      isDueToday: true,
      text: `Due today · ${formatted}`,
    };
  }

  return {
    isOverdue: false,
    isDueToday: false,
    text: `Due ${formatted}`,
  };
}
