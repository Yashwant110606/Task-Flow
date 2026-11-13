import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import { TASK_PRIORITIES, type TaskPriority } from '../types/task.ts';

interface PriorityControlProps {
  value: TaskPriority;
  onChange: (nextPriority: TaskPriority) => void;
  disabled?: boolean;
  fullWidthOnMobile?: boolean;
}

export function PriorityIcon({
  priority,
  className = 'h-3.5 w-3.5',
}: {
  priority: TaskPriority;
  className?: string;
}) {
  switch (priority) {
    case 'Low':
      return <ArrowDown className={className} aria-hidden="true" />;
    case 'Medium':
      return <Minus className={className} aria-hidden="true" />;
    case 'High':
      return <ArrowUp className={className} aria-hidden="true" />;
  }
}

export function getPriorityTextColor(priority: TaskPriority): string {
  switch (priority) {
    case 'Low':
      return 'text-cyan-700';
    case 'Medium':
      return 'text-amber-600';
    case 'High':
      return 'text-rose-600';
  }
}

function getPriorityButtonClasses(priority: TaskPriority, active: boolean): string {
  if (!active) {
    return 'text-slate-600 hover:text-slate-900 hover:bg-white/70 border-transparent';
  }
  switch (priority) {
    case 'Low':
      return 'bg-cyan-50 text-cyan-900 border-cyan-300 shadow-2xs';
    case 'Medium':
      return 'bg-amber-50 text-amber-900 border-amber-300 shadow-2xs';
    case 'High':
      return 'bg-rose-50 text-rose-900 border-rose-300 shadow-2xs';
  }
}

export function PriorityLabel({
  priority,
  className = '',
}: {
  priority: TaskPriority;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-xs font-medium whitespace-nowrap ${getPriorityTextColor(
        priority
      )} ${className}`}
    >
      <PriorityIcon priority={priority} className="h-3.5 w-3.5 shrink-0" />
      <span>{priority}</span>
    </span>
  );
}

export function PriorityControl({
  value,
  onChange,
  disabled = false,
  fullWidthOnMobile = false,
}: PriorityControlProps) {
  return (
    <div
      role="group"
      aria-label="Task priority"
      className={`items-center rounded-lg border border-slate-200/90 bg-slate-100/80 p-0.5 ${
        fullWidthOnMobile ? 'flex w-full sm:inline-flex sm:w-auto' : 'inline-flex max-w-full'
      }`}
    >
      {TASK_PRIORITIES.map((priority) => {
        const isActive = value === priority;
        return (
          <button
            key={priority}
            type="button"
            disabled={disabled}
            aria-pressed={isActive}
            onClick={() => {
              if (!isActive) {
                onChange(priority);
              }
            }}
            className={`inline-flex items-center justify-center gap-1.5 rounded-md border px-3 py-2.5 text-xs font-medium transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap shrink-0 sm:py-2 ${
              fullWidthOnMobile ? 'flex-1 sm:flex-initial' : ''
            } ${getPriorityButtonClasses(priority, isActive)}`}
          >
            <PriorityIcon
              priority={priority}
              className={`h-3.5 w-3.5 shrink-0 ${
                isActive ? getPriorityTextColor(priority) : 'text-slate-400'
              }`}
            />
            <span>{priority}</span>
          </button>
        );
      })}
    </div>
  );
}
