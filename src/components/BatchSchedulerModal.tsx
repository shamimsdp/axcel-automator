import React, { useState } from 'react';
import {
  CalendarClock,
  Clock,
  Moon,
  Sunrise,
  Sparkles,
  X,
  CheckCircle2,
  AlertCircle,
  Film,
  Zap,
} from 'lucide-react';
import { PromptItem } from '../types';

interface BatchSchedulerModalProps {
  isOpen: boolean;
  onClose: () => void;
  prompts: PromptItem[];
  onSchedule: (scheduledTimestamp: number, label: string, batchName: string) => void;
  existingScheduleCount: number;
}

export const BatchSchedulerModal: React.FC<BatchSchedulerModalProps> = ({
  isOpen,
  onClose,
  prompts,
  onSchedule,
  existingScheduleCount,
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('tonight_2am');
  const [customDateTime, setCustomDateTime] = useState<string>(() => {
    // Default custom to tomorrow at 2:00 AM
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(2, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [batchName, setBatchName] = useState<string>(
    `Off-Peak Batch #${existingScheduleCount + 1} (${prompts.length} videos)`
  );

  if (!isOpen) return null;

  // Calculates the target timestamp for each preset
  const getTargetTimestamp = (preset: string): { timestamp: number; label: string } => {
    const now = new Date();

    switch (preset) {
      case 'in_15m': {
        const t = now.getTime() + 15 * 60 * 1000;
        return { timestamp: t, label: 'In 15 Minutes' };
      }
      case 'in_1h': {
        const t = now.getTime() + 60 * 60 * 1000;
        return { timestamp: t, label: 'In 1 Hour' };
      }
      case 'in_3h': {
        const t = now.getTime() + 3 * 60 * 60 * 1000;
        return { timestamp: t, label: 'In 3 Hours' };
      }
      case 'tonight_2am': {
        const target = new Date();
        if (target.getHours() >= 2) {
          // If past 2am today, schedule for tomorrow 2am
          target.setDate(target.getDate() + 1);
        }
        target.setHours(2, 0, 0, 0);
        return { timestamp: target.getTime(), label: 'Tonight Off-Peak (2:00 AM)' };
      }
      case 'morning_5am': {
        const target = new Date();
        if (target.getHours() >= 5) {
          target.setDate(target.getDate() + 1);
        }
        target.setHours(5, 0, 0, 0);
        return { timestamp: target.getTime(), label: 'Early Morning (5:00 AM)' };
      }
      case 'custom': {
        const customDate = new Date(customDateTime);
        const t = isNaN(customDate.getTime()) ? Date.now() + 3600000 : customDate.getTime();
        return {
          timestamp: Math.max(Date.now() + 10000, t),
          label: `Custom: ${customDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`,
        };
      }
      default:
        return { timestamp: Date.now() + 3600000, label: 'In 1 Hour' };
    }
  };

  const handleConfirm = () => {
    const { timestamp, label } = getTargetTimestamp(selectedPreset);
    onSchedule(timestamp, label, batchName);
    onClose();
  };

  const currentSelection = getTargetTimestamp(selectedPreset);
  const diffMinutes = Math.max(1, Math.round((currentSelection.timestamp - Date.now()) / 60000));
  const diffHours = (diffMinutes / 60).toFixed(1);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-400">
              <CalendarClock className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                Schedule Off-Peak Batch
              </h3>
              <p className="text-xs text-zinc-400">
                Queue video generations to launch automatically during low-traffic hours
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Batch Overview Card */}
        <div className="mt-4 rounded-xl border border-zinc-800 bg-zinc-950/60 p-3.5 text-xs">
          <div className="flex items-center justify-between text-zinc-300">
            <span className="font-semibold flex items-center gap-1.5">
              <Film className="h-3.5 w-3.5 text-blue-400" />
              <span>Target Prompts: {prompts.length} Scenes</span>
            </span>
            <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-mono text-zinc-300">
              2 Concurrent Workers
            </span>
          </div>
          <div className="mt-2 flex flex-wrap gap-2 text-[10px] font-mono text-zinc-400">
            <span className="rounded bg-indigo-500/10 border border-indigo-500/20 px-1.5 py-0.5 text-indigo-300">
              Model: Seedance 2.5 (Default)
            </span>
            <span className="rounded bg-emerald-500/10 border border-emerald-500/20 px-1.5 py-0.5 text-emerald-300">
              Audio: ON (Default)
            </span>
            <span className="rounded bg-zinc-800 px-1.5 py-0.5 text-zinc-400">
              Auto-Download MP4s
            </span>
          </div>
        </div>

        {/* Batch Name */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-zinc-300 mb-1">
            Batch Name / Label
          </label>
          <input
            type="text"
            value={batchName}
            onChange={e => setBatchName(e.target.value)}
            className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-white outline-none focus:border-indigo-500"
            placeholder="e.g. Midnight Cyberpunk Odyssey"
          />
        </div>

        {/* Off-Peak Quick Presets */}
        <div className="mt-4">
          <label className="block text-xs font-semibold text-zinc-300 mb-2">
            Select Off-Peak Time Preset
          </label>
          <div className="grid grid-cols-2 gap-2">
            {/* Tonight 2AM */}
            <button
              type="button"
              onClick={() => setSelectedPreset('tonight_2am')}
              className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs transition ${
                selectedPreset === 'tonight_2am'
                  ? 'border-indigo-500 bg-indigo-500/15 text-white'
                  : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 text-zinc-300'
              }`}
            >
              <Moon className="h-4 w-4 text-indigo-400 shrink-0" />
              <div>
                <p className="font-semibold text-[11px]">Tonight (2:00 AM)</p>
                <p className="text-[10px] text-zinc-400">Lowest latency & zero queue</p>
              </div>
            </button>

            {/* Early Morning 5AM */}
            <button
              type="button"
              onClick={() => setSelectedPreset('morning_5am')}
              className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs transition ${
                selectedPreset === 'morning_5am'
                  ? 'border-indigo-500 bg-indigo-500/15 text-white'
                  : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 text-zinc-300'
              }`}
            >
              <Sunrise className="h-4 w-4 text-amber-400 shrink-0" />
              <div>
                <p className="font-semibold text-[11px]">Early Morning (5:00 AM)</p>
                <p className="text-[10px] text-zinc-400">Ready before work</p>
              </div>
            </button>

            {/* In 1 Hour */}
            <button
              type="button"
              onClick={() => setSelectedPreset('in_1h')}
              className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs transition ${
                selectedPreset === 'in_1h'
                  ? 'border-indigo-500 bg-indigo-500/15 text-white'
                  : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 text-zinc-300'
              }`}
            >
              <Clock className="h-4 w-4 text-blue-400 shrink-0" />
              <div>
                <p className="font-semibold text-[11px]">In 1 Hour</p>
                <p className="text-[10px] text-zinc-400">+60 min countdown</p>
              </div>
            </button>

            {/* In 3 Hours */}
            <button
              type="button"
              onClick={() => setSelectedPreset('in_3h')}
              className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs transition ${
                selectedPreset === 'in_3h'
                  ? 'border-indigo-500 bg-indigo-500/15 text-white'
                  : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 text-zinc-300'
              }`}
            >
              <Clock className="h-4 w-4 text-cyan-400 shrink-0" />
              <div>
                <p className="font-semibold text-[11px]">In 3 Hours</p>
                <p className="text-[10px] text-zinc-400">+180 min delay</p>
              </div>
            </button>

            {/* In 15 min (Quick Test) */}
            <button
              type="button"
              onClick={() => setSelectedPreset('in_15m')}
              className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs transition ${
                selectedPreset === 'in_15m'
                  ? 'border-indigo-500 bg-indigo-500/15 text-white'
                  : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 text-zinc-300'
              }`}
            >
              <Zap className="h-4 w-4 text-emerald-400 shrink-0" />
              <div>
                <p className="font-semibold text-[11px]">In 15 Minutes</p>
                <p className="text-[10px] text-zinc-400">Quick off-peak test</p>
              </div>
            </button>

            {/* Custom DateTime */}
            <button
              type="button"
              onClick={() => setSelectedPreset('custom')}
              className={`flex items-center gap-2 rounded-xl border p-2.5 text-left text-xs transition ${
                selectedPreset === 'custom'
                  ? 'border-indigo-500 bg-indigo-500/15 text-white'
                  : 'border-zinc-800 bg-zinc-950 hover:border-zinc-700 text-zinc-300'
              }`}
            >
              <CalendarClock className="h-4 w-4 text-purple-400 shrink-0" />
              <div>
                <p className="font-semibold text-[11px]">Custom Time</p>
                <p className="text-[10px] text-zinc-400">Pick date & hour</p>
              </div>
            </button>
          </div>
        </div>

        {/* Custom DateTime Input */}
        {selectedPreset === 'custom' && (
          <div className="mt-3 rounded-xl border border-zinc-800 bg-zinc-950 p-3">
            <label className="block text-[11px] text-zinc-400 mb-1">
              Set Exact Date & Time:
            </label>
            <input
              type="datetime-local"
              value={customDateTime}
              onChange={e => setCustomDateTime(e.target.value)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-white outline-none"
            />
          </div>
        )}

        {/* Schedule Summary Banner */}
        <div className="mt-4 flex items-center justify-between rounded-xl border border-indigo-500/20 bg-indigo-950/20 px-3.5 py-2.5 text-xs text-indigo-300">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-indigo-400 shrink-0" />
            <span>
              Runs at <b>{new Date(currentSelection.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</b>
              {' '}(in ~{diffHours} hrs)
            </span>
          </div>
          <span className="font-mono text-[10px] text-indigo-400 uppercase">
            Auto-Start
          </span>
        </div>

        {/* Footer Actions */}
        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-indigo-600/20 hover:bg-indigo-500 active:scale-95 transition"
          >
            <CalendarClock className="h-3.5 w-3.5" />
            <span>Schedule Batch</span>
          </button>
        </div>
      </div>
    </div>
  );
};
