import React, { useState, useEffect } from 'react';
import {
  Receipt,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Key,
  Hash,
  Layers,
  Send,
  RefreshCw,
  Search,
  Plus,
  FileCheck,
} from 'lucide-react';
import {
  Receipt as ReceiptType,
  ReceiptChainNode,
  PlanReceipts,
  ReceiptIntegrity,
  TransitionEvent,
} from '../types/kernel';
import { kernelApiClient } from '../services/kernelApiClient';

interface ReceiptsViewProps {
  initialEventIdToIssue?: string;
  allEvents: TransitionEvent[];
  isDark: boolean;
  onReceiptIssued: () => void;
}

export const ReceiptsView: React.FC<ReceiptsViewProps> = ({
  initialEventIdToIssue,
  allEvents,
  isDark,
  onReceiptIssued,
}) => {
  const [targetEventId, setTargetEventId] = useState(initialEventIdToIssue || allEvents[0]?.event_id || '');
  const [planNumber, setPlanNumber] = useState('PLAN-2026-001');
  const [receiptType, setReceiptType] = useState('TRANSACTION_COMMIT');
  const [issuedBy, setIssuedBy] = useState('sys_kernel_authority');
  const [receiptHash, setReceiptHash] = useState('');
  const [isIssuing, setIsIssuing] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);

  // Receipts views state
  const [receiptChain, setReceiptChain] = useState<ReceiptChainNode[]>([]);
  const [planReceipts, setPlanReceipts] = useState<PlanReceipts | null>(null);
  const [integrity, setIntegrity] = useState<ReceiptIntegrity | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (initialEventIdToIssue) {
      setTargetEventId(initialEventIdToIssue);
    }
  }, [initialEventIdToIssue]);

  useEffect(() => {
    fetchReceiptData();
  }, [planNumber]);

  const fetchReceiptData = async () => {
    setIsLoading(true);
    try {
      const [planData, integrityData] = await Promise.all([
        kernelApiClient.getPlanReceipts(planNumber),
        kernelApiClient.getReceiptIntegrity(),
      ]);
      setPlanReceipts(planData);
      setIntegrity(integrityData);

      if (planData.receipts.length > 0) {
        const chain = await kernelApiClient.getReceiptChain(planData.receipts[0].id);
        setReceiptChain(chain);
      }
    } catch (err) {
      console.error('Failed to fetch receipt data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleIssueReceipt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEventId) return;

    setIssueError(null);
    setIsIssuing(true);
    try {
      const generatedHash = receiptHash.trim() || Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
      await kernelApiClient.issueReceipt({
        event_id: targetEventId,
        receipt_type: receiptType,
        receipt_hash: generatedHash,
        issued_by: issuedBy,
        plan_number: planNumber || undefined,
      });
      onReceiptIssued();
      await fetchReceiptData();
    } catch (err: any) {
      setIssueError(err.message || 'Failed to issue cryptographic receipt.');
    } finally {
      setIsIssuing(false);
    }
  };

  return (
    <div id="receipts-integrity-view" className="p-4 sm:p-6 space-y-6 font-mono">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800/60">
        <div>
          <h1
            className={`text-lg font-bold flex items-center space-x-2 ${
              isDark ? 'text-slate-100' : 'text-slate-900'
            }`}
          >
            <Receipt className="w-5 h-5 text-emerald-400" />
            <span>Cryptographic Receipts & Integrity (<code className="text-emerald-400">kernel.sys_issue_receipt()</code>)</span>
          </h1>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Audit chains (<code className="text-cyan-400">v_receipt_chain</code>), Plan progress (<code className="text-cyan-400">v_plan_receipts</code>) & Orphan receipt integrity checks
          </p>
        </div>

        <button
          onClick={fetchReceiptData}
          className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center space-x-1"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Audit Integrity Now</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: ISSUE RECEIPT FORM & PLAN PROGRESS (5 COLS) */}
        <div className="lg:col-span-5 space-y-6">
          {/* ISSUE RECEIPT CARD */}
          <div
            className={`rounded-lg border p-4 space-y-4 transition-all ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
              <span className="flex items-center space-x-1.5">
                <Key className="w-4 h-4" />
                <span>ISSUE RECEIPT (kernel.sys_issue_receipt)</span>
              </span>
            </div>

            <form onSubmit={handleIssueReceipt} className="space-y-3 text-xs">
              {issueError && (
                <div className="p-2.5 rounded bg-rose-950/60 border border-rose-800 text-rose-300 text-[11px]">
                  {issueError}
                </div>
              )}

              <div>
                <label className="block text-[11px] text-slate-400 font-bold mb-1">TARGET TRANSITION EVENT ID</label>
                <select
                  value={targetEventId}
                  onChange={(e) => setTargetEventId(e.target.value)}
                  className={`w-full p-2 rounded border outline-none font-mono ${
                    isDark ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-slate-100 border-slate-300 text-slate-900'
                  }`}
                  required
                >
                  {allEvents.map((e) => (
                    <option key={e.event_id} value={e.event_id}>
                      {e.event_id} - {e.event_type} ({e.aggregate_id})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1">RECEIPT TYPE</label>
                  <select
                    value={receiptType}
                    onChange={(e) => setReceiptType(e.target.value)}
                    className={`w-full p-2 rounded border outline-none font-mono ${
                      isDark ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-slate-100 border-slate-300 text-slate-900'
                    }`}
                  >
                    <option value="TRANSACTION_COMMIT">TRANSACTION_COMMIT</option>
                    <option value="POLICY_ATTESTATION">POLICY_ATTESTATION</option>
                    <option value="STATE_CHECKPOINT">STATE_CHECKPOINT</option>
                    <option value="AUDIT_VERIFICATION">AUDIT_VERIFICATION</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1">ISSUED BY (ISSUER)</label>
                  <input
                    type="text"
                    value={issuedBy}
                    onChange={(e) => setIssuedBy(e.target.value)}
                    className={`w-full p-2 rounded border outline-none font-mono ${
                      isDark ? 'bg-slate-950 border-slate-700 text-slate-100' : 'bg-slate-100 border-slate-300 text-slate-900'
                    }`}
                    placeholder="e.g. sys_kernel_authority"
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
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

                <div>
                  <label className="block text-[11px] text-slate-400 font-bold mb-1">SHA-256 HASH (AUTO/CUSTOM)</label>
                  <input
                    type="text"
                    value={receiptHash}
                    onChange={(e) => setReceiptHash(e.target.value)}
                    className={`w-full p-2 rounded border outline-none font-mono text-[10px] ${
                      isDark ? 'bg-slate-950 border-slate-700 text-amber-400' : 'bg-slate-100 border-slate-300 text-amber-700'
                    }`}
                    placeholder="Auto-generated if empty"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isIssuing || !targetEventId}
                className="w-full py-2.5 rounded bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black tracking-wider uppercase flex items-center justify-center space-x-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
              >
                {isIssuing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>SIGNING RECEIPT...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>ISSUE RECEIPT</span>
                  </>
                )}
              </button>
            </form>
          </div>

          {/* PLAN RECEIPTS PROGRESS (v_plan_receipts) */}
          <div
            className={`rounded-lg border p-4 space-y-3 transition-all ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
            }`}
          >
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-2 text-xs font-bold text-cyan-400 uppercase tracking-wider">
              <span>PLAN PROGRESS (kernel.v_plan_receipts)</span>
              <span className="text-slate-200">{planReceipts?.plan_number}</span>
            </div>

            {planReceipts ? (
              <div className="space-y-3 font-mono text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <span>Execution Status:</span>
                  <span className="px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold">
                    {planReceipts.status}
                  </span>
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Receipt Completion Ratio:</span>
                    <span className="text-emerald-400 font-bold">
                      {planReceipts.receipts_issued} / {planReceipts.total_events} ({planReceipts.completion_pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="bg-emerald-500 h-full transition-all duration-500"
                      style={{ width: `${planReceipts.completion_pct}%` }}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-slate-500 text-xs">No active plan metrics loaded.</p>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: RECEIPT CHAIN & ORPHAN INTEGRITY CHECK (7 COLS) */}
        <div className="lg:col-span-7 space-y-6">
          {/* ORPHAN INTEGRITY AUDIT BADGE */}
          <div
            className={`rounded-lg border p-4 transition-all ${
              integrity?.status === 'HEALTHY'
                ? isDark
                  ? 'bg-emerald-950/30 border-emerald-800/60 text-emerald-300'
                  : 'bg-emerald-50 border-emerald-300 text-emerald-800'
                : isDark
                ? 'bg-rose-950/30 border-rose-800/60 text-rose-300'
                : 'bg-rose-50 border-rose-300 text-rose-800'
            }`}
          >
            <div className="flex items-center justify-between font-mono text-xs font-bold">
              <div className="flex items-center space-x-2">
                {integrity?.status === 'HEALTHY' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                ) : (
                  <AlertTriangle className="w-5 h-5 text-rose-400" />
                )}
                <span>
                  ORPHAN RECEIPT AUDIT: {integrity?.status || 'HEALTHY'} ({integrity?.integrity_pct || 100}% Integrity)
                </span>
              </div>
              <span className="text-[10px] opacity-75">
                Audited: {new Date(integrity?.last_audit_at || Date.now()).toLocaleTimeString()}
              </span>
            </div>

            {integrity && integrity.orphaned_count > 0 && (
              <div className="mt-3 p-3 rounded bg-rose-950/80 border border-rose-800/80 font-mono text-xs text-rose-200 space-y-1">
                <span className="font-bold block">Orphaned Receipts Detected ({integrity.orphaned_count}):</span>
                {integrity.orphan_check_details.map((d) => (
                  <div key={d.receipt_id} className="text-[11px] text-rose-300">
                    • <code className="text-amber-300">{d.receipt_id}</code>: {d.issue_reason}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* HASH CHAIN TABLE (kernel.v_receipt_chain) */}
          <div
            className={`rounded-lg border overflow-hidden transition-all ${
              isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
            }`}
          >
            <div className="p-3 border-b border-slate-800/80 flex items-center justify-between font-mono text-xs">
              <span className="font-bold text-cyan-400 uppercase tracking-wider flex items-center space-x-1.5">
                <Hash className="w-4 h-4" />
                <span>CRYPTOGRAPHIC HASH CHAIN (kernel.v_receipt_chain)</span>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left font-mono text-xs border-collapse">
                <thead>
                  <tr
                    className={`border-b text-[11px] font-bold uppercase tracking-wider ${
                      isDark ? 'bg-slate-950/80 border-slate-800 text-slate-400' : 'bg-slate-100 border-slate-200 text-slate-600'
                    }`}
                  >
                    <th className="py-2.5 px-3">Seq</th>
                    <th className="py-2.5 px-3">Receipt ID</th>
                    <th className="py-2.5 px-3">Event ID</th>
                    <th className="py-2.5 px-3">SHA-256 Hash</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/40">
                  {receiptChain.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-500">
                        No receipts issued in current plan chain yet.
                      </td>
                    </tr>
                  ) : (
                    receiptChain.map((node) => (
                      <tr key={node.receipt_id} className="hover:bg-slate-800/50">
                        <td className="py-2.5 px-3 font-bold text-cyan-400">#{node.sequence_index}</td>
                        <td className="py-2.5 px-3 font-bold text-emerald-300">{node.receipt_id}</td>
                        <td className="py-2.5 px-3 text-slate-300">{node.event_id}</td>
                        <td className="py-2.5 px-3">
                          <code className="text-[10px] text-amber-300 block font-mono truncate max-w-[200px]">
                            {node.hash}
                          </code>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
