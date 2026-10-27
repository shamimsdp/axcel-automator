import { PromptItem, QueueConfig, QueueJob, GenerationHistoryEntry, ScheduledBatch } from '../types';

export const DEFAULT_QUEUE_CONFIG: QueueConfig = {
  maxConcurrency: 2, // 2 simultaneous generations as per axcel support
  maxBatchSize: 10,  // 10 videos at a time support
  maxRetries: 3,     // Auto-retry attempts on failure
  retryDelayMs: 3000,
  autoDownload: true,
  downloadFolder: 'axcel_videos',
  filenamePattern: '{index}_{title}',
};

export interface QueueState {
  jobs: QueueJob[];
  activeCount: number;
  completedCount: number;
  failedCount: number;
  isRunning: boolean;
  isPaused: boolean;
  scheduledBatches: ScheduledBatch[];
  activeScheduledBatch?: ScheduledBatch;
}

export type StateListener = (state: QueueState) => void;
export type LogListener = (level: 'info' | 'success' | 'warn' | 'error', message: string, jobId?: string) => void;
export type HistoryListener = (history: GenerationHistoryEntry[]) => void;
export type DownloadDispatcher = (job: QueueJob, filename: string) => Promise<boolean>;

export class VideoQueueEngine {
  private config: QueueConfig;
  private jobs: QueueJob[] = [];
  private history: GenerationHistoryEntry[] = [];
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private activeWorkers = new Set<string>();
  private stateListeners: Set<StateListener> = new Set();
  private logListeners: Set<LogListener> = new Set();
  private historyListeners: Set<HistoryListener> = new Set();
  private downloadDispatcher?: DownloadDispatcher;
  private scheduledBatches: ScheduledBatch[] = [];
  private activeScheduledBatchId?: string;
  private scheduleCheckInterval?: NodeJS.Timeout;

  constructor(config: Partial<QueueConfig> = {}) {
    this.config = { ...DEFAULT_QUEUE_CONFIG, ...config };
    this.scheduleCheckInterval = setInterval(() => {
      this.checkScheduledBatches();
    }, 1000);
  }

  public updateConfig(newConfig: Partial<QueueConfig>) {
    this.config = { ...this.config, ...newConfig };
    this.notify();
  }

  public getConfig(): QueueConfig {
    return { ...this.config };
  }

  public setDownloadDispatcher(dispatcher: DownloadDispatcher) {
    this.downloadDispatcher = dispatcher;
  }

  public subscribeState(listener: StateListener): () => void {
    this.stateListeners.add(listener);
    listener(this.getState());
    return () => this.stateListeners.delete(listener);
  }

  public subscribeLogs(listener: LogListener): () => void {
    this.logListeners.add(listener);
    return () => this.logListeners.delete(listener);
  }

  public subscribeHistory(listener: HistoryListener): () => void {
    this.historyListeners.add(listener);
    listener(this.getHistory());
    return () => this.historyListeners.delete(listener);
  }

  public getHistory(): GenerationHistoryEntry[] {
    return [...this.history];
  }

  public clearHistory(): void {
    this.history = [];
    this.notifyHistory();
  }

  private notifyHistory() {
    const list = this.getHistory();
    for (const listener of this.historyListeners) {
      try {
        listener(list);
      } catch {
        // ignore listener errors
      }
    }
  }

  private log(level: 'info' | 'success' | 'warn' | 'error', message: string, jobId?: string) {
    for (const listener of this.logListeners) {
      try {
        listener(level, message, jobId);
      } catch {
        // ignore listener errors
      }
    }
  }

  private notify() {
    const state = this.getState();
    for (const listener of this.stateListeners) {
      try {
        listener(state);
      } catch {
        // ignore listener errors
      }
    }
  }

  public getState(): QueueState {
    const completedCount = this.jobs.filter(j => j.status === 'completed').length;
    const failedCount = this.jobs.filter(j => j.status === 'failed').length;
    const activeScheduledBatch = this.scheduledBatches.find(
      b => b.id === this.activeScheduledBatchId
    ) || this.scheduledBatches.find(b => b.status === 'scheduled');

    return {
      jobs: [...this.jobs],
      activeCount: this.activeWorkers.size,
      completedCount,
      failedCount,
      isRunning: this.isRunning,
      isPaused: this.isPaused,
      scheduledBatches: [...this.scheduledBatches],
      activeScheduledBatch,
    };
  }

  /**
   * Schedules a batch to run automatically at a specific timestamp during off-peak hours
   */
  public scheduleBatch(
    scheduledFor: number,
    offPeakLabel: string,
    prompts: PromptItem[],
    name?: string
  ): ScheduledBatch {
    const id = `sched-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const batchName = name || `Batch #${this.scheduledBatches.length + 1} (${prompts.length} videos)`;
    const newBatch: ScheduledBatch = {
      id,
      name: batchName,
      scheduledFor,
      createdAt: Date.now(),
      prompts: [...prompts],
      status: 'scheduled',
      offPeakLabel,
    };

    this.scheduledBatches.push(newBatch);
    const dateStr = new Date(scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    this.log(
      'info',
      `📅 Queued off-peak batch "${batchName}" scheduled for ${dateStr} (${offPeakLabel}).`
    );
    this.notify();
    return newBatch;
  }

  public cancelScheduledBatch(id: string): void {
    const batch = this.scheduledBatches.find(b => b.id === id);
    if (!batch) return;
    batch.status = 'cancelled';
    this.log('warn', `Scheduled batch "${batch.name}" was cancelled.`);
    if (this.activeScheduledBatchId === id) {
      this.activeScheduledBatchId = undefined;
    }
    this.notify();
  }

  public runScheduledBatchNow(id: string): void {
    const batch = this.scheduledBatches.find(b => b.id === id);
    if (!batch) return;
    this.log('info', `⚡ Immediately triggering scheduled batch "${batch.name}" (skipping off-peak delay).`);
    this.triggerScheduledBatch(batch);
  }

  public checkScheduledBatches(): void {
    if (this.isRunning) return;

    const now = Date.now();
    const readyBatch = this.scheduledBatches.find(
      b => b.status === 'scheduled' && now >= b.scheduledFor
    );

    if (readyBatch) {
      this.triggerScheduledBatch(readyBatch);
    }
  }

  private triggerScheduledBatch(batch: ScheduledBatch): void {
    batch.status = 'running';
    this.activeScheduledBatchId = batch.id;
    this.log(
      'success',
      `⏰ Off-peak trigger reached! Auto-starting batch "${batch.name}" with ${batch.prompts.length} videos [Seedance 2.5, Audio ON]...`
    );
    this.loadPrompts(batch.prompts);
    this.start();
  }

  public clearScheduledBatches(): void {
    this.scheduledBatches = [];
    this.activeScheduledBatchId = undefined;
    this.notify();
  }

  public getScheduledBatches(): ScheduledBatch[] {
    return [...this.scheduledBatches];
  }

  public loadPrompts(prompts: PromptItem[]): void {
    // Respect batch limit
    const capped = prompts.slice(0, this.config.maxBatchSize);
    this.jobs = capped.map(p => ({
      id: `job-${p.id}`,
      promptItem: p,
      status: 'pending',
      progress: 0,
      attemptCount: 0,
      maxRetries: this.config.maxRetries,
      downloadStatus: 'idle',
    }));
    this.log(
      'info',
      `Loaded ${this.jobs.length} prompts into queue (capped at max batch size of ${this.config.maxBatchSize})`
    );
    this.notify();
  }

  public start(): void {
    if (this.isRunning && !this.isPaused) return;
    this.isRunning = true;
    this.isPaused = false;
    this.log('info', `Batch video automation started. Max concurrency: ${this.config.maxConcurrency}`);
    this.notify();
    this.processNext();
  }

  public pause(): void {
    if (!this.isRunning) return;
    this.isPaused = true;
    this.log('warn', 'Queue processing paused. Currently active jobs will finish.');
    this.notify();
  }

  public resume(): void {
    if (!this.isRunning || !this.isPaused) return;
    this.isPaused = false;
    this.log('info', 'Queue processing resumed.');
    this.notify();
    this.processNext();
  }

  public stop(): void {
    this.isRunning = false;
    this.isPaused = false;
    this.timerIds.forEach(t => clearTimeout(t));
    this.timerIds = [];
    this.jobs = this.jobs.map(j => {
      if (j.status === 'running' || j.status === 'queued') {
        return { ...j, status: 'cancelled' };
      }
      return j;
    });
    this.activeWorkers.clear();
    this.log('warn', 'Queue processing stopped by user.');
    this.notify();
  }

  public destroy(): void {
    this.stop();
    if (this.scheduleCheckInterval) {
      clearInterval(this.scheduleCheckInterval);
    }
  }

  public retryJob(jobId: string): void {
    const jobIndex = this.jobs.findIndex(j => j.id === jobId);
    if (jobIndex === -1) return;
    const job = this.jobs[jobIndex];
    this.jobs[jobIndex] = {
      ...job,
      status: 'pending',
      progress: 0,
      error: undefined,
      attemptCount: 0,
    };
    this.log('info', `Manual retry queued for Scene ${job.promptItem.index}: ${job.promptItem.title}`);
    this.notify();
    if (this.isRunning && !this.isPaused) {
      this.processNext();
    }
  }

  public removeJob(jobId: string): void {
    this.jobs = this.jobs.filter(j => j.id !== jobId);
    this.activeWorkers.delete(jobId);
    this.notify();
    if (this.isRunning && !this.isPaused) {
      this.processNext();
    }
  }

  public resetQueue(): void {
    this.stop();
    this.jobs = this.jobs.map(j => ({
      ...j,
      status: 'pending',
      progress: 0,
      error: undefined,
      attemptCount: 0,
      videoUrl: undefined,
      downloadStatus: 'idle',
    }));
    this.notify();
  }

  /**
   * Internal scheduler that picks up pending/retrying jobs
   * while activeWorkers.size < maxConcurrency
   */
  public processNext(): void {
    if (!this.isRunning || this.isPaused) return;

    while (this.activeWorkers.size < this.config.maxConcurrency) {
      // Find candidate job
      const nextJob = this.jobs.find(
        j => j.status === 'pending' || (j.status === 'retrying' && (!j.retryAfter || j.retryAfter <= Date.now()))
      );

      if (!nextJob) {
        // Check if all jobs are finished
        const pendingCount = this.jobs.filter(
          j => j.status === 'pending' || j.status === 'running' || j.status === 'retrying'
        ).length;

        if (pendingCount === 0 && this.activeWorkers.size === 0 && this.jobs.length > 0) {
          this.isRunning = false;
          if (this.activeScheduledBatchId) {
            const activeBatch = this.scheduledBatches.find(b => b.id === this.activeScheduledBatchId);
            if (activeBatch) {
              activeBatch.status = 'completed';
              this.log('success', `🎉 Scheduled off-peak batch "${activeBatch.name}" completed successfully!`);
            }
            this.activeScheduledBatchId = undefined;
          }
          this.log('success', 'All batch video tasks have finished processing!');
          this.notify();
          // Check if another scheduled batch is queued up
          this.checkScheduledBatches();
        }
        break;
      }

      this.dispatchJob(nextJob.id);
    }
  }

  private dispatchJob(jobId: string) {
    const jobIndex = this.jobs.findIndex(j => j.id === jobId);
    if (jobIndex === -1) return;

    const job = this.jobs[jobIndex];
    const attempt = job.attemptCount + 1;
    const workerSlot = this.getAvailableWorkerSlot();

    this.activeWorkers.add(jobId);
    this.jobs[jobIndex] = {
      ...job,
      status: 'running',
      progress: 5,
      attemptCount: attempt,
      startedAt: Date.now(),
      workerId: workerSlot,
      error: undefined,
    };

    const isImg2Vid = !!job.promptItem.referenceImage;
    this.log(
      'info',
      `[Worker ${workerSlot}] Starting ${isImg2Vid ? 'Image-to-Video' : 'Text-to-Video'} Scene ${job.promptItem.index} (Attempt ${attempt}/${this.config.maxRetries}): "${job.promptItem.title}" [${job.promptItem.model || 'Seedance 2.5'}, ${job.promptItem.duration}]`,
      jobId
    );
    if (isImg2Vid) {
      this.log(
        'info',
        `[Worker ${workerSlot}] Injected reference image: ${job.promptItem.referenceImageName || 'reference.png'} -> axcel.cloud/video/image-to-video`,
        jobId
      );
    }
    this.notify();

    // Record in Generation History
    const historyEntry: GenerationHistoryEntry = {
      id: `hist-${job.id}-${attempt}-${Date.now()}`,
      jobId: job.id,
      sceneIndex: job.promptItem.index,
      sceneTitle: job.promptItem.title,
      prompt: job.promptItem.prompt,
      attemptNumber: attempt,
      status: 'running',
      startedAt: Date.now(),
      parameters: {
        duration: job.promptItem.duration,
        resolution: job.promptItem.resolution,
        aspectRatio: job.promptItem.aspectRatio,
        generateAudio: job.promptItem.generateAudio,
        model: job.promptItem.model || 'Seedance 2.5',
        generationMode: job.promptItem.generationMode || (isImg2Vid ? 'image-to-video' : 'text-to-video'),
        referenceImage: job.promptItem.referenceImage,
        referenceImageName: job.promptItem.referenceImageName,
      },
    };
    this.history.unshift(historyEntry);
    this.notifyHistory();

    // The execution can be driven by extension content script or simulated in web environment
    this.executeJob(jobId);
  }

  private getAvailableWorkerSlot(): number {
    const occupiedSlots = new Set(
      this.jobs
        .filter(j => j.status === 'running' && j.workerId !== undefined)
        .map(j => j.workerId!)
    );
    for (let slot = 1; slot <= this.config.maxConcurrency; slot++) {
      if (!occupiedSlots.has(slot)) return slot;
    }
    return 1;
  }

  /**
   * Handles simulated or external job execution and progression
   */
  protected executeJob(jobId: string): void {
    // This method handles steps in the UI simulator. In the Chrome Extension,
    // the content script communicates via postMessage / chrome.runtime.
    const job = this.jobs.find(j => j.id === jobId);
    if (!job) return;

    // Simulate progress updates
    const simulateInterval = setInterval(() => {
      if (!this.isRunning || this.isPaused) {
        clearInterval(simulateInterval);
        return;
      }

      const idx = this.jobs.findIndex(j => j.id === jobId);
      if (idx === -1 || this.jobs[idx].status !== 'running') {
        clearInterval(simulateInterval);
        return;
      }

      const current = this.jobs[idx];
      const newProgress = Math.min(95, current.progress + 15);

      this.jobs[idx] = {
        ...current,
        progress: newProgress,
      };
      this.notify();

      if (newProgress >= 95) {
        clearInterval(simulateInterval);
        // Randomly simulate occasional rate limit / transient failure if attempt == 1 to test retry logic
        const shouldSimulateFailure = current.promptItem.prompt.toLowerCase().includes('fail') && current.attemptCount < 2;

        if (shouldSimulateFailure) {
          this.handleJobFailure(jobId, 'Transient generation timeout / Axcel error (Auto-retrying)');
        } else {
          this.handleJobSuccess(jobId, `https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4`);
        }
      }
    }, 400);
  }

  public handleJobSuccess(jobId: string, videoUrl: string): void {
    const idx = this.jobs.findIndex(j => j.id === jobId);
    if (idx === -1) return;

    const job = this.jobs[idx];
    const completedJob: QueueJob = {
      ...job,
      status: 'completed',
      progress: 100,
      completedAt: Date.now(),
      videoUrl,
      downloadStatus: this.config.autoDownload ? 'downloading' : 'idle',
    };

    this.jobs[idx] = completedJob;
    this.activeWorkers.delete(jobId);

    // Update generation history record
    const hist = this.history.find(h => h.jobId === jobId && (h.status === 'running' || !h.completedAt));
    if (hist) {
      hist.status = 'completed';
      hist.completedAt = Date.now();
      hist.durationMs = hist.completedAt - hist.startedAt;
      hist.videoUrl = videoUrl;
      hist.downloadUrl = videoUrl;
      this.notifyHistory();
    }

    this.log(
      'success',
      `Successfully generated Scene ${job.promptItem.index}: "${job.promptItem.title}"!`,
      jobId
    );
    this.notify();

    if (this.config.autoDownload && this.downloadDispatcher) {
      const cleanTitle = job.promptItem.title.replace(/[^a-zA-Z0-9_-]/g, '_');
      const filename = `${this.config.filenamePattern
        .replace('{index}', String(job.promptItem.index).padStart(2, '0'))
        .replace('{title}', cleanTitle)
        .replace('{id}', job.id.slice(-4))}.mp4`;

      this.downloadDispatcher(completedJob, filename)
        .then(() => {
          const updateIdx = this.jobs.findIndex(j => j.id === jobId);
          if (updateIdx !== -1) {
            this.jobs[updateIdx].downloadStatus = 'downloaded';
            this.notify();
          }
          this.log('success', `Saved video file: ${filename}`, jobId);
        })
        .catch(err => {
          const updateIdx = this.jobs.findIndex(j => j.id === jobId);
          if (updateIdx !== -1) {
            this.jobs[updateIdx].downloadStatus = 'failed';
            this.notify();
          }
          this.log('warn', `Auto-download failed for ${filename}: ${err}`, jobId);
        });
    }

    // Schedule next in queue
    this.processNext();
  }

  public handleJobFailure(jobId: string, errorMessage: string): void {
    const idx = this.jobs.findIndex(j => j.id === jobId);
    if (idx === -1) return;

    const job = this.jobs[idx];
    this.activeWorkers.delete(jobId);
    const attemptCount = job.attemptCount > 0 ? job.attemptCount : 1;
    this.jobs[idx].attemptCount = attemptCount;

    // Update generation history record
    const hist = this.history.find(h => h.jobId === jobId && (h.status === 'running' || !h.completedAt));
    if (hist) {
      hist.status = attemptCount < this.config.maxRetries ? 'retrying' : 'failed';
      hist.completedAt = Date.now();
      hist.durationMs = hist.completedAt - hist.startedAt;
      hist.error = errorMessage;
      this.notifyHistory();
    }

    if (attemptCount < this.config.maxRetries) {
      // Auto-retry
      const retryAfter = Date.now() + this.config.retryDelayMs;
      this.jobs[idx] = {
        ...this.jobs[idx],
        status: 'retrying',
        progress: 0,
        error: errorMessage,
        retryAfter,
      };
      this.log(
        'warn',
        `Scene ${job.promptItem.index} failed: "${errorMessage}". Auto-retry #${attemptCount + 1} scheduled in ${Math.round(this.config.retryDelayMs / 1000)}s.`,
        jobId
      );
      this.notify();

      const timer = setTimeout(() => {
        if (this.isRunning && !this.isPaused) {
          const checkIdx = this.jobs.findIndex(j => j.id === jobId);
          if (checkIdx !== -1 && this.jobs[checkIdx].status === 'retrying') {
            this.jobs[checkIdx].status = 'pending';
            this.processNext();
          }
        }
      }, this.config.retryDelayMs);
      this.timerIds.push(timer);
    } else {
      // Exhausted retries
      this.jobs[idx] = {
        ...job,
        status: 'failed',
        progress: 0,
        error: `Exceeded max retries (${this.config.maxRetries}): ${errorMessage}`,
      };
      this.log(
        'error',
        `Scene ${job.promptItem.index} permanently failed after ${job.attemptCount} attempts: ${errorMessage}`,
        jobId
      );
      this.notify();
    }

    // Free up worker slot for another item
    this.processNext();
  }
}
