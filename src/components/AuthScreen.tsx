import { ArrowUp, CheckCircle2, CircleDashed, Clock, ShieldCheck } from 'lucide-react';
import { GoogleSignInButton } from './GoogleSignInButton.tsx';

interface AuthScreenProps {
  onSignIn: () => void;
  loading: boolean;
  error: string | null;
}

export function AuthScreen({ onSignIn, loading, error }: AuthScreenProps) {
  return (
    <div className="min-h-screen bg-[#F4F6FF] bg-[radial-gradient(ellipse_at_top_left,_rgba(79,70,229,0.14),_transparent_48%),radial-gradient(ellipse_at_top_right,_rgba(14,165,233,0.12),_transparent_48%)] text-slate-900 flex flex-col">
      <header className="border-b border-indigo-100/80 bg-white/85 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3.5 sm:gap-8 sm:px-6 sm:py-4">
          <span className="font-display text-lg font-bold tracking-tight bg-gradient-to-r from-indigo-600 via-blue-600 to-cyan-500 bg-clip-text text-transparent whitespace-nowrap shrink-0">
            TaskFlow
          </span>
          <span className="text-xs font-medium text-slate-500 whitespace-nowrap shrink-0 sm:text-sm">
            Personal Task Workspace
          </span>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-6xl flex-1 items-center px-4 py-8 sm:px-6 sm:py-12 lg:py-16">
        <div className="grid w-full grid-cols-1 items-center gap-8 sm:gap-12 lg:grid-cols-12 lg:gap-14">
          <div className="lg:col-span-7 space-y-7">
            <div className="space-y-3.5">
              <p className="text-xs font-semibold tracking-wide text-indigo-600">
                Simple workflow · Instant SQLite sync
              </p>
              <h1 className="font-display text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl lg:text-[2.75rem] text-balance leading-[1.12]">
                Keep every task moving from{' '}
                <span className="bg-gradient-to-r from-indigo-600 to-cyan-600 bg-clip-text text-transparent">
                  planned to complete.
                </span>
              </h1>
              <p className="max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
                A vibrant, focused workspace for daily execution. Sign in with Google to organize tasks by priority and move work effortlessly across three clear stages.
              </p>
            </div>

            <div className="overflow-hidden rounded-xl border border-indigo-100 bg-white shadow-[0_6px_24px_rgba(79,70,229,0.06)]">
              <div className="flex items-center justify-between border-b border-slate-100 bg-gradient-to-r from-indigo-50/70 via-sky-50/50 to-emerald-50/60 px-4 py-2.5 text-xs text-slate-600">
                <span className="font-medium text-slate-800">Workflow preview</span>
                <span className="font-mono tabular-nums text-indigo-700">3 stages</span>
              </div>
              <div className="divide-y divide-slate-100">
                <div className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      Finalize API schema and database indexes
                    </p>
                    <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                      <span className="inline-flex items-center gap-1 font-medium text-rose-600">
                        <ArrowUp className="h-3 w-3" aria-hidden="true" />
                        High
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">Today</span>
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-300 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-900 whitespace-nowrap shrink-0">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                    Complete
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      Review responsive layout across mobile &amp; desktop
                    </p>
                    <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-medium text-amber-600">Medium</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">Active now</span>
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-300 bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-900 whitespace-nowrap shrink-0">
                    <Clock className="h-3.5 w-3.5 text-amber-600" aria-hidden="true" />
                    In Progress
                  </span>
                </div>

                <div className="flex items-center justify-between gap-4 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-slate-900">
                      Prepare deployment checklist and user guide
                    </p>
                    <p className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                      <span className="font-medium text-cyan-700">Low</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">Up next</span>
                    </p>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-md border border-sky-300 bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-900 whitespace-nowrap shrink-0">
                    <CircleDashed className="h-3.5 w-3.5 text-sky-600" aria-hidden="true" />
                    Planned
                  </span>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-[0_12px_36px_rgba(79,70,229,0.09)] sm:p-8">
              <div className="space-y-2">
                <h2 className="font-display text-xl font-semibold tracking-tight text-slate-900">
                  Sign in to your workspace
                </h2>
                <p className="text-sm leading-relaxed text-slate-600">
                  Continue with your Google account to view, create, and manage your personal task list.
                </p>
              </div>

              <div className="mt-6">
                <GoogleSignInButton onClick={onSignIn} loading={loading} />
              </div>

              {error && (
                <div
                  role="alert"
                  className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
                >
                  {error}
                </div>
              )}

              <div className="mt-6 flex items-start gap-2.5 border-t border-slate-100 pt-5 text-xs leading-relaxed text-slate-500">
                <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-indigo-600" aria-hidden="true" />
                <p>
                  Each account gets a private workspace persisted in SQLite. Allow popups if your browser prompts during Google sign-in.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
