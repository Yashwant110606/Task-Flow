import { X } from 'lucide-react';
import { useEffect, useState, type FormEvent } from 'react';
import { PriorityControl } from './PriorityControl.tsx';
import { StatusControl } from './StatusControl.tsx';
import type { TaskItem, TaskPriority, TaskStatus } from '../types/task.ts';

interface TaskFormModalProps {
  open: boolean;
  mode: 'create' | 'edit';
  initialTask?: TaskItem | null;
  defaultStatus?: TaskStatus;
  submitting: boolean;
  onClose: () => void;
  onSubmit: (values: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: string | null;
  }) => Promise<void>;
}

export function TaskFormModal({
  open,
  mode,
  initialTask,
  defaultStatus = 'Planned',
  submitting,
  onClose,
  onSubmit,
}: TaskFormModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<TaskStatus>(defaultStatus);
  const [priority, setPriority] = useState<TaskPriority>('Medium');
  const [dueDate, setDueDate] = useState('');
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    if (mode === 'edit' && initialTask) {
      setTitle(initialTask.title);
      setDescription(initialTask.description);
      setStatus(initialTask.status);
      setPriority(initialTask.priority);
      setDueDate(initialTask.dueDate ?? '');
    } else {
      setTitle('');
      setDescription('');
      setStatus(defaultStatus);
      setPriority('Medium');
      setDueDate('');
    }
    setValidationError(null);
  }, [open, mode, initialTask, defaultStatus]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !submitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, submitting, onClose]);

  if (!open) return null;

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setValidationError('Please enter a task title.');
      return;
    }
    if (trimmedTitle.length > 140) {
      setValidationError('Task title must be 140 characters or fewer.');
      return;
    }
    if (description.trim().length > 1000) {
      setValidationError('Description must be 1,000 characters or fewer.');
      return;
    }

    setValidationError(null);
    try {
      await onSubmit({
        title: trimmedTitle,
        description: description.trim(),
        status,
        priority,
        dueDate: dueDate.trim() ? dueDate.trim() : null,
      });
    } catch (err) {
      setValidationError(
        err instanceof Error ? err.message : 'Unable to save task.'
      );
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 p-0 backdrop-blur-[1px] sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="task-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !submitting) {
          onClose();
        }
      }}
    >
      <div className="max-h-[92vh] w-full overflow-y-auto rounded-t-2xl border border-slate-200 bg-white p-5 shadow-lg sm:max-w-lg sm:rounded-xl sm:p-6">
        <div className="flex items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <h2
            id="task-modal-title"
            className="font-display text-lg font-semibold text-slate-900"
          >
            {mode === 'create' ? 'Create task' : 'Edit task'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            aria-label="Close dialog"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-indigo-600 sm:h-9 sm:w-9"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-5">
          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="task-title-input"
                className="block text-sm font-medium text-slate-800"
              >
                Title
              </label>
              <span className="font-mono text-xs tabular-nums text-slate-400">
                {title.trim().length}/140
              </span>
            </div>
            <input
              id="task-title-input"
              type="text"
              autoFocus
              maxLength={140}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Prepare onboarding checklist"
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/15 sm:min-h-0 sm:text-sm"
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label
                htmlFor="task-description-input"
                className="block text-sm font-medium text-slate-800"
              >
                Notes <span className="font-normal text-slate-500">(optional)</span>
              </label>
              <span className="font-mono text-xs tabular-nums text-slate-400">
                {description.trim().length}/1000
              </span>
            </div>
            <textarea
              id="task-description-input"
              rows={3}
              maxLength={1000}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add helpful context, links, or next steps..."
              className="mt-1.5 w-full resize-none rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/15 sm:text-sm"
            />
          </div>

          <div className="space-y-4">
            <div>
              <span className="mb-2 block text-sm font-medium text-slate-800">
                Status
              </span>
              <StatusControl
                value={status}
                onChange={setStatus}
                disabled={submitting}
                size="md"
                fullWidthOnMobile
              />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-end">
              <div>
                <span className="mb-2 block text-sm font-medium text-slate-800">
                  Priority
                </span>
                <PriorityControl
                  value={priority}
                  onChange={setPriority}
                  disabled={submitting}
                  fullWidthOnMobile
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label
                    htmlFor="task-due-date-input"
                    className="block text-sm font-medium text-slate-800"
                  >
                    Due date <span className="font-normal text-slate-500">(optional)</span>
                  </label>
                  {dueDate && (
                    <button
                      type="button"
                      onClick={() => setDueDate('')}
                      disabled={submitting}
                      className="text-xs font-medium text-indigo-600 hover:text-indigo-800"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <input
                  id="task-due-date-input"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  disabled={submitting}
                  className="min-h-[42px] w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-base text-slate-900 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/15 sm:min-h-[38px] sm:text-sm"
                />
              </div>
            </div>
          </div>

          {validationError && (
            <div
              role="alert"
              className="rounded-lg border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm text-red-800"
            >
              {validationError}
            </div>
          )}

          <div className="flex flex-col-reverse gap-2.5 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-indigo-600 whitespace-nowrap sm:min-h-0 sm:w-auto"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="min-h-[44px] w-full rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-2 text-sm font-medium text-white shadow-sm shadow-indigo-600/20 transition-all hover:from-indigo-700 hover:to-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-60 whitespace-nowrap sm:min-h-0 sm:w-auto"
            >
              {submitting
                ? 'Saving...'
                : mode === 'create'
                ? 'Create task'
                : 'Save changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
