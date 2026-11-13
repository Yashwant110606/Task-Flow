import { AlertTriangle, Calendar } from 'lucide-react';
import { getDueDateMeta } from '../lib/date.ts';
import type { TaskStatus } from '../types/task.ts';

interface DueDateLabelProps {
  dueDate: string | null;
  status: TaskStatus;
  className?: string;
}

export function DueDateLabel({
  dueDate,
  status,
  className = '',
}: DueDateLabelProps) {
  const meta = getDueDateMeta(dueDate, status);
  if (!meta) return null;

  const colorClasses = meta.isOverdue
    ? 'text-rose-600 font-semibold'
    : meta.isDueToday
    ? 'text-amber-700 font-medium'
    : status === 'Complete'
    ? 'text-slate-400 font-normal'
    : 'text-slate-600 font-medium';

  return (
    <span
      className={`inline-flex items-center gap-1 text-xs whitespace-nowrap ${colorClasses} ${className}`}
    >
      {meta.isOverdue ? (
        <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-rose-600" aria-hidden="true" />
      ) : (
        <Calendar className="h-3.5 w-3.5 shrink-0 opacity-80" aria-hidden="true" />
      )}
      <span>{meta.text}</span>
    </span>
  );
}
