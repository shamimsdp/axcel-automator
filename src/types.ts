export type AspectRatio = '16:9' | '9:16' | '1:1' | '3:4' | '4:3' | '21:9';
export type VideoDuration = '5s' | '8s' | '10s' | '12s' | '15s';
export type VideoResolution = '480p' | '720p' | '1080p';
export type VideoModel = 'Seedance 2.0' | 'Seedance 2.5';

export interface PromptItem {
  id: string;
  index: number;
  title: string;
  prompt: string;
  duration: VideoDuration;
  resolution: VideoResolution;
  aspectRatio: AspectRatio;
  generateAudio: boolean;
  charCount: number;
}

export type JobStatus =
  | 'pending'
  | 'queued'
  | 'running'
  | 'retrying'
  | 'completed'
  | 'failed'
  | 'cancelled';

export interface QueueJob {
  id: string;
  promptItem: PromptItem;
  status: JobStatus;
  progress: number; // 0 - 100
  attemptCount: number;
  maxRetries: number;
  error?: string;
  jobId?: string;
  videoUrl?: string;
  startedAt?: number;
  completedAt?: number;
  retryAfter?: number;
  workerId?: number;
  downloadStatus?: 'idle' | 'downloading' | 'downloaded' | 'failed';
}

export interface QueueConfig {
  maxConcurrency: number; // Default 2
  maxBatchSize: number; // Default 10
  maxRetries: number; // Default 3
  retryDelayMs: number; // Default 5000ms
  autoDownload: boolean;
  downloadFolder: string;
  filenamePattern: string; // e.g. "{index}_{title}_{id}"
}

export interface ExtensionFile {
  name: string;
  path: string;
  language: string;
  content: string;
  description: string;
}

export interface LogEntry {
  id: string;
  timestamp: number;
  level: 'info' | 'success' | 'warn' | 'error';
  message: string;
  jobId?: string;
}

export interface GenerationHistoryEntry {
  id: string;
  jobId: string;
  sceneIndex: number;
  sceneTitle: string;
  prompt: string;
  attemptNumber: number;
  status: JobStatus;
  startedAt: number;
  completedAt?: number;
  durationMs?: number;
  error?: string;
  videoUrl?: string;
  downloadUrl?: string;
  parameters: {
    duration: VideoDuration;
    resolution: VideoResolution;
    aspectRatio: AspectRatio;
    generateAudio: boolean;
  };
}
