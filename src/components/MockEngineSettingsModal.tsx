import React, { useState } from 'react';
import {
  X,
  Settings,
  Server,
  Zap,
  RefreshCw,
  Copy,
  Check,
  Code,
  CheckCircle2,
  Sliders,
  Database,
  Radio,
} from 'lucide-react';
import { KernelApiConfig } from '../services/kernelApiClient';
import { mockKernelEngine } from '../services/mockKernelEngine';

interface MockEngineSettingsModalProps {
  config: KernelApiConfig;
  isOpen: boolean;
  onClose: () => void;
  onUpdateConfig: (useMock: boolean, targetHost: string) => void;
  isDark: boolean;
  onSeedData: () => void;
}

export const MockEngineSettingsModal: React.FC<MockEngineSettingsModalProps> = ({
  config,
  isOpen,
  onClose,
  onUpdateConfig,
  isDark,
  onSeedData,
}) => {
  const [useMock, setUseMock] = useState(config.useMock);
  const [targetHost, setTargetHost] = useState(config.targetHost);
  const [autoBroadcast, setAutoBroadcast] = useState(mockKernelEngine.isBroadcastingEnabled());
  const [copiedCurl, setCopiedCurl] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSave = () => {
    mockKernelEngine.setAutoBroadcasting(autoBroadcast);
    onUpdateConfig(useMock, targetHost);
    onClose();
  };

  const sampleCurl = `curl -X POST http://localhost:8100/api/kernel/transitions \\
  -H "Content-Type: application/json" \\
  -d '{
    "event_type": "ORDER_COMMITTED",
    "aggregate_type": "ORDER",
    "aggregate_id": "ord_8841",
    "payload": { "amount": 1250.0, "status": "COMMITTED" }
  }'`;

  const handleCopyCurl = () => {
    navigator.clipboard.writeText(sampleCurl);
    setCopiedCurl('curl');
    setTimeout(() => setCopiedCurl(null), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm font-mono">
      <div
        className={`w-full max-w-2xl rounded-lg border shadow-2xl p-6 space-y-5 transition-all ${
          isDark ? 'bg-slate-900 border-slate-700 text-slate-100' : 'bg-white border-slate-300 text-slate-900'
        }`}
      >
        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <Sliders className="w-5 h-5 text-amber-400" />
            <span className="font-bold text-sm">IDE & Kernel-Srv Mocking Configuration</span>
          </div>
          <button onClick={onClose} className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* PROVIDER TOGGLE */}
        <div className="space-y-3 text-xs">
          <label className="block text-slate-400 font-bold uppercase">EXECUTION PROVIDER SCHEME</label>
          <div className="grid grid-cols-2 gap-3">
            <button
              type="button"
              onClick={() => setUseMock(true)}
              className={`p-3 rounded-lg border text-left flex flex-col space-y-1 transition-all ${
                useMock
                  ? 'bg-amber-950/60 border-amber-500 text-amber-200 ring-1 ring-amber-500'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span>BUILT-IN MOCK ENGINE</span>
                {useMock && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Offline standalone mode with realistic SSE event generation, causality chains & state transitions.
              </p>
            </button>

            <button
              type="button"
              onClick={() => setUseMock(false)}
              className={`p-3 rounded-lg border text-left flex flex-col space-y-1 transition-all ${
                !useMock
                  ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200 ring-1 ring-cyan-500'
                  : 'bg-slate-950 border-slate-800 text-slate-400 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between font-bold">
                <span>LIVE KERNEL-SRV API</span>
                {!useMock && <CheckCircle2 className="w-4 h-4 text-cyan-400" />}
              </div>
              <p className="text-[10px] text-slate-400 leading-relaxed">
                Connect directly to Express REST API & pg_notify LISTEN bridge at <code className="text-cyan-300">http://localhost:8100</code>.
              </p>
            </button>
          </div>
        </div>

        {/* TARGET HOST INPUT */}
        <div className="space-y-1 text-xs">
          <label className="block text-slate-400 font-bold uppercase">LIVE BACKEND TARGET HOST URL</label>
          <input
            type="text"
            value={targetHost}
            onChange={(e) => setTargetHost(e.target.value)}
            disabled={useMock}
            placeholder="e.g. http://localhost:8100/api/kernel"
            className={`w-full p-2.5 rounded border outline-none font-mono ${
              isDark
                ? 'bg-slate-950 border-slate-700 text-cyan-300 disabled:opacity-40'
                : 'bg-slate-100 border-slate-300 text-cyan-900 disabled:opacity-40'
            }`}
          />
        </div>

        {/* MOCK BROADCASTING CONFIG */}
        {useMock && (
          <div className="p-3 rounded bg-slate-950 border border-slate-800 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-300 flex items-center space-x-1.5">
                <Radio className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>Mock SSE Event Generator</span>
              </span>
              <input
                type="checkbox"
                checked={autoBroadcast}
                onChange={(e) => setAutoBroadcast(e.target.checked)}
                className="w-4 h-4 accent-amber-500"
              />
            </div>
            <p className="text-[11px] text-slate-400">
              Auto-generate realistic <code className="text-amber-400">kernel_transition_committed</code> events every ~3.2 seconds.
            </p>
          </div>
        )}

        {/* SAMPLE CURL FOR KERNEL-SRV */}
        <div>
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
            <span className="font-bold uppercase">SAMPLE KERNEL-SRV API CURL</span>
            <button
              onClick={handleCopyCurl}
              className="text-cyan-400 hover:underline flex items-center space-x-1"
            >
              {copiedCurl ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
              <span>Copy cURL</span>
            </button>
          </div>
          <pre className="p-2.5 rounded bg-slate-950 border border-slate-800 text-cyan-300 text-[10px] overflow-x-auto">
            {sampleCurl}
          </pre>
        </div>

        {/* ACTIONS */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <button
            onClick={onSeedData}
            className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 text-xs font-bold flex items-center space-x-1"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Mock State</span>
          </button>

          <div className="flex space-x-2">
            <button
              onClick={onClose}
              className="px-4 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-1.5 rounded bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-slate-950 font-black text-xs uppercase"
            >
              Apply Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
