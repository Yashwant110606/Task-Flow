import { Pencil, Plus, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { DueDateLabel } from './DueDateLabel.tsx';
import { PriorityLabel } from './PriorityControl.tsx';
import { getStatusIconColor, StatusIcon } from './StatusControl.tsx';
import { TASK_STATUSES, type TaskItem, type TaskStatus } from '../types/task.ts';

interface TaskBoardViewProps {
  tasks: TaskItem[];
  updatingTaskIds: Set<string>;
  onStatusChange: (taskId: string, nextStatus: TaskStatus) => void;
  onEdit: (task: TaskItem) => void;
  onDelete: (task: TaskItem) => void;
  onQuickCreateInColumn: (status: TaskStatus) => void;
}

function formatShortDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(date);
}

function getColumnContainerClasses(status: TaskStatus): string {
  switch (status) {
    case 'Planned':
      return 'border-sky-200/80 bg-sky-50/45';
    case 'In Progress':
      return 'border-amber-200/80 bg-amber-50/45';
    case 'Complete':
      return 'border-emerald-200/80 bg-emerald-50/45';
  }
}

function getColumnHeaderClasses(status: TaskStatus): string {
  switch (status) {
    case 'Planned':
      return 'border-sky-200/70 bg-sky-100/60';
    case 'In Progress':
      return 'border-amber-200/70 bg-amber-100/60';
    case 'Complete':
      return 'border-emerald-200/70 bg-emerald-100/60';
  }
}

export function TaskBoardView({
  tasks,
  updatingTaskIds,
  onStatusChange,
  onEdit,
  onDelete,
  onQuickCreateInColumn,
}: TaskBoardViewProps) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-3">
      {TASK_STATUSES.map((columnStatus) => {
        const columnTasks = tasks.filter((task) => task.status === columnStatus);
        const otherStatuses = TASK_STATUSES.filter((s) => s !== columnStatus);

        return (
          <section
            key={columnStatus}
            aria-label={`${columnStatus} tasks`}
            className={`flex flex-col overflow-hidden rounded-xl border ${getColumnContainerClasses(
              columnStatus
            )}`}
          >
            <div
              className={`flex items-center justify-between border-b px-4 py-3 ${getColumnHeaderClasses(
                columnStatus
              )}`}
            >
              <div className="flex items-center gap-2">
                <StatusIcon
                  status={columnStatus}
                  className={`h-4 w-4 shrink-0 ${getStatusIconColor(columnStatus)}`}
                />
                <h2 className="font-display text-sm font-semibold text-slate-900">
                  {columnStatus}
                </h2>
                <span className="font-mono text-xs tabular-nums text-slate-600">
                  {columnTasks.length}
                </span>
              </div>

              <button
                type="button"
                onClick={() => onQuickCreateInColumn(columnStatus)}
                aria-label={`Add task to ${columnStatus}`}
                className="inline-flex min-h-[36px] items-center gap-1 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-white hover:text-indigo-700 hover:shadow-2xs focus-visible:outline-2 focus-visible:outline-indigo-600 whitespace-nowrap shrink-0"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Add</span>
              </button>
            </div>

            <div className="flex-1 space-y-3 p-3">
              {columnTasks.length === 0 ? (
                <div className="rounded-lg border border-dashed border-slate-300/80 bg-white/60 px-4 py-8 text-center">
                  <p className="text-xs text-slate-500">
                    No tasks in {columnStatus}
                  </p>
                </div>
              ) : (
                columnTasks.map((task) => {
                  const isUpdating = updatingTaskIds.has(task.id);
                  const isComplete = task.status === 'Complete';

                  return (
                    <motion.article
                      key={task.id}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
                      className="rounded-lg border border-slate-200/90 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)] transition-all duration-150 hover:border-indigo-200 hover:shadow-[0_6px_16px_rgba(79,70,229,0.08)]"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <h3
                          className={`min-w-0 break-words text-sm font-medium leading-snug ${
                            isComplete
                              ? 'text-slate-400 line-through decoration-slate-300'
                              : 'text-slate-900'
                          }`}
                        >
                          {task.title}
                        </h3>
                        <div className="flex items-center gap-0.5 shrink-0 -mr-1.5 -mt-1.5 sm:-mr-1 sm:-mt-1">
                          <button
                            type="button"
                            onClick={() => onEdit(task)}
                            aria-label={`Edit task "${task.title}"`}
                            className="flex h-10 w-10 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-indigo-600 sm:h-8 sm:w-8"
                          >
                            <Pencil className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => onDelete(task)}
                            aria-label={`Delete task "${task.title}"`}
                            className="flex h-10 w-10 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-2 focus-visible:outline-rose-600 sm:h-8 sm:w-8"
                          >
                            <Trash2 className="h-4 w-4 sm:h-3.5 sm:w-3.5" aria-hidden="true" />
                          </button>
                        </div>
                      </div>

                      {task.description && (
                        <p className="mt-1.5 line-clamp-2 text-xs leading-relaxed text-slate-600">
                          {task.description}
                        </p>
                      )}

                      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                        <span className="font-mono text-[11px] tabular-nums whitespace-nowrap" title={`Task ID: ${task.id}`}>
                          #{task.id.length > 8 ? task.id.slice(-6) : task.id} · {formatShortDate(task.updatedAt)}
                        </span>
                        <span aria-hidden="true">·</span>
                        <PriorityLabel priority={task.priority} />
                        {task.dueDate && (
                          <>
                            <span aria-hidden="true">·</span>
                            <DueDateLabel
                              dueDate={task.dueDate}
                              status={task.status}
                            />
                          </>
                        )}
                      </div>

                      <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-100 pt-3 sm:flex sm:flex-wrap sm:items-center sm:justify-end sm:gap-1.5">
                        {otherStatuses.map((targetStatus) => (
                          <button
                            key={targetStatus}
                            type="button"
                            disabled={isUpdating}
                            onClick={() => onStatusChange(task.id, targetStatus)}
                            className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-md border border-slate-200 bg-slate-50/80 px-2.5 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:border-indigo-300 hover:bg-indigo-50/60 hover:text-indigo-900 focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-50 whitespace-nowrap sm:min-h-0 sm:py-1 sm:text-[11px]"
                          >
                            <StatusIcon
                              status={targetStatus}
                              className={`h-3.5 w-3.5 shrink-0 sm:h-3 sm:w-3 ${getStatusIconColor(
                                targetStatus
                              )}`}
                            />
                            <span>{targetStatus}</span>
                          </button>
                        ))}
                      </div>
                    </motion.article>
                  );
                })
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}
