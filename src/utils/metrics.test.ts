import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateBatchMetrics, formatDuration } from './metrics';
import { QueueJob, PromptItem } from '../types';

function createMockJob(
  id: string,
  status: QueueJob['status'],
  opts: { startedAt?: number; completedAt?: number; progress?: number; attemptCount?: number } = {}
): QueueJob {
  const promptItem: PromptItem = {
    id: `p-${id}`,
    index: 1,
    title: `Scene ${id}`,
    prompt: `Prompt ${id}`,
    duration: '5s',
    resolution: '720p',
    aspectRatio: '16:9',
    generateAudio: false,
    charCount: 20,
  };

  return {
    id,
    promptItem,
    status,
    progress: opts.progress ?? (status === 'completed' ? 100 : 0),
    attemptCount: opts.attemptCount ?? 1,
    maxRetries: 3,
    startedAt: opts.startedAt,
    completedAt: opts.completedAt,
    downloadStatus: 'idle',
  };
}

test('formatDuration formats milliseconds into human-readable strings', () => {
  assert.equal(formatDuration(0), '0s');
  assert.equal(formatDuration(450), '450ms');
  assert.equal(formatDuration(4200), '4.2s');
  assert.equal(formatDuration(65000), '1m 5s');
  assert.equal(formatDuration(3660000), '1h 1m');
});

test('calculateBatchMetrics computes accurate success rate', () => {
  // 3 completed, 1 failed = 75% success rate
  const jobs: QueueJob[] = [
    createMockJob('1', 'completed', { startedAt: 1000, completedAt: 4000 }),
    createMockJob('2', 'completed', { startedAt: 1000, completedAt: 5000 }),
    createMockJob('3', 'completed', { startedAt: 1000, completedAt: 6000 }),
    createMockJob('4', 'failed', { attemptCount: 3 }),
  ];

  const metrics = calculateBatchMetrics(jobs, 2);
  assert.equal(metrics.totalJobs, 4);
  assert.equal(metrics.completedCount, 3);
  assert.equal(metrics.failedCount, 1);
  assert.equal(metrics.successRatePercent, 75);
});

test('calculateBatchMetrics computes average generation time correctly', () => {
  // Job 1 took 3000ms (4000 - 1000)
  // Job 2 took 5000ms (6000 - 1000)
  // Average = 4000ms -> "4.0s"
  const jobs: QueueJob[] = [
    createMockJob('1', 'completed', { startedAt: 1000, completedAt: 4000 }),
    createMockJob('2', 'completed', { startedAt: 1000, completedAt: 6000 }),
    createMockJob('3', 'pending'),
  ];

  const metrics = calculateBatchMetrics(jobs, 2);
  assert.equal(metrics.averageGenerationTimeMs, 4000);
  assert.equal(metrics.formattedAvgTime, '4.0s');
});

test('calculateBatchMetrics estimates remaining time based on concurrency', () => {
  // Avg time is 4000ms. Concurrency is 2.
  // 4 pending jobs remaining -> 4 / 2 * 4000ms = 8000ms ("8.0s")
  const jobs: QueueJob[] = [
    createMockJob('1', 'completed', { startedAt: 1000, completedAt: 5000 }),
    createMockJob('2', 'pending'),
    createMockJob('3', 'pending'),
    createMockJob('4', 'pending'),
    createMockJob('5', 'pending'),
  ];

  const metrics = calculateBatchMetrics(jobs, 2);
  assert.equal(metrics.estimatedRemainingTimeMs, 8000);
  assert.equal(metrics.formattedRemainingTime, '8.0s');
});

test('calculateBatchMetrics handles empty or initial state gracefully', () => {
  const metrics = calculateBatchMetrics([], 2);
  assert.equal(metrics.totalJobs, 0);
  assert.equal(metrics.successRatePercent, 0);
  assert.equal(metrics.averageGenerationTimeMs, 0);
  assert.equal(metrics.estimatedRemainingTimeMs, 0);
  assert.equal(metrics.formattedAvgTime, '0s');
  assert.equal(metrics.formattedRemainingTime, '0s');
});
