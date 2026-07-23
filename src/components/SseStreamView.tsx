import React, { useState, useRef, useEffect } from 'react';
import {
  Radio,
  Play,
  Pause,
  Trash2,
  Copy,
  Check,
  Search,
  Filter,
  Terminal,
  Activity,
  Zap,
} from 'lucide-react';
import { SSEKernelEvent } from '../types/kernel';

interface SseStreamViewProps {
  logs: SSEKernelEvent[];
  isDark: boolean;
  onClearLogs: () => void;
  isPaused: boolean;
  setIsPaused: (paused: boolean) => void;
}

export const SseStreamView: React.FC<SseStreamViewProps> = ({
  logs,
  isDark,
  onClearLogs,
  isPaused,
  setIsPaused,
}) => {
  const [filterQuery, setFilterQuery] = useState('');
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // Auto scroll down unless user explicitly scrolled
  useEffect(() => {
    if (!isPaused && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs, isPaused]);

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const filteredLogs = logs.filter(
    (l) =>
      l.event_id.toLowerCase().includes(filterQuery.toLowerCase()) ||
      l.event_type.toLowerCase().includes(filterQuery.toLowerCase()) ||
      l.aggregate_id.toLowerCase().includes(filterQuery.toLowerCase()) ||
      l.aggregate_type.toLowerCase().includes(filterQuery.toLowerCase())
  );

  return (
    <div id="sse-stream-view" className="p-4 sm:p-6 space-y-4 font-mono h-full flex flex-col">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800/60 shrink-0">
        <div>
          <h1
            className={`text-lg font-bold flex items-center space-x-2 ${
              isDark ? 'text-slate-100' : 'text-slate-900'
            }`}
          >
            <Radio className="w-5 h-5 text-emerald-400 animate-pulse" />
            <span>SSE Event Stream Log (<code className="text-emerald-400">pg_notify kernel_transition_committed</code>)</span>
          </h1>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Real-time server-sent events stream over <code className="text-cyan-400">/api/kernel/events/stream</code>
          </p>
        </div>

        {/* STREAM CONTROLS */}
        <div className="flex items-center space-x-2 text-xs">
          <button
            onClick={() => setIsPaused(!isPaused)}
            className={`px-3 py-1.5 rounded font-bold flex items-center space-x-1.5 transition-all ${
              isPaused
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
            }`}
          >
            {isPaused ? (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>RESUME STREAM</span>
              </>
            ) : (
              <>
                <Pause className="w-3.5 h-3.5 fill-current" />
                <span>PAUSE STREAM</span>
              </>
            )}
          </button>

          <button
            onClick={onClearLogs}
            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
            title="Clear Stream Console"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="flex items-center space-x-3 text-xs shrink-0">
        <div
          className={`flex-1 flex items-center px-3 py-1.5 rounded border ${
            isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
          }`}
        >
          <Search className="w-3.5 h-3.5 text-slate-400 mr-2" />
          <input
            type="text"
            value={filterQuery}
            onChange={(e) => setFilterQuery(e.target.value)}
            placeholder="Filter real-time SSE stream log..."
            className="w-full bg-transparent outline-none font-mono text-xs"
          />
        </div>

        <span className="text-slate-400 font-bold">
          {filteredLogs.length} / {logs.length} Event(s)
        </span>
      </div>

      {/* SSE LOG TERMINAL CONSOLE */}
      <div
        ref={logContainerRef}
        className={`flex-1 rounded-lg border p-4 overflow-y-auto space-y-2 font-mono text-xs min-h-[380px] max-h-[560px] ${
          isDark ? 'bg-slate-950 border-slate-800 text-slate-200' : 'bg-slate-900 border-slate-800 text-slate-100'
        }`}
      >
        {filteredLogs.length === 0 ? (
          <div className="p-12 text-center text-slate-500 italic">
            Waiting for live kernel transition events from SSE stream...
          </div>
        ) : (
          filteredLogs.map((log, idx) => (
            <div
              key={log.event_id + idx}
              className="p-2.5 rounded bg-slate-900/90 border border-slate-800/80 hover:border-slate-700 flex flex-col space-y-1.5 transition-colors"
            >
              <div className="flex items-center justify-between text-[11px]">
                <div className="flex items-center space-x-2">
                  <span className="text-emerald-400 font-bold">#{logs.length - idx}</span>
                  <span className="text-cyan-300 font-bold">event: kernel_event</span>
                  <span className="text-amber-400 font-bold">[{log.event_id}]</span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-bold text-[10px]">
                    {log.event_type}
                  </span>
                  <span className="text-purple-300 font-bold">{log.aggregate_type}</span>
                  <span className="text-slate-400">({log.aggregate_id})</span>
                </div>

                <div className="flex items-center space-x-3 text-slate-400 text-[10px]">
                  <span>Lag: <strong className="text-amber-400">{log.propagation_lag_ms}ms</strong></span>
                  <span>{new Date(log.committed_at).toLocaleTimeString()}</span>
                  <button
                    onClick={() => handleCopy(JSON.stringify(log, null, 2), idx)}
                    className="text-cyan-400 hover:underline flex items-center space-x-1"
                  >
                    {copiedIdx === idx ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>Copy</span>
                  </button>
                </div>
              </div>

              <pre className="p-2 rounded bg-slate-950 border border-slate-800/80 text-emerald-400 text-[11px] overflow-x-auto">
                {JSON.stringify(log.payload, null, 2)}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
