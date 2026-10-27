import React, { useState, useEffect, useRef } from 'react';
import {
  Play,
  Pause,
  Square,
  RotateCcw,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Download,
  Film,
  Cpu,
  Terminal,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';
import { PromptItem, QueueJob, LogEntry, GenerationHistoryEntry } from '../types';
import { VideoQueueEngine, QueueState } from '../utils/queueEngine';
import { SimulatorDashboard } from './SimulatorDashboard';
import { GenerationHistoryList } from './GenerationHistoryList';

interface LiveSimulatorProps {
  prompts: PromptItem[];
  onOpenStudio: () => void;
}

export const LiveSimulator: React.FC<LiveSimulatorProps> = ({
  prompts,
  onOpenStudio,
}) => {
  const [engine] = useState(() => new VideoQueueEngine({
    maxConcurrency: 2,
    maxBatchSize: 10,
    maxRetries: 3,
    retryDelayMs: 3000,
    autoDownload: true,
  }));

  const [state, setState] = useState<QueueState>(() => engine.getState());
  const [history, setHistory] = useState<GenerationHistoryEntry[]>(() => engine.getHistory());
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<{ title: string; url: string } | null>(null);
  const [batchStartTime, setBatchStartTime] = useState<number | undefined>();
  const logsEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Configure mock downloader for web simulator
    engine.setDownloadDispatcher(async (job, filename) => {
      // Simulate download delay
      await new Promise(r => setTimeout(r, 600));
      return true;
    });

    const unsubscribeState = engine.subscribeState(s => setState(s));
    const unsubscribeHistory = engine.subscribeHistory(h => setHistory(h));
    const unsubscribeLogs = engine.subscribeLogs((level, message, jobId) => {
      setLogs(prev => [
        ...prev.slice(-80), // keep last 80 logs
        {
          id: `log-${Date.now()}-${Math.random()}`,
          timestamp: Date.now(),
          level,
          message,
          jobId,
        },
      ]);
    });

    // Initial load of prompts
    if (prompts.length > 0) {
      engine.loadPrompts(prompts);
    }

    return () => {
      unsubscribeState();
      unsubscribeHistory();
      unsubscribeLogs();
      engine.stop();
    };
  }, [engine]);

  // When parent prompts change
  useEffect(() => {
    if (prompts.length > 0 && !state.isRunning) {
      engine.loadPrompts(prompts);
    }
  }, [prompts, engine]);

  // Auto-scroll logs
  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const handleStart = () => {
    if (state.jobs.length === 0 && prompts.length > 0) {
      engine.loadPrompts(prompts);
    }
    setBatchStartTime(Date.now());
    engine.start();
  };

  const handlePause = () => engine.pause();
  const handleResume = () => engine.resume();
  const handleStop = () => engine.stop();
  const handleReset = () => {
    setBatchStartTime(undefined);
    engine.resetQueue();
  };

  const handleClearHistory = () => {
    engine.clearHistory();
  };

  const handleRetryJob = (jobId: string) => {
    engine.retryJob(jobId);
  };

  const runningJobs = state.jobs.filter(j => j.status === 'running');
  const worker1Job = runningJobs.find(j => j.workerId === 1) || runningJobs[0];
  const worker2Job = runningJobs.find(j => j.workerId === 2) || (runningJobs.length > 1 ? runningJobs[1] : null);

  const totalJobs = state.jobs.length;
  const progressPercent =
    totalJobs > 0 ? Math.round((state.completedCount / totalJobs) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-400" />
                <span>Live Automation Simulator & Queue Monitor</span>
              </h2>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                state.isRunning
                  ? state.isPaused
                    ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                    : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-zinc-800 text-zinc-400'
              }`}>
                {state.isRunning ? (state.isPaused ? 'Paused' : 'Running') : 'Idle'}
              </span>
            </div>
            <p className="mt-1 text-xs text-zinc-400">
              Simulates the Chrome Extension driving <code>axcel.cloud/video/text-to-video</code> with 2 simultaneous workers.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {!state.isRunning ? (
              <button
                onClick={handleStart}
                disabled={totalJobs === 0}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-blue-500/20 transition hover:bg-blue-500 active:scale-95 disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Start Batch ({totalJobs} Prompts)</span>
              </button>
            ) : state.isPaused ? (
              <button
                onClick={handleResume}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-emerald-500 active:scale-95"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Resume</span>
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-amber-500 active:scale-95"
              >
                <Pause className="h-3.5 w-3.5" />
                <span>Pause</span>
              </button>
            )}

            <button
              onClick={handleStop}
              disabled={!state.isRunning}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:text-white disabled:opacity-40"
            >
              <Square className="h-3.5 w-3.5 text-red-400" />
              <span>Stop</span>
            </button>

            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 rounded-xl border border-zinc-800 bg-zinc-900 px-3.5 py-2 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>

        {/* Overall Progress Bar */}
        <div className="mt-5">
          <div className="flex justify-between text-xs text-zinc-400 mb-1.5">
            <span>Overall Batch Progress</span>
            <span className="font-mono font-medium text-zinc-200">
              {state.completedCount} / {totalJobs} completed ({progressPercent}%)
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-zinc-800">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Real-Time Processing Analytics Dashboard */}
      <SimulatorDashboard
        jobs={state.jobs}
        maxConcurrency={2}
        isRunning={state.isRunning}
        isPaused={state.isPaused}
        batchStartTime={batchStartTime}
      />

      {/* 2 Worker Stations (Visual Concurrency) */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Worker 1 */}
        <div className={`rounded-2xl border p-4 transition ${
          worker1Job
            ? 'border-blue-500/40 bg-zinc-900/80 shadow-lg shadow-blue-500/10'
            : 'border-zinc-800 bg-zinc-950/60'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${worker1Job ? 'bg-blue-400 animate-pulse' : 'bg-zinc-600'}`} />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Worker Station #1
              </h3>
            </div>
            <span className="font-mono text-[11px] text-zinc-500">
              {worker1Job ? `Slot 1 Active (${worker1Job.progress}%)` : 'Idle'}
            </span>
          </div>

          {worker1Job ? (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-white">
                <span className="truncate">Scene {worker1Job.promptItem.index}: {worker1Job.promptItem.title}</span>
                <span className="rounded bg-blue-500/20 px-1.5 py-0.5 text-[10px] text-blue-300">
                  Attempt {worker1Job.attemptCount}/3
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full bg-blue-500 transition-all duration-300"
                  style={{ width: `${worker1Job.progress}%` }}
                />
              </div>
              <p className="text-[11px] text-zinc-400 line-clamp-2 italic">
                "{worker1Job.promptItem.prompt}"
              </p>
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                <span>{worker1Job.promptItem.aspectRatio}</span>
                <span>•</span>
                <span>{worker1Job.promptItem.duration}</span>
                <span>•</span>
                <span>{worker1Job.promptItem.resolution}</span>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center justify-center py-6 text-zinc-600 text-xs">
              <Cpu className="h-6 w-6 mb-1 opacity-40" />
              <span>Waiting for tasks...</span>
            </div>
          )}
        </div>

        {/* Worker 2 */}
        <div className={`rounded-2xl border p-4 transition ${
          worker2Job
            ? 'border-indigo-500/40 bg-zinc-900/80 shadow-lg shadow-indigo-500/10'
            : 'border-zinc-800 bg-zinc-950/60'
        }`}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${worker2Job ? 'bg-indigo-400 animate-pulse' : 'bg-zinc-600'}`} />
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-300">
                Worker Station #2
              </h3>
            </div>
            <span className="font-mono text-[11px] text-zinc-500">
              {worker2Job ? `Slot 2 Active (${worker2Job.progress}%)` : 'Idle'}
            </span>
          </div>

          {worker2Job ? (
            <div className="mt-3 space-y-2">
              <div className="flex items-center justify-between text-xs font-medium text-white">
                <span className="truncate">Scene {worker2Job.promptItem.index}: {worker2Job.promptItem.title}</span>
                <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] text-indigo-300">
                  Attempt {worker2Job.attemptCount}/3
                </span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-800">
                <div
                  className="h-full bg-indigo-500 transition-all duration-300"
                  style={{ width: `${worker2Job.progress}%` }}
                />
              </div>
              <p className="text-[11px] text-zinc-400 line-clamp-2 italic">
                "{worker2Job.promptItem.prompt}"
              </p>
              <div className="flex items-center gap-2 text-[10px] text-zinc-500 font-mono">
                <span>{worker2Job.promptItem.aspectRatio}</span>
                <span>•</span>
                <span>{worker2Job.promptItem.duration}</span>
                <span>•</span>
                <span>{worker2Job.promptItem.resolution}</span>
              </div>
            </div>
          ) : (
            <div className="mt-4 flex flex-col items-center justify-center py-6 text-zinc-600 text-xs">
              <Cpu className="h-6 w-6 mb-1 opacity-40" />
              <span>Waiting for tasks...</span>
            </div>
          )}
        </div>
      </div>

      {/* Main Grid: Left = Queue Items Table, Right = Live Logs Terminal */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left: Queue Items (7 cols) */}
        <div className="space-y-3 lg:col-span-7">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Batch Queue ({state.jobs.length} Items)
            </span>
            {state.jobs.length === 0 && (
              <button
                onClick={onOpenStudio}
                className="text-xs text-blue-400 hover:underline"
              >
                Load prompts in Studio
              </button>
            )}
          </div>

          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
            {state.jobs.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-8 text-center text-zinc-500 text-xs">
                No items in queue. Load a script in the Document Studio tab to begin.
              </div>
            ) : (
              state.jobs.map(job => (
                <div
                  key={job.id}
                  className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-xs transition ${
                    job.status === 'running'
                      ? 'border-blue-500/50 bg-blue-500/5'
                      : job.status === 'completed'
                      ? 'border-emerald-500/30 bg-emerald-500/5'
                      : job.status === 'retrying'
                      ? 'border-amber-500/40 bg-amber-500/5'
                      : job.status === 'failed'
                      ? 'border-red-500/40 bg-red-500/5'
                      : 'border-zinc-800 bg-zinc-900/50'
                  }`}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-zinc-500 font-bold">
                        #{job.promptItem.index}
                      </span>
                      <span className="font-semibold text-zinc-200 truncate">
                        {job.promptItem.title}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase ${
                        job.status === 'running'
                          ? 'bg-blue-500/20 text-blue-400'
                          : job.status === 'completed'
                          ? 'bg-emerald-500/20 text-emerald-400'
                          : job.status === 'retrying'
                          ? 'bg-amber-500/20 text-amber-400'
                          : job.status === 'failed'
                          ? 'bg-red-500/20 text-red-400'
                          : 'bg-zinc-800 text-zinc-400'
                      }`}>
                        {job.status === 'retrying' ? `Retrying (${job.attemptCount}/3)` : job.status}
                      </span>
                    </div>

                    <p className="mt-1 text-zinc-400 truncate text-[11px]">
                      {job.promptItem.prompt}
                    </p>

                    {job.error && (
                      <p className="mt-1 text-[11px] text-red-400 truncate">
                        ⚠ {job.error}
                      </p>
                    )}
                  </div>

                  {/* Actions & Status */}
                  <div className="flex items-center gap-2 shrink-0">
                    {job.status === 'completed' && job.videoUrl && (
                      <button
                        onClick={() => setSelectedVideo({ title: job.promptItem.title, url: job.videoUrl! })}
                        className="flex items-center gap-1 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-300 hover:bg-emerald-500/20"
                      >
                        <Film className="h-3 w-3" />
                        <span>Preview</span>
                      </button>
                    )}

                    {job.downloadStatus === 'downloaded' && (
                      <span className="flex items-center gap-1 text-[11px] text-zinc-400" title="Downloaded as MP4">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        <span className="hidden sm:inline">Downloaded</span>
                      </span>
                    )}

                    {(job.status === 'failed' || job.status === 'cancelled') && (
                      <button
                        onClick={() => handleRetryJob(job.id)}
                        className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-800 px-2 py-1 text-[11px] text-zinc-200 hover:bg-zinc-700"
                        title="Retry this job"
                      >
                        <RefreshCw className="h-3 w-3" />
                        <span>Retry</span>
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Event Log Terminal (5 cols) */}
        <div className="space-y-3 lg:col-span-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400 flex items-center gap-1.5">
              <Terminal className="h-3.5 w-3.5 text-blue-400" />
              <span>Event & Automation Log</span>
            </span>
            <button
              onClick={() => setLogs([])}
              className="text-[11px] text-zinc-500 hover:text-zinc-300"
            >
              Clear
            </button>
          </div>

          <div className="h-[460px] overflow-y-auto rounded-xl border border-zinc-800 bg-zinc-950 p-3 font-mono text-[11px] leading-relaxed text-zinc-300">
            {logs.length === 0 ? (
              <div className="py-8 text-center text-zinc-600">
                Log is empty. Start the batch to view live automation events.
              </div>
            ) : (
              logs.map(log => (
                <div key={log.id} className="mb-1.5 flex items-start gap-1.5">
                  <span className="text-zinc-600 shrink-0">
                    [{new Date(log.timestamp).toLocaleTimeString()}]
                  </span>
                  <span className={`shrink-0 ${
                    log.level === 'info'
                      ? 'text-blue-400'
                      : log.level === 'success'
                      ? 'text-emerald-400'
                      : log.level === 'warn'
                      ? 'text-amber-400'
                      : 'text-red-400'
                  }`}>
                    {log.level === 'info' ? 'ℹ' : log.level === 'success' ? '✔' : log.level === 'warn' ? '▲' : '✖'}
                  </span>
                  <span className={`break-words ${
                    log.level === 'success'
                      ? 'text-emerald-300 font-medium'
                      : log.level === 'warn'
                      ? 'text-amber-300'
                      : log.level === 'error'
                      ? 'text-red-300'
                      : 'text-zinc-300'
                  }`}>
                    {log.message}
                  </span>
                </div>
              ))
            )}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>

      {/* Generation History List */}
      <GenerationHistoryList
        history={history}
        onClearHistory={handleClearHistory}
        onPreviewVideo={(title, url) => setSelectedVideo({ title, url })}
      />

      {/* Video Preview Modal */}
      {selectedVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-5 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <h4 className="text-sm font-semibold text-white truncate">{selectedVideo.title}</h4>
              <button
                onClick={() => setSelectedVideo(null)}
                className="rounded-lg p-1 text-zinc-400 hover:bg-zinc-800 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="mt-4 overflow-hidden rounded-xl bg-black">
              <video
                src={selectedVideo.url}
                controls
                autoPlay
                className="w-full max-h-[300px] object-contain"
              />
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setSelectedVideo(null)}
                className="rounded-lg border border-zinc-700 bg-zinc-800 px-3.5 py-1.5 text-xs font-medium text-zinc-300 hover:bg-zinc-700"
              >
                Close
              </button>
              <a
                href={selectedVideo.url}
                download
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-500"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Save MP4</span>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
