import { QueueJob } from '../types';

export interface BatchMetrics {
  totalJobs: number;
  completedCount: number;
  failedCount: number;
  runningCount: number;
  pendingCount: number;
  retryingCount: number;
  successRatePercent: number; // 0 - 100
  averageGenerationTimeMs: number;
  formattedAvgTime: string;
  estimatedRemainingTimeMs: number;
  formattedRemainingTime: string;
  batchElapsedTimeMs: number;
  formattedElapsedTime: string;
  throughputVpm: number; // videos per minute
  totalAttempts: number;
  retryRatePercent: number;
}

/**
 * Calculates real-time statistics for batch processing.
 */
export function calculateBatchMetrics(
  jobs: QueueJob[],
  maxConcurrency: number = 2,
  batchStartTime?: number
): BatchMetrics {
  const totalJobs = jobs.length;
  const completedJobs = jobs.filter(j => j.status === 'completed');
  const failedJobs = jobs.filter(j => j.status === 'failed');
  const runningJobs = jobs.filter(j => j.status === 'running');
  const pendingJobs = jobs.filter(j => j.status === 'pending');
  const retryingJobs = jobs.filter(j => j.status === 'retrying');

  const completedCount = completedJobs.length;
  const failedCount = failedJobs.length;
  const runningCount = runningJobs.length;
  const pendingCount = pendingJobs.length;
  const retryingCount = retryingJobs.length;

  // 1. Success Rate
  // If jobs have finished (completed or failed), success rate is completed / (completed + failed).
  // If no jobs have finished yet, default to 100% (or 0% if total is 0).
  const finishedCount = completedCount + failedCount;
  let successRatePercent = 100;
  if (finishedCount > 0) {
    successRatePercent = Math.round((completedCount / finishedCount) * 100);
  } else if (totalJobs === 0) {
    successRatePercent = 0;
  }

  // 2. Average Generation Time per Video (based on completed jobs)
  const durations = completedJobs
    .filter(j => j.startedAt && j.completedAt && j.completedAt >= j.startedAt)
    .map(j => j.completedAt! - j.startedAt!);

  const averageGenerationTimeMs =
    durations.length > 0
      ? Math.round(durations.reduce((sum, d) => sum + d, 0) / durations.length)
      : 0;

  // 3. Batch Elapsed Time
  const now = Date.now();
  let batchElapsedTimeMs = 0;
  if (batchStartTime) {
    batchElapsedTimeMs = Math.max(0, now - batchStartTime);
  } else {
    // Infer from earliest started job
    const startedTimes = jobs.filter(j => j.startedAt).map(j => j.startedAt!);
    if (startedTimes.length > 0) {
      batchElapsedTimeMs = Math.max(0, now - Math.min(...startedTimes));
    }
  }

  // 4. Total Remaining Time Estimation
  // Remaining work = pending + retrying + fractional running
  // Default assumed time if no completed jobs yet: 4000ms per video
  const assumedTimePerVideo = averageGenerationTimeMs > 0 ? averageGenerationTimeMs : 4000;
  const concurrency = Math.max(1, maxConcurrency);

  let remainingUnitsOfWork = pendingCount + retryingCount;
  for (const rj of runningJobs) {
    const fractionLeft = Math.max(0, (100 - rj.progress) / 100);
    remainingUnitsOfWork += fractionLeft;
  }

  const estimatedRemainingTimeMs =
    remainingUnitsOfWork > 0
      ? Math.round((remainingUnitsOfWork / concurrency) * assumedTimePerVideo)
      : 0;

  // 5. Throughput (Videos / Minute)
  let throughputVpm = 0;
  if (completedCount > 0 && batchElapsedTimeMs > 1000) {
    throughputVpm = parseFloat(((completedCount / (batchElapsedTimeMs / 1000)) * 60).toFixed(1));
  }

  // 6. Retry Frequency
  const totalAttempts = jobs.reduce((sum, j) => sum + (j.attemptCount || 0), 0);
  const extraRetries = Math.max(0, totalAttempts - (completedCount + runningCount + failedCount));
  const retryRatePercent =
    totalJobs > 0 && totalAttempts > 0
      ? Math.min(100, Math.round((extraRetries / totalAttempts) * 100))
      : 0;

  return {
    totalJobs,
    completedCount,
    failedCount,
    runningCount,
    pendingCount,
    retryingCount,
    successRatePercent,
    averageGenerationTimeMs,
    formattedAvgTime: formatDuration(averageGenerationTimeMs),
    estimatedRemainingTimeMs,
    formattedRemainingTime: formatDuration(estimatedRemainingTimeMs),
    batchElapsedTimeMs,
    formattedElapsedTime: formatDuration(batchElapsedTimeMs),
    throughputVpm,
    totalAttempts,
    retryRatePercent,
  };
}

/**
 * Formats milliseconds into human-readable duration strings.
 * e.g., 3450ms -> "3.5s", 72000ms -> "1m 12s", 0 -> "0s"
 */
export function formatDuration(ms: number): string {
  if (!ms || ms <= 0) return '0s';

  const totalSeconds = ms / 1000;
  if (totalSeconds < 1) {
    return `${Math.round(ms)}ms`;
  }

  if (totalSeconds < 60) {
    return `${totalSeconds.toFixed(1)}s`;
  }

  const minutes = Math.floor(totalSeconds / 60);
  const remainingSeconds = Math.round(totalSeconds % 60);

  if (minutes < 60) {
    return `${minutes}m ${remainingSeconds}s`;
  }

  const hours = Math.floor(minutes / 60);
  const remMinutes = minutes % 60;
  return `${hours}h ${remMinutes}m`;
}
