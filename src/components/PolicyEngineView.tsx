import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Cpu,
  Database,
  BarChart2,
  CheckCircle2,
  Clock,
  Code,
  Layers,
  RefreshCw,
} from 'lucide-react';
import { PolicyRule, PolicyMaturity } from '../types/kernel';
import { kernelApiClient } from '../services/kernelApiClient';

interface PolicyEngineViewProps {
  isDark: boolean;
}

export const PolicyEngineView: React.FC<PolicyEngineViewProps> = ({ isDark }) => {
  const [policies, setPolicies] = useState<PolicyRule[]>([]);
  const [maturity, setMaturity] = useState<PolicyMaturity | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchPolicyData();
  }, []);

  const fetchPolicyData = async () => {
    setIsLoading(true);
    try {
      const [rules, mat] = await Promise.all([
        kernelApiClient.getActivePolicy(),
        kernelApiClient.getPolicyMaturity(),
      ]);
      setPolicies(rules);
      setMaturity(mat);
    } catch (err) {
      console.error('Failed to load policy data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div id="policy-engine-view" className="p-4 sm:p-6 space-y-6 font-mono">
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-slate-800/60">
        <div>
          <h1
            className={`text-lg font-bold flex items-center space-x-2 ${
              isDark ? 'text-slate-100' : 'text-slate-900'
            }`}
          >
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            <span>Policy Engine & Maturity (<code className="text-emerald-400">kernel.v_active_policy</code>)</span>
          </h1>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
            Compiled native rules vs Data-driven SQL invariants ratio (<code className="text-cyan-400">kernel.v_policy_maturity</code>)
          </p>
        </div>

        <button
          onClick={fetchPolicyData}
          className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center space-x-1"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          <span>Refresh Policies</span>
        </button>
      </div>

      {/* MATURITY SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* COMPILED NATIVE RULES */}
        <div
          className={`p-4 rounded-lg border transition-all ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-emerald-400">
            <span className="uppercase tracking-wider flex items-center space-x-1">
              <Cpu className="w-4 h-4" />
              <span>COMPILED RULES (NATIVE)</span>
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px]">
              SUB-MS
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className={`text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              {maturity?.compiled_count || 5}
            </span>
            <span className="text-xs text-slate-400">Invariants in Kernel C/C++ Binary</span>
          </div>
        </div>

        {/* DATA DRIVEN RULES */}
        <div
          className={`p-4 rounded-lg border transition-all ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-blue-400">
            <span className="uppercase tracking-wider flex items-center space-x-1">
              <Database className="w-4 h-4" />
              <span>DATA-DRIVEN RULES (SQL)</span>
            </span>
            <span className="px-1.5 py-0.5 rounded bg-blue-500/20 text-blue-300 font-mono text-[10px]">
              DYNAMIC
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className={`text-2xl font-bold ${isDark ? 'text-slate-100' : 'text-slate-900'}`}>
              {maturity?.data_driven_count || 2}
            </span>
            <span className="text-xs text-slate-400">Rules evaluated via PL/pgSQL & views</span>
          </div>
        </div>

        {/* MATURITY GRADE */}
        <div
          className={`p-4 rounded-lg border transition-all ${
            isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
          }`}
        >
          <div className="flex items-center justify-between text-xs font-bold text-purple-400">
            <span className="uppercase tracking-wider flex items-center space-x-1">
              <BarChart2 className="w-4 h-4" />
              <span>KERNEL MATURITY GRADE</span>
            </span>
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-bold text-emerald-400">
              {maturity?.maturity_grade || 'ENTERPRISE'}
            </span>
            <span className="text-xs text-slate-400">({maturity?.ratio || 71}% Compiled Ratio)</span>
          </div>
        </div>
      </div>

      {/* POLICY RULES TABLE */}
      <div
        className={`rounded-lg border overflow-hidden transition-all ${
          isDark ? 'bg-slate-900/90 border-slate-800' : 'bg-white border-slate-300 shadow-sm'
        }`}
      >
        <div className="p-3 border-b border-slate-800/80 flex items-center justify-between text-xs">
          <span className="font-bold text-emerald-400 uppercase tracking-wider flex items-center space-x-1.5">
            <ShieldCheck className="w-4 h-4" />
            <span>ACTIVE POLICY INVARIANTS ({policies.length} Rules)</span>
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
                <th className="py-2.5 px-3">Rule Name</th>
                <th className="py-2.5 px-3">Target Aggregate</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Evals</th>
                <th className="py-2.5 px-3">Avg Latency</th>
                <th className="py-2.5 px-3">Definition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {policies.map((p) => (
                <tr key={p.id} className="hover:bg-slate-800/50">
                  <td className="py-2.5 px-3 font-bold text-cyan-400">{p.rule_name}</td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded bg-purple-950 text-purple-300 font-bold text-[10px]">
                      {p.target_aggregate}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        p.type === 'COMPILED'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                          : 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      }`}
                    >
                      {p.type}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300 font-bold">{p.eval_count.toLocaleString()}</td>
                  <td className="py-2.5 px-3 text-amber-400 font-bold">{p.avg_eval_ms} ms</td>
                  <td className="py-2.5 px-3">
                    <code className="text-[10px] text-emerald-400 block truncate max-w-[320px]">
                      {p.definition}
                    </code>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
