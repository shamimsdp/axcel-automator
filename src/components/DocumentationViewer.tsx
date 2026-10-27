import React from 'react';
import { BookOpen, Check, Layers, Cpu, AlertTriangle, FileCode, ExternalLink, HelpCircle } from 'lucide-react';

export const DocumentationViewer: React.FC = () => {
  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Intro Header */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-6">
        <h2 className="text-xl font-bold text-white flex items-center gap-2.5">
          <BookOpen className="h-6 w-6 text-amber-400" />
          <span>Axcel Studio Text-to-Video Technical Documentation</span>
        </h2>
        <p className="mt-2 text-xs leading-relaxed text-zinc-300">
          This reference compiles the live architecture, DOM selectors, concurrency limits, and retry policies for <b>axcel.cloud/video/text-to-video</b> and <b>axcel.cloud/video/image-to-video</b> implemented by the Chrome Extension.
        </p>
      </div>

      {/* Grid of Core Specs */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        {/* Specification Card */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Layers className="h-4 w-4 text-blue-400" />
            <span>Supported Axcel Parameters</span>
          </h3>
          <div className="mt-4 space-y-3 text-xs">
            <div>
              <span className="font-semibold text-zinc-300">AI Models:</span>
              <p className="text-zinc-400">Seedance 2.5 (Supports 30s duration), Seedance 2.0</p>
            </div>
            <div>
              <span className="font-semibold text-zinc-300">Durations:</span>
              <div className="mt-1 flex flex-wrap gap-1 font-mono text-[11px]">
                {['5s', '8s', '10s', '12s', '15s', '30s (Seedance 2.5)'].map(d => (
                  <span key={d} className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-300">{d}</span>
                ))}
              </div>
            </div>
            <div>
              <span className="font-semibold text-zinc-300">Resolutions:</span>
              <div className="mt-1 flex flex-wrap gap-1 font-mono text-[11px]">
                {['480p', '720p', '1080p'].map(r => (
                  <span key={r} className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-300">{r}</span>
                ))}
              </div>
            </div>
            <div>
              <span className="font-semibold text-zinc-300">Aspect Ratios:</span>
              <div className="mt-1 flex flex-wrap gap-1 font-mono text-[11px]">
                {['16:9 (Landscape)', '9:16 (Portrait / Reels)', '1:1 (Square)', '3:4', '4:3', '21:9 (Ultrawide)'].map(a => (
                  <span key={a} className="rounded bg-zinc-800 px-2 py-0.5 text-zinc-300">{a}</span>
                ))}
              </div>
            </div>
            <div>
              <span className="font-semibold text-zinc-300">Audio Generation:</span>
              <p className="text-zinc-400">Toggle switch supported. Voice accent matches the selected interface language (ID, EN, MS).</p>
            </div>
          </div>
        </div>

        {/* Concurrency & Batch Limits */}
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-5">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Cpu className="h-4 w-4 text-emerald-400" />
            <span>Concurrency & Limits</span>
          </h3>
          <div className="mt-4 space-y-3 text-xs leading-relaxed text-zinc-300">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <span className="font-semibold text-emerald-400">10 Videos Batch Limit</span>
              <p className="mt-0.5 text-zinc-400">
                Axcel currently accepts up to 10 video generation requests queued at once per batch. The extension enforces this limit and safely buffers any remaining scenes.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <span className="font-semibold text-blue-400">2 Simultaneous Generations</span>
              <p className="mt-0.5 text-zinc-400">
                Axcel Studio processes a maximum of 2 concurrent render jobs simultaneously. The extension runs dual worker slots (Worker 1 and Worker 2) and dispatches the next video as soon as any slot frees up.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <span className="font-semibold text-purple-400">Direct Auto-Download</span>
              <p className="mt-0.5 text-zinc-400">
                Upon completion, the extension detects the MP4 URL and triggers Chrome's download API, saving each file to <code>axcel_videos/01_Scene_Title.mp4</code>.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Auto-Retry & Error Handling Guide */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-400" />
          <span>Error Detection & Auto-Retry Handling</span>
        </h3>
        <p className="mt-1 text-xs text-zinc-400">
          The content script actively intercepts Axcel's Angular notices and rate limits:
        </p>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3 text-xs">
          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <code className="text-amber-400 text-[11px] block font-mono">
              "Masih ada video lain yang sedang disiapkan"
            </code>
            <p className="mt-1.5 text-zinc-400">
              <b>Cause:</b> Concurrency ceiling hit on Axcel backend.<br />
              <b>Resolution:</b> The extension automatically waits 8 seconds and re-attempts the trigger button.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <code className="text-red-400 text-[11px] block font-mono">
              "Gagal menyiapkan video. Coba lagi."
            </code>
            <p className="mt-1.5 text-zinc-400">
              <b>Cause:</b> Transient GPU render failure or timeout.<br />
              <b>Resolution:</b> Auto-retries the scene up to 3 times before recording it as a failed job.
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <code className="text-blue-400 text-[11px] block font-mono">
              "Generate dijeda sementara"
            </code>
            <p className="mt-1.5 text-zinc-400">
              <b>Cause:</b> Account quota or cooling period.<br />
              <b>Resolution:</b> Pauses the queue and notifies user in the in-page widget with the resumption time.
            </p>
          </div>
        </div>
      </div>

      {/* Markdown Document Formatting Guide */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 p-6">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <FileCode className="h-4 w-4 text-indigo-400" />
          <span>Markdown Script Formatting Guide</span>
        </h3>
        <p className="mt-1 text-xs text-zinc-400">
          You can format your <code>.md</code>, <code>.doc</code>, or <code>.txt</code> files with custom tags:
        </p>

        <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 p-4 font-mono text-xs text-zinc-300">
          <pre>{`# Scene 1: Arrival on Mars
[16:9, 10s, 1080p, audio]
A massive crimson spacecraft lands gracefully on red Martian dust with retro-thrusters firing in 8k cinematic lighting.

# Scene 2: Hydroponic Colony
[9:16, 8s, 720p]
Inside a glass geodesic dome, lush glowing plants flourish under artificial violet sunlight.`}</pre>
        </div>
      </div>
    </div>
  );
};
