import React, { useState } from 'react';
import {
  FileText,
  Upload,
  Sparkles,
  Plus,
  Trash2,
  Copy,
  Check,
  Download,
  AlertCircle,
  Play,
  RotateCcw,
  Sliders,
  Volume2,
  VolumeX,
  Loader2,
} from 'lucide-react';
import { PromptItem, AspectRatio, VideoDuration, VideoResolution } from '../types';
import { parseMarkdownToPrompts, exportPromptsToMarkdown } from '../utils/markdownParser';
import { SAMPLE_SCRIPTS } from '../utils/sampleData';
import { readDocumentFile } from '../utils/fileReader';

interface DocumentStudioProps {
  prompts: PromptItem[];
  onPromptsChange: (prompts: PromptItem[]) => void;
  onSendToSimulator: (prompts: PromptItem[]) => void;
}

export const DocumentStudio: React.FC<DocumentStudioProps> = ({
  prompts,
  onPromptsChange,
  onSendToSimulator,
}) => {
  const [rawText, setRawText] = useState<string>(() =>
    prompts.length > 0 ? exportPromptsToMarkdown(prompts) : SAMPLE_SCRIPTS[0].content
  );
  const [selectedPreset, setSelectedPreset] = useState<string>(SAMPLE_SCRIPTS[0].id);
  const [copied, setCopied] = useState<boolean>(false);
  const [dragOver, setDragOver] = useState<boolean>(false);
  const [isParsing, setIsParsing] = useState<boolean>(false);

  const handleTextChange = (text: string) => {
    setRawText(text);
    const parsed = parseMarkdownToPrompts(text);
    onPromptsChange(parsed);
  };

  const handleSelectPreset = (presetId: string) => {
    const preset = SAMPLE_SCRIPTS.find(p => p.id === presetId);
    if (!preset) return;
    setSelectedPreset(presetId);
    setRawText(preset.content);
    const parsed = parseMarkdownToPrompts(preset.content);
    onPromptsChange(parsed);
  };

  const handleFileUpload = async (file: File) => {
    try {
      setIsParsing(true);
      const content = await readDocumentFile(file);
      handleTextChange(content);
    } catch (err: any) {
      console.error('Failed to parse uploaded document:', err);
      handleTextChange(`# Error Reading Document\n\nCould not extract text: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsParsing(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleUpdatePrompt = (id: string, updates: Partial<PromptItem>) => {
    const updated = prompts.map(p => (p.id === id ? { ...p, ...updates } : p));
    onPromptsChange(updated);
    setRawText(exportPromptsToMarkdown(updated));
  };

  const handleDeletePrompt = (id: string) => {
    const updated = prompts
      .filter(p => p.id !== id)
      .map((p, idx) => ({ ...p, index: idx + 1 }));
    onPromptsChange(updated);
    setRawText(exportPromptsToMarkdown(updated));
  };

  const handleAddPrompt = () => {
    const newIndex = prompts.length + 1;
    const newItem: PromptItem = {
      id: `prompt-${newIndex}-${Date.now()}`,
      index: newIndex,
      title: `Scene ${newIndex}: New Video`,
      prompt: 'A cinematic drone shot flying over a scenic destination with soft golden hour lighting.',
      duration: '5s',
      resolution: '720p',
      aspectRatio: '16:9',
      generateAudio: false,
      charCount: 95,
    };
    const updated = [...prompts, newItem];
    onPromptsChange(updated);
    setRawText(exportPromptsToMarkdown(updated));
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(rawText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const blob = new Blob([rawText], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'axcel_batch_prompts.md';
    a.click();
    URL.revokeObjectURL(url);
  };

  const isOverBatchLimit = prompts.length > 10;

  return (
    <div className="space-y-6">
      {/* Top Banner & Preset Selector */}
      <div className="flex flex-col gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="h-5 w-5 text-blue-400" />
            <span>Document & Script Studio</span>
          </h2>
          <p className="mt-1 text-xs text-zinc-400">
            Write or upload your Markdown (.md), Word (.doc/.docx), or Text script. Axcel processes batches of up to 10 videos.
          </p>
        </div>

        {/* Preset Picker */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-zinc-400">Load Template:</span>
          {SAMPLE_SCRIPTS.map(s => (
            <button
              key={s.id}
              onClick={() => handleSelectPreset(s.id)}
              className={`rounded-lg px-2.5 py-1.5 text-xs font-medium transition ${
                selectedPreset === s.id
                  ? 'bg-blue-600 text-white'
                  : 'border border-zinc-800 bg-zinc-900 text-zinc-300 hover:border-zinc-700 hover:text-white'
              }`}
            >
              {s.name.split(' (')[0]} ({s.itemCount})
            </button>
          ))}
        </div>
      </div>

      {/* Batch Capacity Notice */}
      <div className={`flex items-center justify-between rounded-xl border px-4 py-3 text-xs ${
        isOverBatchLimit
          ? 'border-amber-500/40 bg-amber-500/10 text-amber-300'
          : 'border-zinc-800 bg-zinc-900/60 text-zinc-300'
      }`}>
        <div className="flex items-center gap-2.5">
          <AlertCircle className={`h-4 w-4 shrink-0 ${isOverBatchLimit ? 'text-amber-400' : 'text-blue-400'}`} />
          <span>
            <b>Axcel Batch Capacity:</b> Currently supporting <b>10 videos per batch</b> with <b>2 simultaneous generations</b>.
            {isOverBatchLimit && (
              <span className="ml-1 text-amber-200">
                You have {prompts.length} prompts. The first 10 will run in this batch.
              </span>
            )}
          </span>
        </div>
        <div className="flex items-center gap-2 font-mono font-semibold">
          <span className={prompts.length > 10 ? 'text-amber-400' : 'text-emerald-400'}>
            {prompts.length} / 10
          </span>
          <span className="text-zinc-500">prompts</span>
        </div>
      </div>

      {/* Grid Layout: Left = Raw Markdown Editor / Drag & Drop, Right = Parsed Cards */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Left Column: Markdown Input (5 cols) */}
        <div className="flex flex-col space-y-3 lg:col-span-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Script Source (.md / .doc)
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={handleCopyMarkdown}
                className="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-400 hover:text-white"
                title="Copy markdown text"
              >
                {copied ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Copied' : 'Copy'}</span>
              </button>
              <button
                onClick={handleDownloadMarkdown}
                className="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-400 hover:text-white"
                title="Save .md file"
              >
                <Download className="h-3 w-3" />
                <span>Save</span>
              </button>
            </div>
          </div>

          {/* Drag & Drop Zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            className={`flex flex-col items-center justify-center rounded-xl border border-dashed p-4 text-center transition ${
              dragOver
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-zinc-800 bg-zinc-900/40 hover:border-zinc-700'
            }`}
          >
            {isParsing ? (
              <div className="flex flex-col items-center py-2 text-zinc-300">
                <Loader2 className="h-6 w-6 animate-spin text-blue-400 mb-1" />
                <span className="text-xs font-medium">Extracting document text from Word/Markdown...</span>
              </div>
            ) : (
              <>
                <Upload className="h-5 w-5 text-zinc-400" />
                <p className="mt-1 text-xs font-medium text-zinc-300">
                  Drag & drop your <span className="text-blue-400">.docx</span>, <span className="text-blue-400">.doc</span>, or <span className="text-blue-400">.md</span> file
                </p>
                <label className="mt-2 inline-flex cursor-pointer items-center rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-1 text-xs font-medium text-zinc-200 hover:bg-zinc-700">
                  <span>Browse file</span>
                  <input
                    type="file"
                    accept=".docx,.doc,.md,.txt"
                    className="hidden"
                    onChange={e => e.target.files?.[0] && handleFileUpload(e.target.files[0])}
                  />
                </label>
              </>
            )}
          </div>

          {/* Raw Textarea */}
          <div className="relative flex-1">
            <textarea
              value={rawText}
              onChange={e => handleTextChange(e.target.value)}
              placeholder="# Scene 1: Introduction&#10;[16:9, 10s, 1080p, audio]&#10;Describe your video prompt here..."
              rows={16}
              className="w-full resize-y rounded-xl border border-zinc-800 bg-zinc-950 p-3.5 font-mono text-xs leading-relaxed text-zinc-200 outline-none transition focus:border-blue-500 placeholder:text-zinc-600"
            />
          </div>
        </div>

        {/* Right Column: Parsed Prompt Items (7 cols) */}
        <div className="flex flex-col space-y-3 lg:col-span-7">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Parsed Video Scenes ({prompts.length})
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleAddPrompt}
                className="flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs font-medium text-zinc-300 transition hover:border-zinc-700 hover:text-white"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Add Scene</span>
              </button>
              <button
                onClick={() => onSendToSimulator(prompts)}
                disabled={prompts.length === 0}
                className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-500 active:scale-95 disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Run Simulator</span>
              </button>
            </div>
          </div>

          {/* Cards List */}
          <div className="space-y-3 max-h-[640px] overflow-y-auto pr-1">
            {prompts.length === 0 ? (
              <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-12 text-center text-zinc-500">
                <FileText className="mx-auto h-8 w-8 text-zinc-600 mb-2" />
                <p className="text-sm font-medium">No video scenes detected</p>
                <p className="text-xs text-zinc-500 mt-1">
                  Upload a script or choose a sample template on top.
                </p>
              </div>
            ) : (
              prompts.map((p, idx) => (
                <div
                  key={p.id}
                  className={`rounded-xl border p-4 transition ${
                    idx < 10
                      ? 'border-zinc-800 bg-zinc-900/70 hover:border-zinc-700'
                      : 'border-zinc-800/60 bg-zinc-950/40 opacity-70'
                  }`}
                >
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-zinc-800 font-mono text-[10px] font-bold text-blue-400">
                        {p.index}
                      </span>
                      <input
                        type="text"
                        value={p.title}
                        onChange={e => handleUpdatePrompt(p.id, { title: e.target.value })}
                        className="bg-transparent font-semibold text-xs text-zinc-200 outline-none border-b border-transparent focus:border-blue-500"
                        placeholder="Scene Title"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-zinc-400">
                        {p.prompt.length} chars
                      </span>
                      <button
                        onClick={() => handleDeletePrompt(p.id)}
                        className="rounded p-1 text-zinc-400 transition hover:bg-zinc-800 hover:text-red-400"
                        title="Delete Scene"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Prompt Textarea */}
                  <div className="mt-2.5">
                    <textarea
                      value={p.prompt}
                      onChange={e =>
                        handleUpdatePrompt(p.id, {
                          prompt: e.target.value,
                          charCount: e.target.value.length,
                        })
                      }
                      rows={2}
                      className="w-full resize-none rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-xs leading-relaxed text-zinc-300 outline-none focus:border-zinc-600"
                      placeholder="Prompt description..."
                    />
                  </div>

                  {/* Parameter Controls (duration, resolution, ratio, audio) */}
                  <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                    {/* Duration Select */}
                    <div className="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1">
                      <span className="text-[10px] text-zinc-400">Duration:</span>
                      <select
                        value={p.duration}
                        onChange={e =>
                          handleUpdatePrompt(p.id, { duration: e.target.value as VideoDuration })
                        }
                        className="bg-transparent text-zinc-200 outline-none cursor-pointer"
                      >
                        <option value="5s" className="bg-zinc-900">5s</option>
                        <option value="8s" className="bg-zinc-900">8s</option>
                        <option value="10s" className="bg-zinc-900">10s</option>
                        <option value="12s" className="bg-zinc-900">12s</option>
                        <option value="15s" className="bg-zinc-900">15s</option>
                      </select>
                    </div>

                    {/* Resolution Select */}
                    <div className="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1">
                      <span className="text-[10px] text-zinc-400">Res:</span>
                      <select
                        value={p.resolution}
                        onChange={e =>
                          handleUpdatePrompt(p.id, { resolution: e.target.value as VideoResolution })
                        }
                        className="bg-transparent text-zinc-200 outline-none cursor-pointer"
                      >
                        <option value="480p" className="bg-zinc-900">480p</option>
                        <option value="720p" className="bg-zinc-900">720p</option>
                        <option value="1080p" className="bg-zinc-900">1080p</option>
                      </select>
                    </div>

                    {/* Aspect Ratio Select */}
                    <div className="flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-950 px-2 py-1">
                      <span className="text-[10px] text-zinc-400">Ratio:</span>
                      <select
                        value={p.aspectRatio}
                        onChange={e =>
                          handleUpdatePrompt(p.id, { aspectRatio: e.target.value as AspectRatio })
                        }
                        className="bg-transparent text-zinc-200 outline-none cursor-pointer"
                      >
                        <option value="16:9" className="bg-zinc-900">16:9</option>
                        <option value="9:16" className="bg-zinc-900">9:16</option>
                        <option value="1:1" className="bg-zinc-900">1:1</option>
                        <option value="3:4" className="bg-zinc-900">3:4</option>
                        <option value="4:3" className="bg-zinc-900">4:3</option>
                        <option value="21:9" className="bg-zinc-900">21:9</option>
                      </select>
                    </div>

                    {/* Audio Toggle */}
                    <button
                      onClick={() => handleUpdatePrompt(p.id, { generateAudio: !p.generateAudio })}
                      className={`flex items-center gap-1 rounded-md border px-2 py-1 transition ${
                        p.generateAudio
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
                          : 'border-zinc-800 bg-zinc-950 text-zinc-400 hover:text-zinc-200'
                      }`}
                    >
                      {p.generateAudio ? <Volume2 className="h-3 w-3" /> : <VolumeX className="h-3 w-3" />}
                      <span>{p.generateAudio ? 'Audio ON' : 'Audio OFF'}</span>
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
