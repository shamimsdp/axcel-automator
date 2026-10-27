import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Clock,
  Hourglass,
  Gauge,
  CheckCircle,
  AlertTriangle,
  RotateCw,
  Zap,
  Activity,
  Layers,
} from 'lucide-react';
import { QueueJob } from '../types';
import { calculateBatchMetrics, BatchMetrics } from '../utils/metrics';

interface SimulatorDashboardProps {
  jobs: QueueJob[];
  maxConcurrency: number;
  isRunning: boolean;
  isPaused: boolean;
  batchStartTime?: number;
}

export const SimulatorDashboard: React.FC<SimulatorDashboardProps> = ({
  jobs,
  maxConcurrency,
  isRunning,
  isPaused,
  batchStartTime,
}) => {
  // Trigger a re-render tick every 500ms while running so elapsed time & countdown update smoothly
  const [, setTick] = useState<number>(0);

  useEffect(() => {
    if (!isRunning || isPaused) return;
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 500);
    return () => clearInterval(interval);
  }, [isRunning, isPaused]);

  const metrics: BatchMetrics = calculateBatchMetrics(jobs, maxConcurrency, batchStartTime);

  const completedPct = metrics.totalJobs > 0 ? (metrics.completedCount / metrics.totalJobs) * 100 : 0;
  const runningPct = metrics.totalJobs > 0 ? (metrics.runningCount / metrics.totalJobs) * 100 : 0;
  const retryingPct = metrics.totalJobs > 0 ? (metrics.retryingCount / metrics.totalJobs) * 100 : 0;
  const pendingPct = metrics.totalJobs > 0 ? (metrics.pendingCount / metrics.totalJobs) * 100 : 0;
  const failedPct = metrics.totalJobs > 0 ? (metrics.failedCount / metrics.totalJobs) * 100 : 0;

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-5 shadow-xl backdrop-blur-sm">
      {/* Dashboard Header */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Gauge className="h-4 w-4 text-cyan-400" />
            <h3 className="text-sm font-bold tracking-tight text-white uppercase">
              Real-Time Batch Processing Analytics
            </h3>
            {isRunning && (
              <span className="flex items-center gap-1.5 rounded-full border border-cyan-500/30 bg-cyan-500/10 px-2 py-0.5 text-[10px] font-semibold text-cyan-300">
                <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping" />
                Live Telemetry
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">
            Performance metrics across dual-worker pipeline with {maxConcurrency} concurrent video slots.
          </p>
        </div>

        {/* Elapsed Timer Badge */}
        <div className="flex items-center gap-2 self-start rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-1.5 font-mono text-xs text-zinc-300 sm:self-auto">
          <Clock className="h-3.5 w-3.5 text-zinc-400" />
          <span>Elapsed:</span>
          <b className="text-white">{metrics.formattedElapsedTime}</b>
        </div>
      </div>

      {/* 4 Primary Statistics Cards */}
      <div className="mt-4 grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        {/* Metric 1: Success Rate */}
        <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition hover:border-zinc-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Success Rate</span>
            <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${
              metrics.failedCount > 0 ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
            }`}>
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-white">
              {metrics.successRatePercent}%
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">
              ({metrics.completedCount} ok / {metrics.failedCount} fail)
            </span>
          </div>

          {/* Progress bar */}
          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className={`h-full transition-all duration-500 ${
                metrics.failedCount > 0 ? 'bg-amber-500' : 'bg-emerald-500'
              }`}
              style={{ width: `${metrics.successRatePercent}%` }}
            />
          </div>

          <div className="mt-2 text-[10px] text-zinc-500 flex items-center gap-1">
            <CheckCircle className="h-3 w-3 text-emerald-400" />
            <span>Auto-retry recoveries enabled</span>
          </div>
        </div>

        {/* Metric 2: Average Generation Time */}
        <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition hover:border-zinc-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Avg Generation Time</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <Zap className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-white">
              {metrics.formattedAvgTime}
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">
              / video
            </span>
          </div>

          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full bg-blue-500 transition-all duration-500" style={{ width: metrics.averageGenerationTimeMs > 0 ? '100%' : '0%' }} />
          </div>

          <div className="mt-2 text-[10px] text-zinc-500 flex items-center gap-1">
            <Clock className="h-3 w-3 text-blue-400" />
            <span>Based on {metrics.completedCount} completed renders</span>
          </div>
        </div>

        {/* Metric 3: Estimated Time Remaining */}
        <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition hover:border-zinc-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Estimated Remaining</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
              <Hourglass className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-white">
              {metrics.formattedRemainingTime}
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">
              ({metrics.pendingCount + metrics.runningCount + metrics.retryingCount} left)
            </span>
          </div>

          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-purple-500 transition-all duration-500"
              style={{
                width: `${metrics.totalJobs > 0 ? Math.round(((metrics.totalJobs - (metrics.pendingCount + metrics.runningCount)) / metrics.totalJobs) * 100) : 0}%`,
              }}
            />
          </div>

          <div className="mt-2 text-[10px] text-zinc-500 flex items-center gap-1">
            <Layers className="h-3 w-3 text-purple-400" />
            <span>Calculated across 2 worker slots</span>
          </div>
        </div>

        {/* Metric 4: Throughput & Retry Frequency */}
        <div className="relative overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-4 transition hover:border-zinc-700">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400">Queue Throughput</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-400">
              <Activity className="h-4 w-4" />
            </div>
          </div>

          <div className="mt-2 flex items-baseline gap-2">
            <span className="font-mono text-2xl font-bold tracking-tight text-white">
              {metrics.throughputVpm}
            </span>
            <span className="text-[11px] text-zinc-500 font-mono">
              videos / min
            </span>
          </div>

          <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
            <div className="h-full bg-indigo-500 transition-all duration-500" style={{ width: metrics.throughputVpm > 0 ? '75%' : '0%' }} />
          </div>

          <div className="mt-2 text-[10px] text-zinc-500 flex items-center gap-1">
            <RotateCw className="h-3 w-3 text-indigo-400" />
            <span>Total attempts made: {metrics.totalAttempts}</span>
          </div>
        </div>
      </div>

      {/* Multi-Segment Queue Pipeline Bar */}
      <div className="mt-5 rounded-xl border border-zinc-800 bg-zinc-950 p-3.5">
        <div className="flex items-center justify-between text-xs text-zinc-400 mb-2">
          <span className="font-semibold text-zinc-300">Pipeline Distribution:</span>
          <span className="font-mono text-[11px] text-zinc-400">
            {metrics.completedCount} done • {metrics.runningCount} active • {metrics.retryingCount} retrying • {metrics.pendingCount} queued • {metrics.failedCount} failed
          </span>
        </div>

        {/* Multi-Color Progress Line */}
        <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
          <div
            title={`Completed: ${metrics.completedCount}`}
            className="bg-emerald-500 transition-all duration-300"
            style={{ width: `${completedPct}%` }}
          />
          <div
            title={`Running: ${metrics.runningCount}`}
            className="bg-blue-500 transition-all duration-300"
            style={{ width: `${runningPct}%` }}
          />
          <div
            title={`Retrying: ${metrics.retryingCount}`}
            className="bg-amber-500 transition-all duration-300"
            style={{ width: `${retryingPct}%` }}
          />
          <div
            title={`Failed: ${metrics.failedCount}`}
            className="bg-red-500 transition-all duration-300"
            style={{ width: `${failedPct}%` }}
          />
          <div
            title={`Pending: ${metrics.pendingCount}`}
            className="bg-zinc-700 transition-all duration-300"
            style={{ width: `${pendingPct}%` }}
          />
        </div>

        {/* Legend */}
        <div className="mt-2.5 flex flex-wrap items-center gap-3 text-[11px] text-zinc-400">
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            <span>Completed ({metrics.completedCount})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            <span>Running ({metrics.runningCount})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            <span>Retrying ({metrics.retryingCount})</span>
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-zinc-700" />
            <span>Pending ({metrics.pendingCount})</span>
          </span>
          {metrics.failedCount > 0 && (
            <span className="flex items-center gap-1.5 text-red-400">
              <span className="h-2 w-2 rounded-full bg-red-500" />
              <span>Failed ({metrics.failedCount})</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
