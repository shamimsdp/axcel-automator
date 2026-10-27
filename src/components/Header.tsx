import React from 'react';
import { Download, ExternalLink, Sparkles, Video, FileText, PlayCircle, BookOpen, Layers } from 'lucide-react';

export type AppTab = 'extension' | 'studio' | 'simulator' | 'docs';

interface HeaderProps {
  activeTab: AppTab;
  onTabChange: (tab: AppTab) => void;
  onDownloadZip: () => void;
  isDownloadingZip: boolean;
  promptCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  onDownloadZip,
  isDownloadingZip,
  promptCount,
}) => {
  return (
    <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-blue-600 to-cyan-500 text-white shadow-lg shadow-blue-500/20">
            <Video className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold tracking-tight text-white sm:text-lg">
                Axcel Video Automator
              </span>
              <span className="rounded-full border border-blue-500/30 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-400">
                Extension v1.0
              </span>
            </div>
            <p className="text-xs text-zinc-400 hidden sm:block">
              Batch text-to-video automation for axcel.cloud with 2x concurrency & auto-retry
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2.5">
          <a
            href="https://axcel.cloud/video/text-to-video"
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-white sm:flex"
            title="Open live Axcel Studio Text-to-Video"
          >
            <span>axcel.cloud</span>
            <ExternalLink className="h-3.5 w-3.5 text-zinc-400" />
          </a>

          <button
            onClick={onDownloadZip}
            disabled={isDownloadingZip}
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-500 active:scale-95 disabled:opacity-60"
          >
            <Download className="h-3.5 w-3.5" />
            <span>{isDownloadingZip ? 'Bundling...' : 'Download Extension (.zip)'}</span>
          </button>
        </div>
      </div>

      {/* Navigation Bar */}
      <div className="border-t border-zinc-900 bg-zinc-950">
        <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-4 py-1.5 sm:px-6">
          <button
            onClick={() => onTabChange('extension')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              activeTab === 'extension'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
            }`}
          >
            <Layers className="h-3.5 w-3.5 text-blue-400" />
            <span>Chrome Extension Hub</span>
          </button>

          <button
            onClick={() => onTabChange('studio')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              activeTab === 'studio'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
            }`}
          >
            <FileText className="h-3.5 w-3.5 text-emerald-400" />
            <span>Document & Script Studio</span>
            {promptCount > 0 && (
              <span className="rounded-full bg-zinc-700 px-1.5 py-0.2 text-[10px] text-zinc-200">
                {promptCount}
              </span>
            )}
          </button>

          <button
            onClick={() => onTabChange('simulator')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              activeTab === 'simulator'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
            }`}
          >
            <PlayCircle className="h-3.5 w-3.5 text-indigo-400" />
            <span>Live Automation Simulator</span>
          </button>

          <button
            onClick={() => onTabChange('docs')}
            className={`flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
              activeTab === 'docs'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5 text-amber-400" />
            <span>Axcel Specs & Docs</span>
          </button>
        </div>
      </div>
    </header>
  );
};
