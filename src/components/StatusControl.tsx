import { CheckCircle2, CircleDashed, Clock } from 'lucide-react';
import { TASK_STATUSES, type TaskStatus } from '../types/task.ts';

interface StatusControlProps {
  value: TaskStatus;
  onChange: (nextStatus: TaskStatus) => void;
  disabled?: boolean;
  size?: 'sm' | 'md';
  fullWidthOnMobile?: boolean;
}

export function StatusIcon({
  status,
  className = 'h-3.5 w-3.5',
}: {
  status: TaskStatus;
  className?: string;
}) {
  switch (status) {
    case 'Planned':
      return <CircleDashed className={className} aria-hidden="true" />;
    case 'In Progress':
      return <Clock className={className} aria-hidden="true" />;
    case 'Complete':
      return <CheckCircle2 className={className} aria-hidden="true" />;
  }
}

export function getStatusAccentClasses(status: TaskStatus, active: boolean): string {
  if (!active) {
    return 'text-slate-600 hover:text-slate-900 hover:bg-white/70 border-transparent';
  }
  switch (status) {
    case 'Planned':
      return 'bg-sky-50 text-sky-900 border-sky-300 shadow-2xs';
    case 'In Progress':
      return 'bg-amber-50 text-amber-900 border-amber-300 shadow-2xs';
    case 'Complete':
      return 'bg-emerald-50 text-emerald-900 border-emerald-300 shadow-2xs';
  }
}

export function getStatusIconColor(status: TaskStatus): string {
  switch (status) {
    case 'Planned':
      return 'text-sky-600';
    case 'In Progress':
      return 'text-amber-600';
    case 'Complete':
      return 'text-emerald-600';
  }
}

export function StatusControl({
  value,
  onChange,
  disabled = false,
  size = 'sm',
  fullWidthOnMobile = false,
}: StatusControlProps) {
  const paddingClass =
    size === 'sm'
      ? 'px-2 py-2 text-[11px] sm:px-2.5 sm:py-1.5 sm:text-xs'
      : 'px-2.5 py-2.5 text-xs sm:px-3 sm:py-2';

  return (
    <div
      role="group"
      aria-label="Task status"
      className={`items-center rounded-lg border border-slate-200/90 bg-slate-100/80 p-0.5 ${
        fullWidthOnMobile ? 'flex w-full sm:inline-flex sm:w-auto' : 'inline-flex max-w-full'
      }`}
    >
      {TASK_STATUSES.map((status) => {
        const isActive = value === status;
        return (
          <button
            key={status}
            type="button"
            disabled={disabled}
            aria-pressed={isActive}
            onClick={() => {
              if (!isActive) {
                onChange(status);
              }
            }}
            className={`inline-flex items-center justify-center gap-1.5 rounded-md border font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap shrink-0 ${
              fullWidthOnMobile ? 'flex-1 sm:flex-initial' : ''
            } ${paddingClass} ${getStatusAccentClasses(status, isActive)}`}
          >
            <StatusIcon
              status={status}
              className={`h-3.5 w-3.5 shrink-0 ${
                isActive ? getStatusIconColor(status) : 'text-slate-400'
              }`}
            />
            <span>{status}</span>
          </button>
        );
      })}
    </div>
  );
}
