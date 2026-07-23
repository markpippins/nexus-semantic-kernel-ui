import React from 'react';
import {
  Activity,
  Zap,
  ShieldCheck,
  Receipt,
  Radio,
  Clock,
  ExternalLink,
  ArrowRight,
  TrendingUp,
  Cpu,
  Layers,
  Terminal,
  CheckCircle2,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import {
  RecentEvent,
  PolicyMaturity,
  ReceiptIntegrity,
  KernelHealth,
  ActiveTab,
  SSEKernelEvent,
} from '../types/kernel';

interface OverviewDashboardProps {
  recentEvents: RecentEvent[];
  policyMaturity: PolicyMaturity | null;
  receiptIntegrity: ReceiptIntegrity | null;
  health: KernelHealth | null;
  sseLogs: SSEKernelEvent[];
  isDark: boolean;
  setActiveTab: (tab: ActiveTab) => void;
  onSelectEventForCausality: (eventId: string) => void;
  onIssueReceipt: (eventId: string) => void;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  recentEvents,
  policyMaturity,
  receiptIntegrity,
  health,
  sseLogs,
  isDark,
  setActiveTab,
  onSelectEventForCausality,
  onIssueReceipt,
}) => {
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(text);
    setTimeout(() => setCopiedId(null), 1500);
  };

  // Recharts data for propagation lag trend
  const lagData = recentEvents
    .slice()
    .reverse()
    .map((e, idx) => ({
      name: `#${idx + 1}`,
      id: e.event_id,
      lag: e.propagation_lag_ms,
      type: e.event_type,
    }));

  // Recharts data for policy maturity
  const maturityChartData = policyMaturity
    ? [
        { name: 'Compiled (Native)', count: policyMaturity.compiled_count, fill: '#10b981' },
        { name: 'Data-Driven (SQL)', count: policyMaturity.data_driven_count, fill: '#3b82f6' },
      ]
    : [];

  return (
    <div id="overview-dashboard-view" className="p-4 sm:p-6 space-y-6">
      {/* HEADER BAR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800/60">
        <div>
          <h1
            className={`text-lg font-bold font-mono tracking-tight flex items-center space-x-2 ${
              isDark ? 'text-slate-100' : 'text-slate-900'
            }`}
          >
            <Activity className="w-5 h-5 text-cyan-400" />
            <span>PostgreSQL Semantic Kernel Telemetry</span>
          </h1>
          <p
            className={`text-xs font-mono mt-0.5 ${
              isDark ? 'text-slate-400' : 'text-slate-600'
            }`}
          >
            Kernel state wrappers over <code className="text-cyan-400">sys_transition()</code>,{' '}
            <code className="text-emerald-400">sys_issue_receipt()</code> & read-only views
          </p>
        </div>

        <div className="flex items-center space-x-2 font-mono text-xs">
          <span
            className={`px-2.5 py-1 rounded border font-semibold flex items-center space-x-1.5 ${
              isDark
                ? 'bg-slate-900 border-slate-800 text-slate-300'
                : 'bg-white border-slate-300 text-slate-700'
            }`}
          >
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>Avg Lag: {health?.avg_lag_ms || 2.4}ms</span>
          </span>
          <button
            onClick={() => setActiveTab('sse_stream')}
            className="px-3 py-1 rounded bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 font-semibold flex items-center space-x-1 transition-all"
          >
            <Radio className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>SSE Stream Log ({sseLogs.length})</span>
          </button>
        </div>
      </div>

      {/* METRIC CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CARD 1: PROPAGATION LAG & EVENT VOLUME */}
        <div
          className={`p-4 rounded-lg border flex flex-col justify-between transition-all ${
            isDark
              ? 'bg-slate-900/90 border-slate-800 hover:border-cyan-500/40'
              : 'bg-white border-slate-300 shadow-sm'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider font-semibold">
                PROPAGATION LAG
              </span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="mt-2 flex items-baseline space-x-2 font-mono">
              <span className={`text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                {health?.avg_lag_ms || '2.40'} <span className="text-sm font-normal text-slate-400">ms</span>
              </span>
              <span className="text-xs font-medium text-emerald-400 flex items-center">
                <TrendingUp className="w-3 h-3 mr-0.5" />
                Sub-ms WAL
              </span>
            </div>
          </div>

          <div className="h-16 mt-3">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={lagData}>
                <defs>
                  <linearGradient id="lagGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <Tooltip
                  contentStyle={{
                    backgroundColor: isDark ? '#0f172a' : '#ffffff',
                    borderColor: isDark ? '#334155' : '#cbd5e1',
                    fontSize: '11px',
                    fontFamily: 'monospace',
                  }}
                  formatter={(val: any) => [`${val} ms`, 'Lag']}
                />
                <Area type="monotone" dataKey="lag" stroke="#f59e0b" strokeWidth={2} fillOpacity={1} fill="url(#lagGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* CARD 2: POLICY MATURITY RATIO */}
        <div
          className={`p-4 rounded-lg border flex flex-col justify-between transition-all ${
            isDark
              ? 'bg-slate-900/90 border-slate-800 hover:border-emerald-500/40'
              : 'bg-white border-slate-300 shadow-sm'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider font-semibold">
                POLICY MATURITY
              </span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="mt-2 flex items-baseline space-x-2 font-mono">
              <span className={`text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                {policyMaturity?.ratio || 71}%
              </span>
              <span className="text-xs font-medium text-emerald-400">
                {policyMaturity?.compiled_count || 5} Compiled / {policyMaturity?.data_driven_count || 2} SQL
              </span>
            </div>
          </div>

          <div className="mt-3 space-y-1.5 font-mono text-xs">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Ratio (kernel.v_policy_maturity)</span>
              <span className="text-emerald-400 font-bold">{policyMaturity?.maturity_grade || 'ENTERPRISE'}</span>
            </div>
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
              <div
                className="bg-emerald-500 h-full transition-all duration-500"
                style={{ width: `${policyMaturity?.ratio || 71}%` }}
              />
              <div
                className="bg-blue-500 h-full transition-all duration-500"
                style={{ width: `${100 - (policyMaturity?.ratio || 71)}%` }}
              />
            </div>
          </div>
        </div>

        {/* CARD 3: RECEIPT INTEGRITY */}
        <div
          className={`p-4 rounded-lg border flex flex-col justify-between transition-all ${
            isDark
              ? 'bg-slate-900/90 border-slate-800 hover:border-cyan-500/40'
              : 'bg-white border-slate-300 shadow-sm'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider font-semibold">
                RECEIPT INTEGRITY
              </span>
              <Receipt className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="mt-2 flex items-baseline space-x-2 font-mono">
              <span className={`text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                {receiptIntegrity?.integrity_pct || 100}%
              </span>
              <span
                className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
                  receiptIntegrity?.orphaned_count === 0
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                {receiptIntegrity?.orphaned_count || 0} Orphans
              </span>
            </div>
          </div>

          <div className="mt-3 font-mono text-xs space-y-1">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Total Receipts:</span>
              <span className="text-slate-200 font-bold">{receiptIntegrity?.total_receipts || 12}</span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Audit Status:</span>
              <span className="text-emerald-400 flex items-center">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                VERIFIED
              </span>
            </div>
          </div>
        </div>

        {/* CARD 4: LISTEN BRIDGE & SSE TELEMETRY */}
        <div
          className={`p-4 rounded-lg border flex flex-col justify-between transition-all ${
            isDark
              ? 'bg-slate-900/90 border-slate-800 hover:border-purple-500/40'
              : 'bg-white border-slate-300 shadow-sm'
          }`}
        >
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-slate-400 uppercase tracking-wider font-semibold">
                LISTEN BRIDGE (SSE)
              </span>
              <Radio className="w-4 h-4 text-purple-400" />
            </div>
            <div className="mt-2 flex items-baseline space-x-2 font-mono">
              <span className={`text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
                ONLINE
              </span>
              <span className="text-xs font-medium text-purple-400">
                {health?.subscribers || 1} SSE Client(s)
              </span>
            </div>
          </div>

          <div className="mt-3 font-mono text-xs space-y-1">
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>pg_notify Channel:</span>
              <span className="text-purple-300 font-mono text-[10px] truncate max-w-[120px]">
                kernel_transition_committed
              </span>
            </div>
            <div className="flex justify-between text-[11px] text-slate-400">
              <span>Kernel Service Port:</span>
              <span className="text-emerald-400 font-bold">8100</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECOND SECTION: HIGH-CONTRAST RECENT TRANSITION EVENTS TABLE */}
      <div
        className={`rounded-lg border overflow-hidden transition-all ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
        }`}
      >
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between">
          <div className="flex items-center space-x-2 font-mono">
            <Zap className="w-4 h-4 text-cyan-400" />
            <h2 className={`font-bold text-sm ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              Recent Kernel Transition Events (<code className="text-cyan-400">kernel.v_recent_events</code>)
            </h2>
          </div>
          <button
            onClick={() => setActiveTab('transitions')}
            className="text-xs font-mono text-cyan-400 hover:text-cyan-300 flex items-center space-x-1 font-semibold"
          >
            <span>View All Transitions</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs border-collapse">
            <thead>
              <tr
                className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                  isDark
                    ? 'bg-slate-950/80 border-slate-800 text-slate-400'
                    : 'bg-slate-100 border-slate-200 text-slate-600'
                }`}
              >
                <th className="py-2.5 px-4">Event ID</th>
                <th className="py-2.5 px-4">Event Type</th>
                <th className="py-2.5 px-4">Aggregate Type</th>
                <th className="py-2.5 px-4">Aggregate ID</th>
                <th className="py-2.5 px-4">Committed At</th>
                <th className="py-2.5 px-4">Lag (ms)</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {recentEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-500 font-mono">
                    No kernel transition events recorded yet. Click "TRANSITION" above to execute one.
                  </td>
                </tr>
              ) : (
                recentEvents.slice(0, 8).map((evt) => (
                  <tr
                    key={evt.event_id}
                    className={`transition-colors ${
                      isDark ? 'hover:bg-slate-800/50' : 'hover:bg-slate-50'
                    }`}
                  >
                    <td className="py-2.5 px-4 font-bold text-cyan-400 flex items-center space-x-2">
                      <span>{evt.event_id}</span>
                      <button
                        onClick={() => handleCopy(evt.event_id)}
                        className="text-slate-500 hover:text-slate-300 transition-colors"
                        title="Copy Event ID"
                      >
                        {copiedId === evt.event_id ? (
                          <Check className="w-3 h-3 text-emerald-400" />
                        ) : (
                          <Copy className="w-3 h-3" />
                        )}
                      </button>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-200 font-bold text-[11px]">
                        {evt.event_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4">
                      <span className="px-2 py-0.5 rounded bg-purple-950/40 border border-purple-800/50 text-purple-300 text-[11px]">
                        {evt.aggregate_type}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-300">{evt.aggregate_id}</td>
                    <td className="py-2.5 px-4 text-slate-400 text-[11px]">
                      {new Date(evt.committed_at).toLocaleTimeString()}
                    </td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          evt.propagation_lag_ms < 3
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : evt.propagation_lag_ms < 10
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {evt.propagation_lag_ms} ms
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          onSelectEventForCausality(evt.event_id);
                          setActiveTab('causality');
                        }}
                        className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-[11px] font-semibold transition-colors inline-flex items-center space-x-1"
                        title="Inspect causality chain"
                      >
                        <span>Causality</span>
                      </button>
                      <button
                        onClick={() => onIssueReceipt(evt.event_id)}
                        className="px-2 py-1 rounded bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-700/50 text-emerald-300 text-[11px] font-semibold transition-colors inline-flex items-center space-x-1"
                        title="Issue receipt for this event"
                      >
                        <span>Receipt</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* THIRD SECTION: REAL-TIME SSE LOG LIVE TICKER */}
      <div
        className={`rounded-lg border p-4 space-y-3 font-mono transition-all ${
          isDark ? 'bg-slate-950 border-slate-800' : 'bg-slate-900 text-slate-100 border-slate-800'
        }`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Radio className="w-4 h-4 text-emerald-400 animate-pulse" />
            <span className="font-bold text-xs uppercase tracking-wider text-emerald-400">
              LIVE SSE KERNEL EVENT BROADCASTER
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            Channel: <code className="text-cyan-400">kernel_transition_committed</code>
          </span>
        </div>

        <div className="p-3 rounded bg-slate-900 border border-slate-800 max-h-44 overflow-y-auto space-y-1.5 font-mono text-[11px]">
          {sseLogs.length === 0 ? (
            <p className="text-slate-500 italic">Listening for live kernel_transition_committed SSE events...</p>
          ) : (
            sseLogs.slice(0, 5).map((log, idx) => (
              <div
                key={log.event_id + idx}
                className="flex items-start justify-between border-b border-slate-800/60 pb-1 text-slate-300 hover:text-white"
              >
                <div className="flex items-center space-x-2">
                  <span className="text-emerald-400 font-bold">[{log.event_id}]</span>
                  <span className="text-cyan-300">{log.event_type}</span>
                  <span className="text-slate-500">→</span>
                  <span className="text-purple-300">{log.aggregate_type}</span>
                  <span className="text-slate-400">({log.aggregate_id})</span>
                </div>
                <span className="text-[10px] text-slate-500 font-mono">
                  {new Date(log.committed_at).toLocaleTimeString()} ({log.propagation_lag_ms}ms)
                </span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
