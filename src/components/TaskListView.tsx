import { Pencil, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { DueDateLabel } from './DueDateLabel.tsx';
import { PriorityLabel } from './PriorityControl.tsx';
import { StatusControl } from './StatusControl.tsx';
import type { TaskItem, TaskStatus } from '../types/task.ts';

interface TaskListViewProps {
  tasks: TaskItem[];
  updatingTaskIds: Set<string>;
  onStatusChange: (taskId: string, nextStatus: TaskStatus) => void;
  onEdit: (task: TaskItem) => void;
  onDelete: (task: TaskItem) => void;
}

function formatDate(isoString: string): string {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function TaskListView({
  tasks,
  updatingTaskIds,
  onStatusChange,
  onEdit,
  onDelete,
}: TaskListViewProps) {
  return (
    <div className="overflow-hidden rounded-xl border border-indigo-100 bg-white shadow-[0_2px_10px_rgba(79,70,229,0.05)]">
      <div className="hidden items-center gap-4 border-b border-indigo-100/80 bg-indigo-50/40 px-5 py-3 text-xs font-medium text-slate-600 lg:grid lg:grid-cols-[minmax(0,1fr)_92px_auto_136px_76px]">
        <div>Task</div>
        <div>Priority</div>
        <div>Status</div>
        <div className="text-right">Updated</div>
        <div className="text-right">Actions</div>
      </div>

      <ul className="divide-y divide-slate-100">
        {tasks.map((task) => {
          const isUpdating = updatingTaskIds.has(task.id);
          const isComplete = task.status === 'Complete';

          return (
            <motion.li
              key={task.id}
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.16, ease: [0.16, 1, 0.3, 1] }}
              className={`grid grid-cols-1 gap-3 px-4 py-4 transition-colors duration-150 hover:bg-indigo-50/35 sm:px-5 lg:grid-cols-[minmax(0,1fr)_92px_auto_136px_76px] lg:items-center lg:gap-4 ${
                isComplete ? 'bg-emerald-50/25' : ''
              }`}
            >
              <div className="min-w-0 lg:order-1">
                <div className="flex items-baseline gap-2.5">
                  <span className="font-mono text-xs tabular-nums text-slate-400 shrink-0" title={`Task ID: ${task.id}`}>
                    #{task.id.length > 8 ? task.id.slice(-6) : task.id}
                  </span>
                  <p
                    className={`text-sm font-medium leading-snug lg:truncate ${
                      isComplete
                        ? 'text-slate-400 line-through decoration-slate-300'
                        : 'text-slate-900'
                    }`}
                  >
                    {task.title}
                  </p>
                </div>
                {(task.dueDate || task.description) && (
                  <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 sm:pl-7">
                    <DueDateLabel dueDate={task.dueDate} status={task.status} />
                    {task.dueDate && task.description && (
                      <span className="text-xs text-slate-300" aria-hidden="true">
                        ·
                      </span>
                    )}
                    {task.description && (
                      <p className="line-clamp-2 min-w-0 text-xs leading-relaxed text-slate-500 lg:line-clamp-1">
                        {task.description}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="order-2 lg:order-3">
                <StatusControl
                  value={task.status}
                  onChange={(nextStatus) => onStatusChange(task.id, nextStatus)}
                  disabled={isUpdating}
                  size="sm"
                  fullWidthOnMobile
                />
              </div>

              <div className="order-3 flex flex-wrap items-center justify-between gap-2 pt-0.5 lg:contents">
                <div className="flex items-center gap-2 lg:order-2">
                  <PriorityLabel priority={task.priority} />
                  <span
                    className="text-xs text-slate-300 lg:hidden"
                    aria-hidden="true"
                  >
                    ·
                  </span>
                  <span className="font-mono text-xs tabular-nums text-slate-500 whitespace-nowrap lg:hidden">
                    {formatDate(task.updatedAt)}
                  </span>
                </div>

                <span className="hidden font-mono text-xs tabular-nums text-slate-500 whitespace-nowrap lg:order-4 lg:block lg:text-right">
                  {formatDate(task.updatedAt)}
                </span>

                <div className="flex items-center justify-end gap-1 shrink-0 lg:order-5">
                  <button
                    type="button"
                    onClick={() => onEdit(task)}
                    aria-label={`Edit task "${task.title}"`}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-indigo-600 lg:h-8 lg:w-8"
                  >
                    <Pencil className="h-4 w-4 lg:h-3.5 lg:w-3.5" aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(task)}
                    aria-label={`Delete task "${task.title}"`}
                    className="flex h-10 w-10 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-700 focus-visible:outline-2 focus-visible:outline-rose-600 lg:h-8 lg:w-8"
                  >
                    <Trash2 className="h-4 w-4 lg:h-3.5 lg:w-3.5" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </motion.li>
          );
        })}
      </ul>
    </div>
  );
}
