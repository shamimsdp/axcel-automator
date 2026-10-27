import React, { useState } from 'react';
import {
  Download,
  CheckCircle,
  Copy,
  Check,
  FolderArchive,
  Terminal,
  ExternalLink,
  Code2,
  Cpu,
  RefreshCw,
  Sparkles,
  Zap,
  Info,
  ShieldCheck,
} from 'lucide-react';
import { ExtensionFile } from '../types';
import { getAllExtensionFiles } from '../utils/extensionGenerator';

interface ExtensionHubProps {
  onDownloadZip: () => void;
  isDownloadingZip: boolean;
}

export const ExtensionHub: React.FC<ExtensionHubProps> = ({
  onDownloadZip,
  isDownloadingZip,
}) => {
  const [selectedFile, setSelectedFile] = useState<string>('content.js');
  const [fileCopied, setFileCopied] = useState<boolean>(false);
  const [bookmarkletCopied, setBookmarkletCopied] = useState<boolean>(false);

  const files = getAllExtensionFiles();
  const currentFile = files.find(f => f.name === selectedFile) || files[0];

  const handleCopyFileContent = () => {
    navigator.clipboard.writeText(currentFile.content);
    setFileCopied(true);
    setTimeout(() => setFileCopied(false), 2000);
  };

  const bookmarkletCode = `// Axcel Automator Quick Console Runner
// Paste this directly into Chrome DevTools Console on https://axcel.cloud/video/text-to-video
(function() {
  console.log('%c🎬 Axcel Automator Injected!', 'background: #2563eb; color: #fff; padding: 4px 8px; border-radius: 4px; font-weight: bold;');
  const widgetId = 'axcel-quick-runner';
  if (document.getElementById(widgetId)) { alert('Axcel Automator already injected!'); return; }
  const div = document.createElement('div');
  div.id = widgetId;
  div.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:999999;background:#18181b;color:#f4f4f5;border:1px solid #3f3f46;border-radius:12px;padding:16px;box-shadow:0 10px 30px rgba(0,0,0,0.5);width:320px;font-family:sans-serif;font-size:12px;';
  div.innerHTML = \`<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;"><strong style="color:#60a5fa;">🎬 Axcel Automator HUD</strong><button onclick="document.getElementById('\${widgetId}').remove()" style="background:none;border:none;color:#a1a1aa;cursor:pointer;">✕</button></div><p style="color:#a1a1aa;margin-bottom:10px;">Loaded on \${window.location.host}. Supports 2 concurrent generations & 10 video batching.</p><button id="ax-quick-start" style="width:100%;padding:8px;background:#2563eb;color:#fff;border:none;border-radius:6px;font-weight:600;cursor:pointer;">Ready to Process</button>\`;
  document.body.appendChild(div);
  document.getElementById('ax-quick-start').onclick = () => alert('Please load your .md script from the Chrome Extension popup for full downloads API integration!');
})();`;

  const handleCopyBookmarklet = () => {
    navigator.clipboard.writeText(bookmarkletCode);
    setBookmarkletCopied(true);
    setTimeout(() => setBookmarkletCopied(false), 2000);
  };

  return (
    <div className="space-y-8">
      {/* Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-zinc-950 p-6 sm:p-8">
        <div className="relative z-10 max-w-3xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-500/30 bg-blue-500/10 px-3 py-1 text-xs font-semibold text-blue-400">
            <Zap className="h-3.5 w-3.5" />
            <span>Built Specifically for Axcel.cloud Text-to-Video</span>
          </div>

          <h1 className="mt-4 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Automate Your Axcel.cloud Video Pipeline
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-zinc-300">
            Generate up to <b>10 videos per batch</b> from Markdown scripts with <b>2 simultaneous generations</b>. Automatically handles transient failures with instant auto-retry and downloads finished MP4 videos directly to your disk.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              onClick={onDownloadZip}
              disabled={isDownloadingZip}
              className="flex items-center gap-2.5 rounded-xl bg-blue-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/25 transition hover:bg-blue-500 active:scale-95 disabled:opacity-50"
            >
              <FolderArchive className="h-4 w-4" />
              <span>{isDownloadingZip ? 'Packaging Extension...' : 'Download Chrome Extension (.zip)'}</span>
            </button>

            <a
              href="#installation-guide"
              className="flex items-center gap-2 rounded-xl border border-zinc-700 bg-zinc-800/80 px-4 py-3 text-sm font-medium text-zinc-200 transition hover:bg-zinc-700"
            >
              <Info className="h-4 w-4 text-zinc-400" />
              <span>Installation Guide (30s)</span>
            </a>
          </div>
        </div>

        {/* Feature Badges Grid */}
        <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <Cpu className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-white">2 Simultaneous Slots</h3>
            <p className="mt-1 text-xs text-zinc-400">
              Matches Axcel’s 2-worker generation limit for optimal queue throughput.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <RefreshCw className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-white">Smart Auto-Retry</h3>
            <p className="mt-1 text-xs text-zinc-400">
              Recovers from network timeouts, 500 errors, or "Gagal menyiapkan video".
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <Download className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-white">Auto-Download MP4s</h3>
            <p className="mt-1 text-xs text-zinc-400">
              Saves completed video clips into your folder with clean numbered filenames.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/60 p-4">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10 text-purple-400">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <h3 className="mt-3 text-sm font-semibold text-white">Manifest V3</h3>
            <p className="mt-1 text-xs text-zinc-400">
              Modern Chrome standard with in-page floating widget and popup controls.
            </p>
          </div>
        </div>
      </div>

      {/* 30-Second Installation Walkthrough */}
      <div id="installation-guide" className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-emerald-400" />
          <span>Quick 30-Second Chrome Installation</span>
        </h2>
        <p className="mt-1 text-xs text-zinc-400">
          Works seamlessly on Google Chrome, Microsoft Edge, Brave, and Chromium browsers.
        </p>

        <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 font-mono text-xs font-bold text-white">
              1
            </span>
            <h4 className="mt-2.5 text-xs font-semibold text-zinc-200">Download & Unzip</h4>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
              Click <b>Download Extension (.zip)</b> above and extract the folder onto your computer.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 font-mono text-xs font-bold text-white">
              2
            </span>
            <h4 className="mt-2.5 text-xs font-semibold text-zinc-200">Open Extensions Tab</h4>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
              In Chrome, navigate to <code className="text-blue-400">chrome://extensions</code> and toggle <b>Developer mode</b> (top right).
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 font-mono text-xs font-bold text-white">
              3
            </span>
            <h4 className="mt-2.5 text-xs font-semibold text-zinc-200">Click "Load Unpacked"</h4>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
              Click the <b>Load unpacked</b> button (top left) and select the unzipped directory containing <code className="text-zinc-300">manifest.json</code>.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 font-mono text-xs font-bold text-white">
              4
            </span>
            <h4 className="mt-2.5 text-xs font-semibold text-zinc-200">Start Generating</h4>
            <p className="mt-1 text-[11px] leading-relaxed text-zinc-400">
              Open <a href="https://axcel.cloud/video/text-to-video" target="_blank" rel="noreferrer" className="text-blue-400 underline">axcel.cloud</a>, sign in, and use the floating widget or toolbar popup!
            </p>
          </div>
        </div>
      </div>

      {/* Extension Code Inspector */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Code2 className="h-5 w-5 text-indigo-400" />
              <span>Extension Source Code Inspector</span>
            </h2>
            <p className="mt-0.5 text-xs text-zinc-400">
              Browse all bundled files included in the zip package.
            </p>
          </div>

          <button
            onClick={handleCopyFileContent}
            className="flex items-center gap-1.5 self-start rounded-lg border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs font-medium text-zinc-300 hover:border-zinc-700 hover:text-white sm:self-auto"
          >
            {fileCopied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{fileCopied ? 'Copied Content' : `Copy ${currentFile.name}`}</span>
          </button>
        </div>

        {/* File Tabs */}
        <div className="mt-4 flex flex-wrap gap-1.5 border-b border-zinc-800 pb-3">
          {files.map(f => (
            <button
              key={f.name}
              onClick={() => setSelectedFile(f.name)}
              className={`rounded-lg px-3 py-1 text-xs font-mono transition ${
                selectedFile === f.name
                  ? 'bg-zinc-800 text-blue-400 border border-zinc-700 font-bold'
                  : 'text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200'
              }`}
            >
              {f.name}
            </button>
          ))}
        </div>

        {/* File Description */}
        <div className="mt-2 text-xs text-zinc-400">
          <span className="font-semibold text-zinc-300">{currentFile.name}:</span> {currentFile.description}
        </div>

        {/* Code Block */}
        <div className="mt-3 overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950">
          <div className="flex items-center justify-between border-b border-zinc-850 px-4 py-2 bg-zinc-900/60 text-[11px] font-mono text-zinc-400">
            <span>{currentFile.path}</span>
            <span>{currentFile.content.split('\n').length} lines</span>
          </div>
          <pre className="max-h-[380px] overflow-auto p-4 font-mono text-xs leading-relaxed text-zinc-300 selection:bg-blue-600 selection:text-white">
            {currentFile.content}
          </pre>
        </div>
      </div>

      {/* Alternative: Console Bookmarklet Runner */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Terminal className="h-4 w-4 text-emerald-400" />
              <span>Direct DevTools Console Script (No Installation Required)</span>
            </h3>
            <p className="mt-0.5 text-xs text-zinc-400">
              Need to test immediately? Paste this snippet into the Chrome Console on <code>axcel.cloud/video/text-to-video</code>.
            </p>
          </div>

          <button
            onClick={handleCopyBookmarklet}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-500"
          >
            {bookmarkletCopied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            <span>{bookmarkletCopied ? 'Copied Script' : 'Copy Console Snippet'}</span>
          </button>
        </div>

        <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3 font-mono text-xs text-zinc-400 overflow-x-auto">
          <code>{bookmarkletCode.slice(0, 180)}...</code>
        </div>
      </div>
    </div>
  );
};
