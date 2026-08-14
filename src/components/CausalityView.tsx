import React, { useState, useEffect } from 'react';
import {
  GitCommit,
  ArrowDown,
  Layers,
  Clock,
  Search,
  Receipt,
  FileCode,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import { CausalityNode, TransitionEvent, ActiveTab } from '../types/kernel';
import { kernelApiClient } from '../services/kernelApiClient';

interface CausalityViewProps {
  selectedEventId: string;
  allEvents: TransitionEvent[];
  isDark: boolean;
  onIssueReceipt: (eventId: string) => void;
  setActiveTab: (tab: ActiveTab) => void;
}

export const CausalityView: React.FC<CausalityViewProps> = ({
  selectedEventId,
  allEvents,
  isDark,
  onIssueReceipt,
  setActiveTab,
}) => {
  const [activeEventId, setActiveEventId] = useState(selectedEventId || allEvents[0]?.event_id || 'evt_9001');
  const [nodes, setNodes] = useState<CausalityNode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [inspectedNode, setInspectedNode] = useState<CausalityNode | null>(null);

  useEffect(() => {
    if (selectedEventId) {
      setActiveEventId(selectedEventId);
    }
  }, [selectedEventId]);

  useEffect(() => {
    fetchCausality();
  }, [activeEventId]);

  const fetchCausality = async () => {
    if (!activeEventId) return;
    setIsLoading(true);
    try {
      const data = await kernelApiClient.getCausalityChain(activeEventId);
      setNodes(data);
      if (data.length > 0) setInspectedNode(data[0]);
    } catch (err) {
      console.error('Failed to fetch causality chain:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="causality-chain-view" className="p-4 sm:p-6 space-y-6 font-mono">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800/60">
        <div>
          <h1
            className={`text-lg font-bold flex items-center space-x-2 ${
              isDark ? 'text-slate-100' : 'text-slate-900'
            }`}
          >
            <GitCommit className="w-5 h-5 text-cyan-400" />
            <span>Causality Chain (<code className="text-cyan-400">kernel.v_causality_chain</code>)</span>
          </h1>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Causality tree lineage scoped via PostgreSQL array containment <code className="text-purple-400">path @&gt; [event_id]</code>
          </p>
        </div>

        {/* SELECT EVENT SELECTOR */}
        <div className="flex items-center space-x-2 text-sm">
          <label className="text-slate-400 font-bold">Target Event:</label>
          <select
            value={activeEventId}
            onChange={(e) => setActiveEventId(e.target.value)}
            className={`p-2 rounded border outline-none font-mono text-sm font-bold ${
              isDark ? 'bg-slate-900 border-slate-700 text-cyan-300' : 'bg-white border-slate-300 text-cyan-800'
            }`}
          >
            {allEvents.map((e) => (
              <option key={e.event_id} value={e.event_id}>
                {e.event_id} - {e.event_type}
              </option>
            ))}
          </select>
          <button
            onClick={fetchCausality}
            className="p-2 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
            title="Refresh Causality Tree"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: VISUAL CAUSALITY TREE GRAPH (7 COLS) */}
        <div
          className={`lg:col-span-7 rounded-lg border p-4 space-y-4 transition-all ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 text-sm">
            <span className="font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-1.5">
              <Layers className="w-4 h-4" />
              <span>CAUSALITY LINEAGE TREE ({nodes.length} Nodes)</span>
            </span>
            <span className="text-slate-500 text-[11px]">Top = Earliest Parent / Bottom = Derived Event</span>
          </div>

          {isLoading ? (
            <div className="p-12 text-center text-slate-400 font-mono flex flex-col items-center justify-center space-y-2">
              <RefreshCw className="w-6 h-6 animate-spin text-cyan-400" />
              <span>Constructing kernel.v_causality_chain...</span>
            </div>
          ) : nodes.length === 0 ? (
            <div className="p-8 text-center text-slate-500 font-mono">
              No causality chain nodes found for event '{activeEventId}'.
            </div>
          ) : (
            <div className="relative py-2 space-y-4">
              {nodes.map((node, index) => {
                const isTarget = node.event_id === activeEventId;
                const isInspected = inspectedNode?.event_id === node.event_id;

                return (
                  <div key={node.event_id} className="relative flex flex-col items-start">
                    {/* CONNECTOR ARROW */}
                    {index > 0 && (
                      <div className="ml-5 my-1.5 flex items-center space-x-2 text-slate-500">
                        <div className="w-0.5 h-6 bg-slate-700 mx-auto" />
                        <span className="text-[10px] text-cyan-500 font-bold uppercase">
                          → CAUSES NEXT TRANSITION
                        </span>
                      </div>
                    )}

                    <div
                      onClick={() => setInspectedNode(node)}
                      className={`w-full p-3.5 rounded-lg border font-mono transition-all cursor-pointer ${
                        isTarget
                          ? 'bg-cyan-950/80 border-cyan-500 text-cyan-200 ring-2 ring-cyan-500/30'
                          : isInspected
                          ? 'bg-slate-800/90 border-slate-600 text-slate-100'
                          : isDark
                          ? 'bg-slate-950/70 border-slate-800 hover:border-slate-700 text-slate-300'
                          : 'bg-slate-50 border-slate-300 hover:border-slate-400 text-slate-800'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <GitCommit className="w-4 h-4 text-cyan-400 shrink-0" />
                          <span className="font-bold text-sm text-cyan-300">{node.event_id}</span>
                          <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-[10px] text-slate-200 font-bold">
                            {node.event_type}
                          </span>
                          {isTarget && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-bold">
                              FOCUS NODE
                            </span>
                          )}
                        </div>

                        <span className="text-[10px] text-slate-400">
                          Depth: {node.depth}
                        </span>
                      </div>

                      <div className="mt-2 text-[11px] flex items-center justify-between text-slate-400">
                        <div>
                          Aggregate: <span className="text-purple-300 font-bold">{node.aggregate_type}</span> ({node.aggregate_id})
                        </div>
                        <div className="text-[10px]">
                          Committed: {new Date(node.committed_at).toLocaleTimeString()}
                        </div>
                      </div>

                      <div className="mt-2 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px]">
                        <span className="text-slate-500 truncate max-w-[280px]">
                          Path: [{node.path.join(' → ')}]
                        </span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onIssueReceipt(node.event_id);
                            setActiveTab('receipts');
                          }}
                          className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 hover:bg-emerald-900 font-bold flex items-center space-x-1"
                        >
                          <Receipt className="w-3 h-3" />
                          <span>Issue Receipt</span>
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: INSPECTED NODE DETAILS (5 COLS) */}
        <div
          className={`lg:col-span-5 rounded-lg border p-4 space-y-4 transition-all ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 text-sm">
            <span className="font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
              <FileCode className="w-4 h-4" />
              <span>NODE CAUSALITY METADATA</span>
            </span>
          </div>

          {inspectedNode ? (
            <div className="space-y-4 text-sm font-mono">
              <div className="p-3 rounded bg-slate-950/80 border border-slate-800 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">Event ID:</span>
                  <span className="text-cyan-300 font-bold">{inspectedNode.event_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Parent ID:</span>
                  <span className="text-amber-400 font-bold">{inspectedNode.parent_id || 'NULL (ROOT)'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Event Type:</span>
                  <span className="text-emerald-300">{inspectedNode.event_type}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Aggregate Entity:</span>
                  <span className="text-purple-300">
                    {inspectedNode.aggregate_type} ({inspectedNode.aggregate_id})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Depth in Chain:</span>
                  <span className="text-slate-200">{inspectedNode.depth}</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 font-bold text-[11px] block mb-1">PAYLOAD SUMMARY</span>
                <pre className="p-3 rounded bg-slate-950 border border-slate-800 text-emerald-400 text-[11px] overflow-x-auto">
                  {inspectedNode.payload_summary}
                </pre>
              </div>

              <div className="p-3 rounded bg-cyan-950/40 border border-cyan-800/60 text-cyan-200 text-[11px] space-y-1">
                <div className="font-bold flex items-center space-x-1">
                  <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Causality Monotonicity Verified</span>
                </div>
                <p className="text-slate-400 text-[10px] leading-relaxed">
                  PostgreSQL Semantic Kernel invariant <code className="text-cyan-300">sys_invariant_causality_monotonicity</code> guarantees
                  that timestamps and array indices are strictly monotonically increasing along the causality chain.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-slate-500">
              Select a node in the causality tree to inspect metadata.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
