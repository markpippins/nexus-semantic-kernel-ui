import React, { useState } from 'react';
import {
  Zap,
  Play,
  Plus,
  Search,
  Filter,
  Copy,
  Check,
  Code,
  Layers,
  Clock,
  Send,
  RefreshCw,
  FileText,
  X,
  ChevronRight,
  GitCommit,
  Receipt,
} from 'lucide-react';
import {
  TransitionRequest,
  TransitionEvent,
  ActiveTab,
} from '../types/kernel';

interface TransitionsViewProps {
  events: TransitionEvent[];
  isDark: boolean;
  onSubmitTransition: (req: TransitionRequest) => Promise<TransitionEvent | null>;
  onSelectEventForCausality: (eventId: string) => void;
  onIssueReceipt: (eventId: string) => void;
  setActiveTab: (tab: ActiveTab) => void;
}

export const TransitionsView: React.FC<TransitionsViewProps> = ({
  events,
  isDark,
  onSubmitTransition,
  onSelectEventForCausality,
  onIssueReceipt,
  setActiveTab,
}) => {
  const [eventType, setEventType] = useState('ORDER_STATE_COMMITTED');
  const [aggregateType, setAggregateType] = useState('ORDER');
  const [aggregateId, setAggregateId] = useState('ord_' + Math.floor(1000 + Math.random() * 9000));
  const [actor, setActor] = useState('sys_architect');
  const [planNumber, setPlanNumber] = useState('PLAN-2026-001');
  const [causationId, setCausationId] = useState('');
  const [idempotencyKey, setIdempotencyKey] = useState('idemp_' + Math.random().toString(36).substring(7));
  const [payloadJson, setPayloadJson] = useState(
    JSON.stringify(
      {
        action: 'STATE_TRANSITION',
        amount: 1450.0,
        currency: 'USD',
        status: 'COMMITTED',
        verified_by: 'sys_kernel_evaluator',
      },
      null,
      2
    )
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState('ALL');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [selectedEventModal, setSelectedEventModal] = useState<TransitionEvent | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 1500);
  };

  const handleRandomizeIdemp = () => {
    setIdempotencyKey('idemp_' + Math.random().toString(36).substring(7));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    let parsedPayload: Record<string, any> = {};

    try {
      parsedPayload = JSON.parse(payloadJson);
    } catch (err) {
      setSubmitError('Invalid JSON format in payload field.');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await onSubmitTransition({
        actor: actor || 'sys_architect',
        event_type: eventType,
        aggregate_type: aggregateType,
        aggregate_id: aggregateId,
        plan_number: planNumber || undefined,
        causation_id: causationId || undefined,
        causality_parent_id: causationId || undefined,
        idempotency_key: idempotencyKey || undefined,
        payload: parsedPayload,
      });

      if (result) {
        // Prepare next default
        setAggregateId('ord_' + Math.floor(1000 + Math.random() * 9000));
        handleRandomizeIdemp();
      }
    } catch (err: any) {
      setSubmitError(err.message || 'Failed to submit transition event.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredEvents = events.filter((e) => {
    const matchesSearch =
      e.event_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.event_type.toLowerCase().includes(searchQuery.toLowerCase()) ||
      e.aggregate_id.toLowerCase().includes(searchQuery.toLowerCase());

    if (filterType === 'ALL') return matchesSearch;
    return matchesSearch && e.aggregate_type === filterType;
  });

  return (
    <div id="transitions-view" className="p-4 sm:p-6 space-y-6 font-mono">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800/60">
        <div>
          <h1
            className={`text-lg font-bold flex items-center space-x-2 ${
              isDark ? 'text-slate-100' : 'text-slate-900'
            }`}
          >
            <Zap className="w-5 h-5 text-amber-400" />
            <span>State Transitions (<code className="text-amber-400">kernel.sys_transition()</code>)</span>
          </h1>
          <p className={`text-sm mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Write surface for state transition events, idempotency checks & pg_notify commits
          </p>
        </div>

        <div className="flex items-center space-x-2 text-sm">
          <span className="px-3 py-1 rounded bg-slate-800 border border-slate-700 text-slate-300 font-bold">
            Total Events: {events.length}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: DISPATCH TRANSITION FORM (4 COLS) */}
        <div
          className={`lg:col-span-5 rounded-lg border p-4 space-y-4 transition-all ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
            <span className="font-bold text-sm uppercase tracking-wider text-amber-400 flex items-center space-x-1.5">
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>DISPATCH SYS_TRANSITION()</span>
            </span>
            <button
              onClick={handleRandomizeIdemp}
              className="text-[10px] text-cyan-400 hover:underline flex items-center space-x-1"
            >
              <RefreshCw className="w-3 h-3" />
              <span>New Idempotency Key</span>
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3 text-sm">
            {submitError && (
              <div className="p-2.5 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-[11px]">
                {submitError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 font-bold mb-1">EVENT TYPE</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className={`w-full p-2 rounded border outline-none font-mono ${
                    isDark ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-slate-100 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="ORDER_STATE_COMMITTED">ORDER_STATE_COMMITTED</option>
                  <option value="POLICY_EVALUATED">POLICY_EVALUATED</option>
                  <option value="CREDIT_RESERVED">CREDIT_RESERVED</option>
                  <option value="PAYMENT_AUTHORIZED">PAYMENT_AUTHORIZED</option>
                  <option value="PIPELINE_STAGE_STARTED">PIPELINE_STAGE_STARTED</option>
                  <option value="SYSTEM_TRANSITION_COMMITTED">SYSTEM_TRANSITION_COMMITTED</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-bold mb-1">AGGREGATE TYPE</label>
                <select
                  value={aggregateType}
                  onChange={(e) => setAggregateType(e.target.value)}
                  className={`w-full p-2 rounded border outline-none font-mono ${
                    isDark ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-slate-100 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="ORDER">ORDER</option>
                  <option value="ACCOUNT">ACCOUNT</option>
                  <option value="POLICY_ENGINE">POLICY_ENGINE</option>
                  <option value="PIPELINE">PIPELINE</option>
                  <option value="SYSTEM">SYSTEM</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 font-bold mb-1">ACTOR (REQUIRED)</label>
                <input
                  type="text"
                  value={actor}
                  onChange={(e) => setActor(e.target.value)}
                  className={`w-full p-2 rounded border outline-none font-mono ${
                    isDark ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-slate-100 border-slate-300 text-slate-900'
                  }`}
                  placeholder="e.g. sys_architect"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-bold mb-1">AGGREGATE ID</label>
                <input
                  type="text"
                  value={aggregateId}
                  onChange={(e) => setAggregateId(e.target.value)}
                  className={`w-full p-2 rounded border outline-none font-mono ${
                    isDark ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-slate-100 border-slate-300 text-slate-900'
                  }`}
                  placeholder="e.g. ord_8841"
                  required
                />
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-bold mb-1">PLAN NUMBER</label>
                <input
                  type="text"
                  value={planNumber}
                  onChange={(e) => setPlanNumber(e.target.value)}
                  className={`w-full p-2 rounded border outline-none font-mono ${
                    isDark ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-slate-100 border-slate-300 text-slate-900'
                  }`}
                  placeholder="e.g. PLAN-2026-001"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 font-bold mb-1">CAUSATION ID (PARENT)</label>
                <select
                  value={causationId}
                  onChange={(e) => setCausationId(e.target.value)}
                  className={`w-full p-2 rounded border outline-none font-mono text-[11px] ${
                    isDark ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-slate-100 border-slate-300 text-slate-900'
                  }`}
                >
                  <option value="">None (Root Event)</option>
                  {events.map((evt) => (
                    <option key={evt.event_id} value={evt.event_id}>
                      {evt.event_id} ({evt.event_type})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 font-bold mb-1">IDEMPOTENCY KEY</label>
                <input
                  type="text"
                  value={idempotencyKey}
                  onChange={(e) => setIdempotencyKey(e.target.value)}
                  className={`w-full p-2 rounded border outline-none font-mono text-[11px] ${
                    isDark ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-slate-100 border-slate-300 text-slate-900'
                  }`}
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 font-bold mb-1">EVENT PAYLOAD (JSON)</label>
              <textarea
                rows={5}
                value={payloadJson}
                onChange={(e) => setPayloadJson(e.target.value)}
                className={`w-full p-2.5 rounded border outline-none font-mono text-[11px] leading-relaxed ${
                  isDark
                    ? 'bg-slate-950 border-slate-700 text-emerald-400 focus:border-amber-400'
                    : 'bg-slate-900 border-slate-800 text-emerald-300'
                }`}
                required
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 rounded bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-black tracking-wider uppercase flex items-center justify-center space-x-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>COMMITTING TRANSITION...</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>EXECUTE SYS_TRANSITION()</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* RIGHT COLUMN: TRANSITION EVENTS TABLE (7 COLS) */}
        <div
          className={`lg:col-span-7 rounded-lg border overflow-hidden transition-all flex flex-col justify-between ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
          }`}
        >
          {/* SEARCH & FILTERS BAR */}
          <div className="p-3 border-b border-slate-800/80 flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div
              className={`flex-1 flex items-center px-3 py-1.5 rounded border text-sm ${
                isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
              }`}
            >
              <Search className="w-3.5 h-3.5 text-slate-400 mr-2 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search event ID, type, or aggregate..."
                className="w-full bg-transparent outline-none font-mono text-[11px]"
              />
            </div>

            <div className="flex items-center space-x-2 text-sm">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className={`p-1.5 rounded border outline-none font-mono text-[11px] ${
                  isDark ? 'bg-slate-950 border-slate-700 text-slate-200' : 'bg-slate-100 border-slate-300 text-slate-800'
                }`}
              >
                <option value="ALL">All Aggregates</option>
                <option value="ORDER">ORDER</option>
                <option value="ACCOUNT">ACCOUNT</option>
                <option value="POLICY_ENGINE">POLICY_ENGINE</option>
                <option value="PIPELINE">PIPELINE</option>
                <option value="SYSTEM">SYSTEM</option>
              </select>
            </div>
          </div>

          {/* EVENTS TABLE */}
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left font-mono text-sm border-collapse">
              <thead>
                <tr
                  className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                    isDark ? 'bg-slate-950/80 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                  }`}
                >
                  <th className="py-2.5 px-3">Event ID</th>
                  <th className="py-2.5 px-3">Type</th>
                  <th className="py-2.5 px-3">Aggregate</th>
                  <th className="py-2.5 px-3">Lag</th>
                  <th className="py-2.5 px-3 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/40">
                {filteredEvents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 font-mono">
                      No matching transition events found.
                    </td>
                  </tr>
                ) : (
                  filteredEvents.map((evt) => (
                    <tr
                      key={evt.event_id}
                      className={`transition-colors cursor-pointer ${
                        isDark ? 'hover:bg-slate-800/60' : 'hover:bg-slate-50'
                      }`}
                      onClick={() => setSelectedEventModal(evt)}
                    >
                      <td className="py-2.5 px-3 font-bold text-cyan-400">
                        <span>{evt.event_id}</span>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-200 font-bold text-[10px]">
                          {evt.event_type}
                        </span>
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="flex flex-col">
                          <span className="text-purple-300 text-[10px] font-bold">{evt.aggregate_type}</span>
                          <span className="text-slate-400 text-[10px]">{evt.aggregate_id}</span>
                        </div>
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="text-amber-400 text-[10px] font-bold">{evt.propagation_lag_ms}ms</span>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEventModal(evt);
                          }}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold inline-flex items-center space-x-1"
                        >
                          <FileText className="w-3 h-3" />
                          <span>JSON</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* MODAL: EVENT DETAILS & PAYLOAD VIEWER */}
      {selectedEventModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div
            className={`w-full max-w-2xl rounded-lg border shadow-2xl p-6 space-y-4 font-mono ${
              isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <span className="font-bold text-sm">
                  Transition Event Details: <code className="text-cyan-400">{selectedEventModal.event_id}</code>
                </span>
              </div>
              <button
                onClick={() => setSelectedEventModal(null)}
                className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
              <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">EVENT TYPE</span>
                <span className="font-bold text-cyan-300">{selectedEventModal.event_type}</span>
              </div>
              <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">AGGREGATE</span>
                <span className="font-bold text-purple-300">
                  {selectedEventModal.aggregate_type} ({selectedEventModal.aggregate_id})
                </span>
              </div>
              <div className="p-2 rounded bg-slate-950/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase">PROPAGATION LAG</span>
                <span className="font-bold text-amber-400">{selectedEventModal.propagation_lag_ms} ms</span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1 text-sm text-slate-400">
                <span className="font-bold uppercase">PAYLOAD JSON</span>
                <button
                  onClick={() => handleCopy(JSON.stringify(selectedEventModal.payload, null, 2))}
                  className="text-cyan-400 hover:underline flex items-center space-x-1"
                >
                  {copiedText ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                  <span>Copy Payload</span>
                </button>
              </div>
              <pre className="p-3 rounded bg-slate-950 border border-slate-800 text-emerald-400 text-sm overflow-x-auto max-h-60">
                {JSON.stringify(selectedEventModal.payload, null, 2)}
              </pre>
            </div>

            <div className="flex items-center justify-end space-x-3 pt-2 border-t border-slate-800">
              <button
                onClick={() => {
                  onSelectEventForCausality(selectedEventModal.event_id);
                  setSelectedEventModal(null);
                  setActiveTab('causality');
                }}
                className="px-3 py-1.5 rounded bg-cyan-950 border border-cyan-700 text-cyan-300 hover:bg-cyan-900 text-sm font-bold flex items-center space-x-1"
              >
                <GitCommit className="w-3.5 h-3.5" />
                <span>View Causality Chain</span>
              </button>
              <button
                onClick={() => {
                  onIssueReceipt(selectedEventModal.event_id);
                  setSelectedEventModal(null);
                  setActiveTab('receipts');
                }}
                className="px-3 py-1.5 rounded bg-emerald-950 border border-emerald-700 text-emerald-300 hover:bg-emerald-900 text-sm font-bold flex items-center space-x-1"
              >
                <Receipt className="w-3.5 h-3.5" />
                <span>Issue Receipt</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
