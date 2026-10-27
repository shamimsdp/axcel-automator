import React, { useState, useEffect } from 'react';
import {
  CalendarClock,
  Clock,
  Zap,
  X,
  Play,
  CheckCircle2,
  AlertCircle,
  Film,
  Moon,
  ChevronRight,
  ListOrdered,
  Layers,
} from 'lucide-react';
import { ScheduledBatch } from '../types';

interface ScheduledBatchHubProps {
  scheduledBatches: ScheduledBatch[];
  onRunNow: (id: string) => void;
  onCancel: (id: string) => void;
  onOpenScheduler: () => void;
}

export const ScheduledBatchHub: React.FC<ScheduledBatchHubProps> = ({
  scheduledBatches,
  onRunNow,
  onCancel,
  onOpenScheduler,
}) => {
  const [now, setNow] = useState<number>(Date.now());

  // Ticking 1-second timer for live countdown
  useEffect(() => {
    const timer = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const activeScheduled = scheduledBatches.find(b => b.status === 'scheduled');
  const allBatches = scheduledBatches;

  if (allBatches.length === 0) return null;

  // Format countdown string
  const formatCountdown = (targetMs: number): string => {
    const diff = Math.max(0, targetMs - now);
    if (diff === 0) return 'Triggering now...';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);

    const pad = (n: number) => String(n).padStart(2, '0');
    return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
  };

  return (
    <div className="space-y-4">
      {/* Active Scheduled Countdown Card */}
      {activeScheduled && (
        <div className="relative overflow-hidden rounded-2xl border border-indigo-500/40 bg-gradient-to-r from-indigo-950/40 via-zinc-900 to-indigo-950/30 p-5 shadow-xl shadow-indigo-950/20 animate-in fade-in">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <span className="flex h-2.5 w-2.5 rounded-full bg-indigo-400 animate-ping" />
                <span className="rounded-full bg-indigo-500/20 border border-indigo-500/30 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-indigo-300">
                  Off-Peak Scheduled Batch
                </span>
                <span className="text-xs text-zinc-400 font-medium">
                  {activeScheduled.offPeakLabel}
                </span>
              </div>

              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>{activeScheduled.name}</span>
                <span className="text-xs font-normal text-zinc-400">
                  ({activeScheduled.prompts.length} videos)
                </span>
              </h3>

              <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-400 flex-wrap">
                <span>Model: <b className="text-indigo-300">Seedance 2.5</b></span>
                <span>•</span>
                <span>Audio: <b className="text-emerald-400">ON</b></span>
                <span>•</span>
                <span>Scheduled for: <b className="text-white">{new Date(activeScheduled.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</b></span>
              </div>
            </div>

            {/* Countdown Clock Display & Actions */}
            <div className="flex flex-col items-start sm:items-end gap-2.5 shrink-0">
              <div className="rounded-xl border border-indigo-500/30 bg-zinc-950/80 px-4 py-2 text-right">
                <p className="text-[10px] uppercase font-semibold text-zinc-400">
                  Countdown to Launch
                </p>
                <p className="font-mono text-xl font-bold tracking-tight text-indigo-400">
                  {formatCountdown(activeScheduled.scheduledFor)}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => onRunNow(activeScheduled.id)}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500 active:scale-95 transition"
                  title="Bypass countdown and start generating now"
                >
                  <Zap className="h-3.5 w-3.5" />
                  <span>Run Now</span>
                </button>
                <button
                  onClick={() => onCancel(activeScheduled.id)}
                  className="rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1.5 text-xs text-zinc-400 hover:bg-zinc-800 hover:text-red-400 transition"
                  title="Cancel this scheduled batch"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Queued Off-Peak Tasks List (if multiple batches queued) */}
      {allBatches.length > 1 && (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <ListOrdered className="h-3.5 w-3.5 text-indigo-400" />
              <span>Queued Off-Peak Pipeline ({allBatches.length} Tasks)</span>
            </span>
            <button
              onClick={onOpenScheduler}
              className="text-xs text-indigo-400 hover:text-indigo-300 font-medium"
            >
              + Queue Another Batch
            </button>
          </div>

          <div className="space-y-2">
            {allBatches.map(b => (
              <div
                key={b.id}
                className="flex items-center justify-between rounded-xl border border-zinc-800/80 bg-zinc-950/50 p-2.5 text-xs"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Clock className="h-4 w-4 text-zinc-500 shrink-0" />
                  <div className="min-w-0">
                    <p className="font-semibold text-zinc-200 truncate">{b.name}</p>
                    <p className="text-[10px] text-zinc-400 font-mono">
                      {b.offPeakLabel} • {new Date(b.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {b.prompts.length} videos
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase ${
                      b.status === 'scheduled'
                        ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/30'
                        : b.status === 'running'
                        ? 'bg-blue-500/15 text-blue-400 border border-blue-500/30'
                        : b.status === 'completed'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : 'bg-zinc-800 text-zinc-400'
                    }`}
                  >
                    {b.status}
                  </span>

                  {b.status === 'scheduled' && (
                    <>
                      <button
                        onClick={() => onRunNow(b.id)}
                        className="rounded p-1 text-zinc-400 hover:text-white"
                        title="Run Now"
                      >
                        <Zap className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => onCancel(b.id)}
                        className="rounded p-1 text-zinc-400 hover:text-red-400"
                        title="Cancel"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
