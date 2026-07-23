import React, { useState, useEffect } from 'react';
import {
  Boxes,
  Filter,
  Search,
  Clock,
  Layers,
  FileJson,
  RefreshCw,
  Copy,
  Check,
} from 'lucide-react';
import { AggregateEvent, TransitionEvent } from '../types/kernel';
import { kernelApiClient } from '../services/kernelApiClient';

interface AggregateExplorerViewProps {
  allEvents: TransitionEvent[];
  isDark: boolean;
}

export const AggregateExplorerView: React.FC<AggregateExplorerViewProps> = ({
  allEvents,
  isDark,
}) => {
  const [aggregateType, setAggregateType] = useState('ORDER');
  const [aggregateId, setAggregateId] = useState('ord_8841');
  const [aggregateEvents, setAggregateEvents] = useState<AggregateEvent[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    fetchAggregateEvents();
  }, [aggregateType, aggregateId]);

  const fetchAggregateEvents = async () => {
    setIsLoading(true);
    try {
      const data = await kernelApiClient.getAggregateEvents(aggregateType, aggregateId);
      setAggregateEvents(data);
    } catch (err) {
      console.error('Failed to fetch aggregate events:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 1500);
  };

  return (
    <div id="aggregate-explorer-view" className="p-4 sm:p-6 space-y-6 font-mono">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800/60">
        <div>
          <h1
            className={`text-lg font-bold flex items-center space-x-2 ${
              isDark ? 'text-slate-100' : 'text-slate-900'
            }`}
          >
            <Boxes className="w-5 h-5 text-purple-400" />
            <span>Aggregate Event Timeline (<code className="text-purple-400">kernel.v_aggregate_events</code>)</span>
          </h1>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Inspect complete state evolution ordered by sequence LSN per domain aggregate entity
          </p>
        </div>

        {/* AGGREGATE TARGET SELECTOR */}
        <div className="flex items-center space-x-2 text-xs">
          <select
            value={aggregateType}
            onChange={(e) => setAggregateType(e.target.value)}
            className={`p-2 rounded border outline-none font-mono ${
              isDark ? 'bg-slate-900 border-slate-700 text-purple-300' : 'bg-white border-slate-300 text-purple-800'
            }`}
          >
            <option value="ORDER">ORDER</option>
            <option value="ACCOUNT">ACCOUNT</option>
            <option value="POLICY_ENGINE">POLICY_ENGINE</option>
            <option value="PIPELINE">PIPELINE</option>
            <option value="SYSTEM">SYSTEM</option>
          </select>

          <input
            type="text"
            value={aggregateId}
            onChange={(e) => setAggregateId(e.target.value)}
            placeholder="Aggregate ID (e.g. ord_8841)"
            className={`p-2 rounded border outline-none font-mono ${
              isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
            }`}
          />

          <button
            onClick={fetchAggregateEvents}
            className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-purple-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* EVENT TIMELINE LIST */}
      <div
        className={`rounded-lg border p-4 space-y-4 transition-all ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 text-xs font-bold">
          <span className="text-purple-400 uppercase tracking-wider">
            {aggregateType} / {aggregateId} EVENT STREAM ({aggregateEvents.length} Events)
          </span>
          <span className="text-slate-400 text-[11px]">Ordered by commit timestamp</span>
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-purple-400" />
            <span>Querying kernel.v_aggregate_events...</span>
          </div>
        ) : aggregateEvents.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No events found for aggregate '{aggregateType}/{aggregateId}'.
          </div>
        ) : (
          <div className="space-y-3">
            {aggregateEvents.map((evt, idx) => (
              <div
                key={evt.event_id + idx}
                className={`p-3.5 rounded-lg border font-mono transition-all ${
                  isDark ? 'bg-slate-950 border-slate-800 hover:border-purple-500/40' : 'bg-slate-50 border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 font-bold text-[10px] border border-purple-800">
                      Seq #{evt.sequence_number}
                    </span>
                    <span className="text-cyan-400 font-bold">{evt.event_id}</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-bold text-[10px]">
                      {evt.event_type}
                    </span>
                  </div>

                  <span className="text-slate-400 text-[11px]">
                    {new Date(evt.committed_at).toLocaleString()}
                  </span>
                </div>

                <div className="mt-2 text-xs">
                  <div className="flex justify-between items-center text-[10px] text-slate-400 mb-1">
                    <span>PAYLOAD SNAPSHOT</span>
                    <button
                      onClick={() => handleCopy(JSON.stringify(evt.payload, null, 2))}
                      className="text-cyan-400 hover:underline flex items-center space-x-1"
                    >
                      {copiedId === evt.event_id ? (
                        <Check className="w-3 h-3 text-emerald-400" />
                      ) : (
                        <Copy className="w-3 h-3" />
                      )}
                      <span>Copy JSON</span>
                    </button>
                  </div>
                  <pre className="p-2.5 rounded bg-slate-900 border border-slate-800 text-emerald-400 text-[11px] overflow-x-auto">
                    {JSON.stringify(evt.payload, null, 2)}
                  </pre>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
