import type { User } from 'firebase/auth';
import {
  ArrowUpDown,
  CheckCircle2,
  Columns3,
  Layers,
  List,
  LogOut,
  Plus,
  Search,
  X,
} from 'lucide-react';
import { MotionConfig } from 'motion/react';
import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { AuthScreen } from './components/AuthScreen.tsx';
import { ConfirmDialog } from './components/ConfirmDialog.tsx';
import { PriorityControl } from './components/PriorityControl.tsx';
import { getStatusIconColor, StatusIcon } from './components/StatusControl.tsx';
import { TaskBoardView } from './components/TaskBoardView.tsx';
import { TaskFormModal } from './components/TaskFormModal.tsx';
import { TaskListView } from './components/TaskListView.tsx';
import {
  createTaskRequest,
  deleteTaskRequest,
  fetchTasks,
  updateTaskRequest,
} from './lib/api.ts';
import {
  signInWithGoogle,
  signOutUser,
  subscribeToAuthChanges,
} from './lib/auth.ts';
import {
  TASK_STATUSES,
  type TaskItem,
  type TaskPriority,
  type TaskStatus,
} from './types/task.ts';

type ViewMode = 'list' | 'board';
type StatusFilter = 'All' | TaskStatus;
type SortMode = 'recent' | 'priority';

const FILTER_OPTIONS: readonly StatusFilter[] = [
  'All',
  'Planned',
  'In Progress',
  'Complete',
];

const PRIORITY_RANK: Record<TaskPriority, number> = {
  High: 3,
  Medium: 2,
  Low: 1,
};

function getSummaryCardAccent(status: TaskStatus, isSelected: boolean): string {
  switch (status) {
    case 'Planned':
      return isSelected
        ? 'bg-sky-50/90'
        : 'hover:bg-sky-50/60';
    case 'In Progress':
      return isSelected
        ? 'bg-amber-50/90'
        : 'hover:bg-amber-50/60';
    case 'Complete':
      return isSelected
        ? 'bg-emerald-50/90'
        : 'hover:bg-emerald-50/60';
  }
}

function getSummaryCountColor(status: TaskStatus): string {
  switch (status) {
    case 'Planned':
      return 'text-sky-700';
    case 'In Progress':
      return 'text-amber-700';
    case 'Complete':
      return 'text-emerald-700';
  }
}

function getReadableAuthError(err: unknown): string {
  const code =
    typeof err === 'object' && err !== null && 'code' in err
      ? String((err as { code?: unknown }).code)
      : '';
  if (code === 'auth/popup-blocked') {
    return 'Sign-in popup was blocked by your browser. Please allow popups for this site and try again.';
  }
  if (code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
    return 'Google sign-in was cancelled before completing.';
  }
  if (code === 'auth/network-request-failed') {
    return 'Network error while connecting to Google. Please check your connection and try again.';
  }
  return err instanceof Error ? err.message : 'Unable to sign in with Google.';
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [signingIn, setSigningIn] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('All');
  const [sortMode, setSortMode] = useState<SortMode>('recent');
  const [searchQuery, setSearchQuery] = useState('');

  const [quickTitle, setQuickTitle] = useState('');
  const [quickPriority, setQuickPriority] = useState<TaskPriority>('Medium');
  const [quickCreating, setQuickCreating] = useState(false);

  const [updatingTaskIds, setUpdatingTaskIds] = useState<Set<string>>(new Set());

  const [modalState, setModalState] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    task: TaskItem | null;
    defaultStatus: TaskStatus;
  }>({
    open: false,
    mode: 'create',
    task: null,
    defaultStatus: 'Planned',
  });
  const [modalSubmitting, setModalSubmitting] = useState(false);

  const [taskToDelete, setTaskToDelete] = useState<TaskItem | null>(null);
  const [deletingTask, setDeletingTask] = useState(false);

  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  const showFeedback = useCallback((message: string) => {
    setFeedbackMessage(message);
  }, []);

  useEffect(() => {
    if (!feedbackMessage) return;
    const timer = window.setTimeout(() => setFeedbackMessage(null), 3200);
    return () => window.clearTimeout(timer);
  }, [feedbackMessage]);

  const loadTasks = useCallback(async () => {
    setLoadingTasks(true);
    setTasksError(null);
    try {
      const data = await fetchTasks();
      setTasks(data);
    } catch (err) {
      setTasksError(
        err instanceof Error ? err.message : 'Failed to load your tasks.'
      );
    } finally {
      setLoadingTasks(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = subscribeToAuthChanges((nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser) {
        setAuthError(null);
        void loadTasks();
      } else {
        setTasks([]);
        setTasksError(null);
      }
    });
    return unsubscribe;
  }, [loadTasks]);

  const handleGoogleSignIn = async () => {
    setSigningIn(true);
    setAuthError(null);
    try {
      await signInWithGoogle();
    } catch (err) {
      setAuthError(getReadableAuthError(err));
    } finally {
      setSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    await signOutUser();
    setTasks([]);
    setSearchQuery('');
    setStatusFilter('All');
  };

  const handleQuickCreate = async (event: FormEvent) => {
    event.preventDefault();
    const trimmed = quickTitle.trim();
    if (!trimmed || quickCreating) return;

    setQuickCreating(true);
    setTasksError(null);
    try {
      const initialStatus: TaskStatus =
        statusFilter !== 'All' ? statusFilter : 'Planned';
      const created = await createTaskRequest({
        title: trimmed,
        status: initialStatus,
        priority: quickPriority,
      });
      setTasks((prev) => [created, ...prev]);
      setQuickTitle('');
      showFeedback(`Added "${created.title}" · ${created.priority} priority`);
    } catch (err) {
      setTasksError(
        err instanceof Error ? err.message : 'Failed to create task.'
      );
    } finally {
      setQuickCreating(false);
    }
  };

  const handleStatusChange = async (taskId: string, nextStatus: TaskStatus) => {
    const previousTask = tasks.find((t) => t.id === taskId);
    if (!previousTask || previousTask.status === nextStatus) return;

    const optimisticTimestamp = new Date().toISOString();
    setTasks((prev) =>
      prev.map((t) =>
        t.id === taskId
          ? { ...t, status: nextStatus, updatedAt: optimisticTimestamp }
          : t
      )
    );
    setUpdatingTaskIds((prev) => new Set(prev).add(taskId));

    try {
      const updated = await updateTaskRequest(taskId, { status: nextStatus });
      setTasks((prev) => prev.map((t) => (t.id === taskId ? updated : t)));
      showFeedback(`Moved to ${nextStatus}`);
    } catch (err) {
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? previousTask : t))
      );
      setTasksError(
        err instanceof Error ? err.message : 'Failed to update task status.'
      );
    } finally {
      setUpdatingTaskIds((prev) => {
        const next = new Set(prev);
        next.delete(taskId);
        return next;
      });
    }
  };

  const handleModalSubmit = async (values: {
    title: string;
    description: string;
    status: TaskStatus;
    priority: TaskPriority;
    dueDate: string | null;
  }) => {
    setModalSubmitting(true);
    try {
      if (modalState.mode === 'create') {
        const created = await createTaskRequest(values);
        setTasks((prev) => [created, ...prev]);
        showFeedback(`Created "${created.title}"`);
      } else if (modalState.task) {
        const updated = await updateTaskRequest(modalState.task.id, values);
        setTasks((prev) =>
          prev.map((t) => (t.id === updated.id ? updated : t))
        );
        showFeedback(`Updated "${updated.title}"`);
      }
      setModalState((prev) => ({ ...prev, open: false, task: null }));
    } finally {
      setModalSubmitting(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!taskToDelete || deletingTask) return;
    setDeletingTask(true);
    try {
      await deleteTaskRequest(taskToDelete.id);
      setTasks((prev) => prev.filter((t) => t.id !== taskToDelete.id));
      showFeedback(`Deleted "${taskToDelete.title}"`);
      setTaskToDelete(null);
    } catch (err) {
      setTasksError(
        err instanceof Error ? err.message : 'Failed to delete task.'
      );
      setTaskToDelete(null);
    } finally {
      setDeletingTask(false);
    }
  };

  const counts = useMemo(() => {
    const result: Record<StatusFilter, number> = {
      All: tasks.length,
      Planned: 0,
      'In Progress': 0,
      Complete: 0,
    };
    for (const task of tasks) {
      result[task.status] += 1;
    }
    return result;
  }, [tasks]);

  const progressPercentages = useMemo(() => {
    if (tasks.length === 0) {
      return { complete: 0, inProgress: 0, planned: 0 };
    }
    return {
      complete: (counts.Complete / tasks.length) * 100,
      inProgress: (counts['In Progress'] / tasks.length) * 100,
      planned: (counts.Planned / tasks.length) * 100,
    };
  }, [tasks.length, counts]);

  const filteredTasks = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    const list = tasks.filter((task) => {
      if (viewMode === 'list' && statusFilter !== 'All' && task.status !== statusFilter) {
        return false;
      }
      if (query) {
        const matchesTitle = task.title.toLowerCase().includes(query);
        const matchesDesc = task.description.toLowerCase().includes(query);
        return matchesTitle || matchesDesc;
      }
      return true;
    });

    if (sortMode === 'priority') {
      return [...list].sort((a, b) => {
        const diff = PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority];
        if (diff !== 0) return diff;
        return b.updatedAt.localeCompare(a.updatedAt);
      });
    }
    return list;
  }, [tasks, viewMode, statusFilter, searchQuery, sortMode]);

  if (!authReady) {
    return (
      <div className="min-h-screen bg-[#F4F6FF] flex items-center justify-center px-6">
        <div className="space-y-3 text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-indigo-200 border-t-indigo-600" />
          <p className="text-sm text-slate-600">Checking sign-in session...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <MotionConfig reducedMotion="user">
        <AuthScreen
          onSignIn={handleGoogleSignIn}
          loading={signingIn}
          error={authError}
        />
      </MotionConfig>
    );
  }

  const userName = user.displayName || user.email || 'Google User';
  const userInitial = userName.charAt(0).toUpperCase();

  return (
    <MotionConfig reducedMotion="user">
      <div className="min-h-screen bg-[#F4F6FF] bg-[radial-gradient(ellipse_at_top_left,_rgba(79,70,229,0.12),_transparent_45%),radial-gradient(ellipse_at_top_right,_rgba(14,165,233,0.10),_transparent_45%)] text-slate-900 overflow-x-hidden">
        <header className="sticky top-0 z-30 border-b border-indigo-100/80 bg-white/90 backdrop-blur-md">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:gap-8 sm:px-6 sm:py-3.5">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                setStatusFilter('All');
                setSearchQuery('');
              }}
              className="font-display text-lg font-bold tracking-tight bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 bg-clip-text text-transparent whitespace-nowrap shrink-0"
            >
              TaskFlow
            </a>

            <nav
              aria-label="Workspace views"
              className="flex items-center gap-4 text-xs font-medium sm:gap-6 sm:text-sm"
            >
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`inline-flex min-h-[40px] items-center gap-1.5 border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 sm:min-h-0 ${
                  viewMode === 'list'
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <List className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="sm:hidden">List</span>
                <span className="hidden sm:inline">List View</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('board')}
                className={`inline-flex min-h-[40px] items-center gap-1.5 border-b-2 py-1 transition-colors whitespace-nowrap shrink-0 sm:min-h-0 ${
                  viewMode === 'board'
                    ? 'border-indigo-600 text-indigo-700'
                    : 'border-transparent text-slate-500 hover:text-slate-900'
                }`}
              >
                <Columns3 className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span className="sm:hidden">Board</span>
                <span className="hidden sm:inline">Board View</span>
              </button>
            </nav>

            <div className="flex items-center shrink-0">
              <button
                type="button"
                onClick={() =>
                  setModalState({
                    open: true,
                    mode: 'create',
                    task: null,
                    defaultStatus: statusFilter !== 'All' ? statusFilter : 'Planned',
                  })
                }
                className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-3 py-2 text-xs font-medium text-white shadow-sm shadow-indigo-600/20 transition-all hover:from-indigo-700 hover:to-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 whitespace-nowrap shrink-0 sm:min-h-0 sm:px-3.5"
              >
                <Plus className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span className="sm:hidden">New</span>
                <span className="hidden sm:inline">New Task</span>
              </button>
            </div>
          </div>
        </header>

        <main className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:space-y-6 sm:px-6 sm:py-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="font-display text-2xl font-bold tracking-tight text-slate-900 sm:text-[1.75rem]">
                My Tasks
              </h1>
              <p className="mt-1 text-sm text-slate-600">
                Create tasks, prioritize what matters, and track progress to completion.
              </p>
            </div>

            <div className="flex w-full items-center justify-between gap-3 rounded-xl border border-indigo-100 bg-white px-3.5 py-2 shadow-[0_2px_8px_rgba(79,70,229,0.05)] sm:w-auto sm:justify-start">
              <div className="flex min-w-0 items-center gap-3">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={userName}
                    referrerPolicy="no-referrer"
                    className="h-8 w-8 rounded-full object-cover ring-2 ring-indigo-100 shrink-0 sm:h-7 sm:w-7"
                  />
                ) : (
                  <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-indigo-600 to-cyan-500 text-xs font-semibold text-white shrink-0 sm:h-7 sm:w-7">
                    {userInitial}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="max-w-[180px] truncate text-xs font-medium text-slate-900 sm:max-w-[160px]">
                    {userName}
                  </p>
                  {user.email && (
                    <p className="max-w-[180px] truncate text-[11px] text-slate-500 sm:max-w-[160px]">
                      {user.email}
                    </p>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                title="Sign out"
                aria-label="Sign out"
                className="inline-flex min-h-[36px] items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-indigo-50 hover:text-indigo-700 focus-visible:outline-2 focus-visible:outline-indigo-600 whitespace-nowrap shrink-0 sm:min-h-[32px] sm:px-2 sm:py-1"
              >
                <LogOut className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                <span>Sign out</span>
              </button>
            </div>
          </div>

          <section
            aria-label="Task summary"
            className="overflow-hidden rounded-xl border border-indigo-100 bg-white shadow-[0_2px_10px_rgba(79,70,229,0.05)]"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4">
              <button
                type="button"
                onClick={() => {
                  setViewMode('list');
                  setStatusFilter('All');
                }}
                className={`border-b border-r border-slate-200/80 px-4 py-3.5 text-left transition-colors hover:bg-indigo-50/60 sm:border-b-0 sm:px-5 sm:py-4 ${
                  viewMode === 'list' && statusFilter === 'All'
                    ? 'bg-indigo-50/70'
                    : ''
                }`}
              >
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                  <Layers className="h-3.5 w-3.5 text-indigo-600 shrink-0" aria-hidden="true" />
                  <span>Total Tasks</span>
                </div>
                <p className="mt-1 font-mono text-xl font-semibold tabular-nums text-indigo-700 sm:text-2xl">
                  {counts.All}
                </p>
              </button>
              {TASK_STATUSES.map((status, index) => {
                const borderClasses =
                  index === 0
                    ? 'border-b border-slate-200/80 sm:border-b-0 sm:border-r'
                    : index === 1
                    ? 'border-r border-slate-200/80'
                    : '';
                const isSelected = viewMode === 'list' && statusFilter === status;
                return (
                  <button
                    key={status}
                    type="button"
                    onClick={() => {
                      setViewMode('list');
                      setStatusFilter(status);
                    }}
                    className={`px-4 py-3.5 text-left transition-colors sm:px-5 sm:py-4 ${borderClasses} ${getSummaryCardAccent(
                      status,
                      isSelected
                    )}`}
                  >
                    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-600">
                      <StatusIcon
                        status={status}
                        className={`h-3.5 w-3.5 shrink-0 ${getStatusIconColor(
                          status
                        )}`}
                      />
                      <span>{status}</span>
                    </div>
                    <p
                      className={`mt-1 font-mono text-xl font-semibold tabular-nums sm:text-2xl ${getSummaryCountColor(
                        status
                      )}`}
                    >
                      {counts[status]}
                    </p>
                  </button>
                );
              })}
            </div>

            {tasks.length > 0 && (
              <div
                aria-hidden="true"
                className="flex h-1.5 w-full bg-slate-100"
              >
                <div
                  style={{ width: `${progressPercentages.complete}%` }}
                  className="bg-emerald-500 transition-[width] duration-300"
                />
                <div
                  style={{ width: `${progressPercentages.inProgress}%` }}
                  className="bg-amber-500 transition-[width] duration-300"
                />
                <div
                  style={{ width: `${progressPercentages.planned}%` }}
                  className="bg-sky-400 transition-[width] duration-300"
                />
              </div>
            )}
          </section>

          <section
            aria-label="Quick create task"
            className="rounded-xl border border-indigo-100 bg-white p-3 shadow-[0_2px_10px_rgba(79,70,229,0.05)]"
          >
            <form
              onSubmit={handleQuickCreate}
              className="flex flex-col gap-2.5 lg:flex-row lg:items-center"
            >
              <div className="relative flex-1">
                <Plus
                  className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-500"
                  aria-hidden="true"
                />
                <input
                  type="text"
                  maxLength={140}
                  value={quickTitle}
                  onChange={(e) => setQuickTitle(e.target.value)}
                  placeholder={
                    statusFilter !== 'All'
                      ? `Quick add a task to ${statusFilter}...`
                      : 'Quick add a task title and press Enter...'
                  }
                  aria-label="Quick add task title"
                  className="min-h-[44px] w-full rounded-lg border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-3.5 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-600/15 sm:min-h-0 sm:text-sm"
                />
              </div>

              <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
                <PriorityControl
                  value={quickPriority}
                  onChange={setQuickPriority}
                  disabled={quickCreating}
                  fullWidthOnMobile
                />
                <button
                  type="submit"
                  disabled={!quickTitle.trim() || quickCreating}
                  className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm shadow-indigo-600/20 transition-all hover:from-indigo-700 hover:to-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:cursor-not-allowed disabled:opacity-50 whitespace-nowrap shrink-0 sm:min-h-0 sm:py-2"
                >
                  <Plus className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>{quickCreating ? 'Adding...' : 'Add task'}</span>
                </button>
              </div>
            </form>
          </section>

          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            {viewMode === 'list' ? (
              <div
                role="tablist"
                aria-label="Filter tasks by status"
                className="no-scrollbar flex w-full items-center gap-1 overflow-x-auto rounded-lg border border-indigo-100 bg-white/80 p-1 shadow-2xs md:inline-flex md:w-auto"
              >
                {FILTER_OPTIONS.map((option) => {
                  const isActive = statusFilter === option;
                  return (
                    <button
                      key={option}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setStatusFilter(option)}
                      className={`inline-flex min-h-[36px] flex-1 items-center justify-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 md:min-h-0 md:flex-initial md:px-3 ${
                        isActive
                          ? 'bg-indigo-600 text-white shadow-2xs'
                          : 'text-slate-600 hover:bg-indigo-50/70 hover:text-indigo-700'
                      }`}
                    >
                      <span>{option}</span>
                      <span
                        className={`font-mono text-[11px] tabular-nums ${
                          isActive ? 'text-indigo-100' : 'text-slate-400'
                        }`}
                      >
                        {counts[option]}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs font-medium text-slate-600">
                Showing all three workflow stages
              </p>
            )}

            <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
              <button
                type="button"
                onClick={() =>
                  setSortMode((prev) =>
                    prev === 'recent' ? 'priority' : 'recent'
                  )
                }
                className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-lg border border-indigo-100 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition-colors hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-800 focus-visible:outline-2 focus-visible:outline-indigo-600 whitespace-nowrap shrink-0 sm:min-h-[38px]"
              >
                <ArrowUpDown className="h-3.5 w-3.5 text-indigo-500 shrink-0" aria-hidden="true" />
                <span>
                  {sortMode === 'recent' ? 'Sort: Recent' : 'Sort: Priority'}
                </span>
              </button>

              <div className="relative w-full sm:w-64">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-indigo-400"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tasks..."
                  aria-label="Search tasks"
                  className="min-h-[44px] w-full rounded-lg border border-indigo-100 bg-white py-2 pl-9 pr-9 text-base text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:outline-none focus:ring-2 focus:ring-indigo-600/15 sm:min-h-[38px] sm:text-sm"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    aria-label="Clear search"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1.5 text-slate-400 hover:text-slate-700"
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {tasksError && (
            <div
              role="alert"
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
            >
              <span>{tasksError}</span>
              <button
                type="button"
                onClick={() => void loadTasks()}
                className="rounded-md border border-rose-300 bg-white px-3 py-1.5 text-xs font-medium text-rose-800 hover:bg-rose-100 whitespace-nowrap"
              >
                Retry
              </button>
            </div>
          )}

          {loadingTasks ? (
            <div
              aria-label="Loading tasks"
              className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-indigo-100 bg-white"
            >
              {[1, 2, 3, 4].map((row) => (
                <div
                  key={row}
                  className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:px-5"
                >
                  <div className="h-4 w-2/3 animate-pulse rounded bg-indigo-100/70 sm:w-1/3" />
                  <div className="h-8 w-full animate-pulse rounded-lg bg-slate-100 sm:h-7 sm:w-56" />
                </div>
              ))}
            </div>
          ) : tasks.length === 0 ? (
            <div className="rounded-xl border border-indigo-100 bg-white px-6 py-12 text-center shadow-[0_2px_10px_rgba(79,70,229,0.04)] sm:py-16">
              <h2 className="font-display text-lg font-semibold text-slate-900">
                Your workspace is ready
              </h2>
              <p className="mx-auto mt-1.5 max-w-sm text-sm leading-relaxed text-slate-600">
                Add your first task using the quick-add composer above or open the task form to add notes and priority.
              </p>
              <button
                type="button"
                onClick={() =>
                  setModalState({
                    open: true,
                    mode: 'create',
                    task: null,
                    defaultStatus: 'Planned',
                  })
                }
                className="mt-5 inline-flex min-h-[44px] items-center gap-1.5 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-2.5 text-sm font-medium text-white shadow-sm shadow-indigo-600/20 transition-all hover:from-indigo-700 hover:to-blue-700 whitespace-nowrap sm:min-h-0"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                <span>Create first task</span>
              </button>
            </div>
          ) : filteredTasks.length === 0 ? (
            <div className="rounded-xl border border-indigo-100 bg-white px-6 py-12 text-center">
              <h2 className="font-display text-base font-semibold text-slate-900">
                No matching tasks
              </h2>
              <p className="mt-1.5 text-sm text-slate-600">
                Try clearing your search query or switching to a different status filter.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('All');
                }}
                className="mt-4 min-h-[44px] rounded-lg border border-indigo-200 bg-indigo-50/50 px-4 py-2 text-sm font-medium text-indigo-700 hover:bg-indigo-100/60 whitespace-nowrap sm:min-h-0"
              >
                Reset filters
              </button>
            </div>
          ) : viewMode === 'list' ? (
            <TaskListView
              tasks={filteredTasks}
              updatingTaskIds={updatingTaskIds}
              onStatusChange={(taskId, nextStatus) =>
                void handleStatusChange(taskId, nextStatus)
              }
              onEdit={(task) =>
                setModalState({
                  open: true,
                  mode: 'edit',
                  task,
                  defaultStatus: task.status,
                })
              }
              onDelete={(task) => setTaskToDelete(task)}
            />
          ) : (
            <TaskBoardView
              tasks={filteredTasks}
              updatingTaskIds={updatingTaskIds}
              onStatusChange={(taskId, nextStatus) =>
                void handleStatusChange(taskId, nextStatus)
              }
              onEdit={(task) =>
                setModalState({
                  open: true,
                  mode: 'edit',
                  task,
                  defaultStatus: task.status,
                })
              }
              onDelete={(task) => setTaskToDelete(task)}
              onQuickCreateInColumn={(status) =>
                setModalState({
                  open: true,
                  mode: 'create',
                  task: null,
                  defaultStatus: status,
                })
              }
            />
          )}
        </main>

        <TaskFormModal
          open={modalState.open}
          mode={modalState.mode}
          initialTask={modalState.task}
          defaultStatus={modalState.defaultStatus}
          submitting={modalSubmitting}
          onClose={() => {
            if (!modalSubmitting) {
              setModalState((prev) => ({ ...prev, open: false, task: null }));
            }
          }}
          onSubmit={handleModalSubmit}
        />

        <ConfirmDialog
          open={Boolean(taskToDelete)}
          title="Delete task?"
          description={
            taskToDelete
              ? `Are you sure you want to permanently delete "${taskToDelete.title}"? This action cannot be undone.`
              : ''
          }
          confirmLabel="Delete task"
          busy={deletingTask}
          onCancel={() => {
            if (!deletingTask) {
              setTaskToDelete(null);
            }
          }}
          onConfirm={() => void handleConfirmDelete()}
        />

        {feedbackMessage && (
          <div
            role="status"
            aria-live="polite"
            className="fixed inset-x-4 bottom-4 z-40 flex items-center justify-center gap-2 rounded-lg bg-gradient-to-r from-indigo-700 to-blue-700 px-4 py-3 text-xs font-medium text-white shadow-lg shadow-indigo-900/20 sm:inset-x-auto sm:bottom-5 sm:right-5 sm:justify-start sm:py-2.5"
          >
            <CheckCircle2 className="h-4 w-4 text-emerald-300 shrink-0" aria-hidden="true" />
            <span className="truncate">{feedbackMessage}</span>
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
