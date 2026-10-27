import React, { useState } from 'react';
import {
  History,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Download,
  Film,
  ExternalLink,
  Copy,
  Check,
  Search,
  Filter,
  Trash2,
  FileDown,
  Sparkles,
  Layers,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { GenerationHistoryEntry, JobStatus } from '../types';
import { formatDuration } from '../utils/metrics';

interface GenerationHistoryListProps {
  history: GenerationHistoryEntry[];
  onClearHistory: () => void;
  onPreviewVideo: (title: string, url: string) => void;
}

export const GenerationHistoryList: React.FC<GenerationHistoryListProps> = ({
  history,
  onClearHistory,
  onPreviewVideo,
}) => {
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'completed' | 'retrying' | 'failed'>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filteredHistory = history.filter(item => {
    // Status filter
    if (statusFilter !== 'all' && item.status !== statusFilter) {
      return false;
    }
    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        item.sceneTitle.toLowerCase().includes(q) ||
        item.prompt.toLowerCase().includes(q) ||
        String(item.sceneIndex).includes(q)
      );
    }
    return true;
  });

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleExportJSON = () => {
    const jsonStr = JSON.stringify(history, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `axcel_generation_history_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportCSV = () => {
    const headers = ['Timestamp', 'SceneIndex', 'SceneTitle', 'Attempt', 'Status', 'DurationMs', 'Error', 'VideoUrl', 'Prompt'];
    const rows = history.map(h => [
      new Date(h.startedAt).toISOString(),
      h.sceneIndex,
      `"${h.sceneTitle.replace(/"/g, '""')}"`,
      h.attemptNumber,
      h.status,
      h.durationMs || '',
      `"${(h.error || '').replace(/"/g, '""')}"`,
      h.videoUrl || '',
      `"${h.prompt.replace(/"/g, '""')}"`,
    ]);

    const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `axcel_generation_history_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 shadow-xl">
      {/* Header and Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-zinc-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-amber-400" />
            <h3 className="text-base font-bold text-white tracking-tight">
              Generation History
            </h3>
            <span className="rounded-full bg-zinc-800 px-2.5 py-0.5 font-mono text-xs font-semibold text-zinc-300">
              {history.length} {history.length === 1 ? 'attempt' : 'attempts'}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-zinc-400">
            Chronological audit trail of all initiated video renders, status transitions, timestamps, and output links.
          </p>
        </div>

        {/* Export / Clear buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {history.length > 0 && (
            <>
              <button
                onClick={handleExportCSV}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:text-white transition"
                title="Export history to CSV"
              >
                <FileDown className="h-3.5 w-3.5 text-emerald-400" />
                <span>Export CSV</span>
              </button>

              <button
                onClick={handleExportJSON}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:text-white transition"
                title="Export history to JSON"
              >
                <FileDown className="h-3.5 w-3.5 text-blue-400" />
                <span>Export JSON</span>
              </button>

              <button
                onClick={onClearHistory}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-xs font-medium text-zinc-400 hover:border-zinc-700 hover:text-red-400 transition"
                title="Clear all recorded history"
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span>Clear</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Status filter tabs */}
        <div className="flex items-center gap-1 bg-zinc-950 p-1 rounded-xl border border-zinc-800 text-xs">
          {(['all', 'completed', 'retrying', 'failed'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`rounded-lg px-3 py-1 font-medium capitalize transition ${
                statusFilter === tab
                  ? 'bg-zinc-800 text-white shadow-sm'
                  : 'text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {tab === 'all' ? `All (${history.length})` : `${tab} (${history.filter(h => h.status === tab).length})`}
            </button>
          ))}
        </div>

        {/* Search input */}
        <div className="relative w-full sm:w-64">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            placeholder="Search scene or prompt..."
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 py-1.5 pl-8 pr-3 text-xs text-zinc-200 outline-none focus:border-zinc-600 placeholder:text-zinc-600"
          />
        </div>
      </div>

      {/* Generation History Items List */}
      <div className="mt-4 space-y-3 max-h-[500px] overflow-y-auto pr-1">
        {history.length === 0 ? (
          <div className="rounded-xl border border-zinc-800/80 bg-zinc-950/60 p-12 text-center text-zinc-500 text-xs">
            <History className="mx-auto h-8 w-8 text-zinc-600 mb-2 opacity-60" />
            <p className="text-sm font-medium text-zinc-400">No Generation History Recorded Yet</p>
            <p className="mt-1 text-zinc-500">
              When you launch batch rendering, every video generation attempt, duration, retry, and video link will be logged here.
            </p>
          </div>
        ) : filteredHistory.length === 0 ? (
          <div className="rounded-xl border border-zinc-800 bg-zinc-950/50 p-8 text-center text-zinc-500 text-xs">
            No history entries match your current search/filter.
          </div>
        ) : (
          filteredHistory.map(item => {
            const isCompleted = item.status === 'completed';
            const isRetrying = item.status === 'retrying';
            const isFailed = item.status === 'failed';
            const isRunning = item.status === 'running';

            const formattedTime = new Date(item.startedAt).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });
            const formattedDate = new Date(item.startedAt).toLocaleDateString([], {
              month: 'short',
              day: 'numeric',
            });

            const isExpanded = expandedId === item.id;

            return (
              <div
                key={item.id}
                className={`rounded-xl border p-4 text-xs transition ${
                  isCompleted
                    ? 'border-emerald-500/30 bg-emerald-950/10 hover:border-emerald-500/50'
                    : isRetrying
                    ? 'border-amber-500/30 bg-amber-950/10 hover:border-amber-500/50'
                    : isFailed
                    ? 'border-red-500/30 bg-red-950/10 hover:border-red-500/50'
                    : 'border-blue-500/30 bg-blue-950/10'
                }`}
              >
                {/* Top Row: Scene, Attempt, Status Badge, Timestamp */}
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 font-mono text-[10px] font-bold text-zinc-300">
                      {item.sceneIndex}
                    </span>
                    <h4 className="font-semibold text-white truncate text-xs">
                      {item.sceneTitle}
                    </h4>
                    <span className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[10px] font-mono text-zinc-400">
                      Attempt {item.attemptNumber}
                    </span>
                  </div>

                  {/* Status Badge & Timestamp */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase ${
                        isCompleted
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : isRetrying
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : isFailed
                          ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                          : 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                      }`}
                    >
                      {isCompleted && <CheckCircle2 className="h-3 w-3" />}
                      {isRetrying && <AlertTriangle className="h-3 w-3" />}
                      {isFailed && <XCircle className="h-3 w-3" />}
                      {isRunning && <Clock className="h-3 w-3 animate-spin" />}
                      <span>{item.status}</span>
                      {item.durationMs && (
                        <span className="font-mono font-normal">
                          ({formatDuration(item.durationMs)})
                        </span>
                      )}
                    </span>

                    {/* Timestamp */}
                    <span className="font-mono text-[11px] text-zinc-500" title={new Date(item.startedAt).toLocaleString()}>
                      {formattedDate} {formattedTime}
                    </span>
                  </div>
                </div>

                {/* Reference Image Thumbnail (if Image-to-Video) */}
                {item.parameters.referenceImage && (
                  <div className="mt-2 flex items-center gap-2 rounded-lg border border-indigo-500/20 bg-indigo-950/20 p-1.5">
                    <img
                      src={item.parameters.referenceImage}
                      alt="Ref"
                      className="h-10 w-14 rounded object-cover border border-zinc-700 shrink-0"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] font-semibold text-indigo-300">Reference Image</span>
                        <span className="font-mono text-[9px] text-zinc-400 truncate max-w-[160px]">
                          {item.parameters.referenceImageName || 'reference.png'}
                        </span>
                      </div>
                      <span className="text-[9px] text-zinc-400">
                        Injected into Axcel Image-to-Video pipeline
                      </span>
                    </div>
                  </div>
                )}

                {/* Prompt Preview */}
                <div className="mt-2 text-zinc-300">
                  <p className={`text-[11px] leading-relaxed text-zinc-400 ${isExpanded ? '' : 'line-clamp-2'}`}>
                    "{item.prompt}"
                  </p>
                  {item.prompt.length > 120 && (
                    <button
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                      className="mt-1 text-[10px] text-zinc-500 hover:text-zinc-300 flex items-center gap-0.5"
                    >
                      {isExpanded ? (
                        <><span>Show less</span> <ChevronUp className="h-3 w-3" /></>
                      ) : (
                        <><span>Show full prompt</span> <ChevronDown className="h-3 w-3" /></>
                      )}
                    </button>
                  )}
                </div>

                {/* Error message if failed or retrying */}
                {item.error && (
                  <div className="mt-2 rounded-lg border border-red-900/40 bg-red-950/20 px-3 py-1.5 text-[11px] text-red-300 font-mono">
                    ⚠ {item.error}
                  </div>
                )}

                {/* Bottom Row: Video Specs & Links */}
                <div className="mt-3 flex flex-col gap-2 pt-2 border-t border-zinc-800/60 sm:flex-row sm:items-center sm:justify-between text-[11px]">
                  {/* Parameter pills */}
                  <div className="flex items-center gap-2 text-zinc-500 font-mono text-[10px] flex-wrap">
                    <span className="text-zinc-300 font-semibold">{item.parameters.model || 'Seedance 2.5'}</span>
                    <span>•</span>
                    <span className={item.parameters.duration === '30s' ? 'text-amber-400 font-bold' : ''}>
                      {item.parameters.duration}
                    </span>
                    <span>•</span>
                    <span>{item.parameters.aspectRatio}</span>
                    <span>•</span>
                    <span>{item.parameters.resolution}</span>
                    {item.parameters.generateAudio && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-400 font-sans">Audio ON</span>
                      </>
                    )}
                    {item.parameters.referenceImage && (
                      <>
                        <span>•</span>
                        <span className="text-indigo-400 font-sans">Image-to-Video</span>
                      </>
                    )}
                  </div>

                  {/* Actions & Links */}
                  <div className="flex items-center gap-2">
                    {/* Copy Prompt Link */}
                    <button
                      onClick={() => handleCopy(item.prompt, `prompt-${item.id}`)}
                      className="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-zinc-400 hover:text-white transition"
                      title="Copy prompt text"
                    >
                      {copiedId === `prompt-${item.id}` ? (
                        <Check className="h-3 w-3 text-emerald-400" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                      <span>{copiedId === `prompt-${item.id}` ? 'Copied' : 'Prompt'}</span>
                    </button>

                    {/* Open in Axcel link (routes to image-to-video or text-to-video) */}
                    <a
                      href={
                        item.parameters.referenceImage || item.parameters.generationMode === 'image-to-video'
                          ? 'https://axcel.cloud/video/image-to-video'
                          : 'https://axcel.cloud/video/text-to-video'
                      }
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1 text-zinc-400 hover:text-white transition"
                      title={
                        item.parameters.referenceImage || item.parameters.generationMode === 'image-to-video'
                          ? 'Open axcel.cloud/video/image-to-video'
                          : 'Open axcel.cloud/video/text-to-video'
                      }
                    >
                      <ExternalLink className="h-3 w-3 text-zinc-400" />
                      <span>{item.parameters.referenceImage ? 'Axcel Img2Vid' : 'Axcel T2V'}</span>
                    </a>

                    {/* If completed: Watch Video Preview and Direct Download MP4 */}
                    {isCompleted && item.videoUrl && (
                      <>
                        <button
                          onClick={() => onPreviewVideo(item.sceneTitle, item.videoUrl!)}
                          className="flex items-center gap-1 rounded-md border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 font-medium text-emerald-300 hover:bg-emerald-500/20 transition"
                          title="Watch generated video"
                        >
                          <Film className="h-3 w-3" />
                          <span>Watch Video</span>
                        </button>

                        <a
                          href={item.videoUrl}
                          download={`${String(item.sceneIndex).padStart(2, '0')}_${item.sceneTitle.replace(/[^a-zA-Z0-9_-]/g, '_')}.mp4`}
                          className="flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 font-semibold text-white hover:bg-blue-500 transition shadow-sm"
                          title="Download MP4 video file"
                        >
                          <Download className="h-3 w-3" />
                          <span>Download MP4</span>
                        </a>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
