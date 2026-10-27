import test from 'node:test';
import assert from 'node:assert/strict';
import { VideoQueueEngine } from './queueEngine';
import { PromptItem } from '../types';

function createMockPrompt(index: number, title: string, promptText: string): PromptItem {
  return {
    id: `test-prompt-${index}`,
    index,
    title,
    prompt: promptText,
    duration: '5s',
    resolution: '720p',
    aspectRatio: '16:9',
    generateAudio: false,
    charCount: promptText.length,
  };
}

test('VideoQueueEngine caps batches at configured maxBatchSize', () => {
  const engine = new VideoQueueEngine({ maxBatchSize: 10, maxConcurrency: 2 });
  const prompts: PromptItem[] = [];
  for (let i = 1; i <= 15; i++) {
    prompts.push(createMockPrompt(i, `Video ${i}`, `Prompt content for video ${i}`));
  }

  engine.loadPrompts(prompts);
  const state = engine.getState();
  assert.equal(state.jobs.length, 10);
});

test('VideoQueueEngine limits active concurrent jobs to maxConcurrency', () => {
  const engine = new VideoQueueEngine({ maxConcurrency: 2, maxBatchSize: 10 });
  const prompts = [
    createMockPrompt(1, 'Scene 1', 'Prompt 1'),
    createMockPrompt(2, 'Scene 2', 'Prompt 2'),
    createMockPrompt(3, 'Scene 3', 'Prompt 3'),
    createMockPrompt(4, 'Scene 4', 'Prompt 4'),
  ];

  engine.loadPrompts(prompts);
  engine.start();

  const state = engine.getState();
  // Immediately after start, exactly 2 should be running and 2 pending
  const runningJobs = state.jobs.filter(j => j.status === 'running');
  assert.equal(runningJobs.length, 2);
  assert.equal(state.activeCount, 2);

  engine.stop();
});

test('VideoQueueEngine retries failed jobs up to maxRetries', () => {
  const engine = new VideoQueueEngine({ maxConcurrency: 2, maxRetries: 2, retryDelayMs: 50 });
  const prompts = [createMockPrompt(1, 'Scene 1', 'Prompt 1')];

  engine.loadPrompts(prompts);
  const job = engine.getState().jobs[0];

  // First failure (attempt 1)
  engine.handleJobFailure(job.id, 'Network timeout');
  let state = engine.getState();
  assert.equal(state.jobs[0].status, 'retrying');
  assert.equal(state.jobs[0].attemptCount, 1);

  // Second failure (attempt 2 reaches maxRetries = 2)
  const retryingJob = engine.getState().jobs[0];
  retryingJob.attemptCount = 2;
  engine.handleJobFailure(job.id, 'Axcel API 500');
  state = engine.getState();
  assert.equal(state.jobs[0].status, 'failed');
  assert.equal(state.jobs[0].attemptCount, 2);
  assert.match(state.jobs[0].error || '', /Exceeded max retries/);
});

test('VideoQueueEngine pauses and resumes cleanly', () => {
  const engine = new VideoQueueEngine({ maxConcurrency: 2 });
  const prompts = [createMockPrompt(1, 'Scene 1', 'Prompt 1')];
  engine.loadPrompts(prompts);

  engine.start();
  assert.equal(engine.getState().isRunning, true);
  assert.equal(engine.getState().isPaused, false);

  engine.pause();
  assert.equal(engine.getState().isPaused, true);

  engine.resume();
  assert.equal(engine.getState().isPaused, false);

  engine.stop();
  assert.equal(engine.getState().isRunning, false);
});

test('VideoQueueEngine records generation history for attempts', () => {
  const engine = new VideoQueueEngine({ maxConcurrency: 1, maxBatchSize: 10 });
  const prompts = [createMockPrompt(1, 'Hero Scene', 'Hero prompt text')];
  engine.loadPrompts(prompts);

  engine.start();
  const job = engine.getState().jobs[0];

  let history = engine.getHistory();
  assert.equal(history.length, 1);
  assert.equal(history[0].sceneTitle, 'Hero Scene');
  assert.equal(history[0].attemptNumber, 1);
  assert.equal(history[0].status, 'running');

  // Complete job
  engine.handleJobSuccess(job.id, 'https://example.com/hero.mp4');
  history = engine.getHistory();
  assert.equal(history[0].status, 'completed');
  assert.equal(history[0].videoUrl, 'https://example.com/hero.mp4');
  assert.ok(history[0].durationMs !== undefined);

  // Clear history
  engine.clearHistory();
  assert.equal(engine.getHistory().length, 0);

  engine.stop();
});
