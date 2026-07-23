import React, { useState } from 'react';
import {
  Terminal,
  Server,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { ActiveTab, KernelHealth } from '../types/kernel';
import { KernelApiConfig } from '../services/kernelApiClient';

interface HeaderAddressBarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  config: KernelApiConfig;
  health: KernelHealth | null;
  isDark: boolean;
  setIsDark: (dark: boolean) => void;
  onOpenSettings: () => void;
  onExecuteQuickTransition: () => void;
  onRefreshData: () => void;
}

export const HeaderAddressBar: React.FC<HeaderAddressBarProps> = ({
  activeTab,
  setActiveTab,
  config,
  health,
  isDark,
  setIsDark,
  onOpenSettings,
  onExecuteQuickTransition,
  onRefreshData,
}) => {
  const tabPathMap: Record<ActiveTab, string> = {
    overview: 'overview/telemetry',
    transitions: 'operations/transitions',
    causality: 'causality/chain_graph',
    receipts: 'integrity/receipts',
    aggregates: 'aggregates/v_aggregate_events',
    policy: 'observability/v_policy_maturity',
    sse_stream: 'stream/kernel_transition_committed',
    settings: 'config/provider_settings',
  };

  const pathSubSegment = tabPathMap[activeTab] || 'views/kernel';

  return (
    <header
      id="ide-header-addressbar"
      className={`h-12 border-b border-[#30363d] flex items-center shrink-0 px-3 select-none transition-colors ${
        isDark ? 'bg-[#0d1117] text-[#c9d1d9]' : 'bg-white border-slate-300 text-slate-900'
      }`}
    >
      {/* BRAND SQUARE 'K' TILE */}
      <div
        id="branding-tile-k"
        onClick={() => setActiveTab('overview')}
        className="w-9 h-9 sm:w-10 sm:h-10 bg-[#58a6ff] hover:bg-[#79c0ff] cursor-pointer flex items-center justify-center font-bold text-[#0d1117] text-xl shrink-0 rounded transition-colors mr-3"
        title="Kernel-Srv IDE"
      >
        K
      </div>

      {/* BREADCRUMB ADDRESS BAR */}
      <div className="flex-1 px-2 sm:px-4 flex items-center space-x-2 text-xs sm:text-sm text-[#8b949e]">
        <div className="flex items-center space-x-1.5 bg-[#161b22] border border-[#30363d] px-3 py-1 rounded w-full max-w-2xl font-mono text-xs">
          <Terminal className="w-3.5 h-3.5 text-[#58a6ff] shrink-0 mr-1" />
          <span className="opacity-60 text-[#8b949e]">kernel-srv</span>
          <span className="text-[#30363d]">/</span>
          <span className="text-[#58a6ff] font-medium">{pathSubSegment.split('/')[0]}</span>
          <span className="text-[#30363d]">/</span>
          <span className="text-white font-semibold truncate">{pathSubSegment.split('/')[1]}</span>

          <button
            onClick={onRefreshData}
            title="Refresh active view"
            className="ml-auto p-0.5 rounded hover:bg-[#30363d] text-[#8b949e] hover:text-white transition-colors"
          >
            <RefreshCw className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* MOCK ENGINE / LIVE BADGE */}
      <button
        id="mock-toggle-indicator-btn"
        onClick={onOpenSettings}
        title="Configure Execution Provider"
        className={`hidden lg:flex items-center space-x-1.5 px-2.5 py-1 rounded border text-[11px] font-mono mr-3 transition-colors ${
          config.useMock
            ? 'bg-[#161b22] border-[#f0883e]/50 text-[#f0883e] hover:bg-[#1f2937]'
            : 'bg-[#161b22] border-[#3fb950]/50 text-[#3fb950] hover:bg-[#1f2937]'
        }`}
      >
        <Server className="w-3.5 h-3.5" />
        <span>{config.useMock ? 'MOCK ENGINE' : 'LIVE KERNEL'}</span>
        <Sliders className="w-3 h-3 ml-0.5 opacity-60" />
      </button>

      {/* RIGHT SIDE CONTROLS & THEME TOGGLE & AVATAR */}
      <div className="flex items-center space-x-3 shrink-0">
        {/* QUICK TRANSITION ACTION BUTTON */}
        <button
          onClick={onExecuteQuickTransition}
          className="hidden sm:flex items-center space-x-1 px-3 py-1 rounded bg-[#58a6ff] hover:bg-[#79c0ff] text-[#0d1117] font-bold text-xs font-mono shadow transition-colors"
        >
          <span>⚡</span>
          <span>TRANSITION</span>
        </button>

        {/* DARK / LIGHT THEME TOGGLE PILL */}
        <div className="flex bg-[#161b22] rounded p-0.5 border border-[#30363d]">
          <button
            onClick={() => setIsDark(true)}
            className={`px-2 py-0.5 text-[10px] font-bold font-mono rounded transition-colors ${
              isDark ? 'bg-[#30363d] text-white' : 'text-[#8b949e] opacity-60 hover:opacity-100'
            }`}
          >
            DARK
          </button>
          <button
            onClick={() => setIsDark(false)}
            className={`px-2 py-0.5 text-[10px] font-bold font-mono rounded transition-colors ${
              !isDark ? 'bg-slate-300 text-slate-900' : 'text-[#8b949e] opacity-60 hover:opacity-100'
            }`}
          >
            LIGHT
          </button>
        </div>

        {/* AVATAR BADGE */}
        <div
          onClick={onOpenSettings}
          className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#30363d] hover:bg-[#484f58] cursor-pointer flex items-center justify-center text-[10px] font-bold text-white transition-colors"
          title="User Session: CX (System Architect)"
        >
          CX
        </div>
      </div>
    </header>
  );
};

