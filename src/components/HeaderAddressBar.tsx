import React from 'react';
import {
  Terminal,
  Server,
  RefreshCw,
  Sliders,
  Shield,
} from 'lucide-react';
import { ActiveTab, KernelHealth, ThemeMode } from '../types/kernel';
import { KernelApiConfig } from '../services/kernelApiClient';

interface HeaderAddressBarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  config: KernelApiConfig;
  health: KernelHealth | null;
  isDark: boolean;
  themeMode?: ThemeMode;
  setThemeMode?: (theme: ThemeMode) => void;
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
  themeMode = isDark ? 'dark' : 'light',
  setThemeMode,
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

  const handleSelectTheme = (mode: ThemeMode) => {
    if (setThemeMode) {
      setThemeMode(mode);
    } else {
      setIsDark(mode !== 'light');
    }
  };

  return (
    <header
      id="ide-header-addressbar"
      className={`h-12 border-b flex items-center shrink-0 px-3 select-none transition-colors ${
        themeMode === 'steel'
          ? 'bg-[#202632] border-[#3e4c60] text-[#e2e8f0]'
          : isDark
          ? 'bg-[#0d1117] border-[#30363d] text-[#c9d1d9]'
          : 'bg-white border-slate-300 text-slate-900'
      }`}
    >
      {/* BRAND SQUARE 'K' TILE */}
      <div
        id="branding-tile-k"
        onClick={() => setActiveTab('overview')}
        className={`w-9 h-9 sm:w-10 sm:h-10 cursor-pointer flex items-center justify-center font-bold text-xl shrink-0 rounded transition-all mr-3 ${
          themeMode === 'steel'
            ? 'bg-gradient-to-br from-slate-400 via-slate-600 to-slate-800 text-cyan-200 border border-slate-400/50 shadow-md hover:from-slate-300 hover:to-slate-700'
            : 'bg-[#58a6ff] hover:bg-[#79c0ff] text-[#0d1117]'
        }`}
        title="Kernel-Srv IDE (Steel Architecture)"
      >
        K
      </div>

      {/* BREADCRUMB ADDRESS BAR */}
      <div className="flex-1 px-2 sm:px-4 flex items-center space-x-2 text-xs sm:text-sm text-[#8b949e]">
        <div className={`flex items-center space-x-1.5 px-3 py-1 rounded w-full max-w-2xl font-mono text-xs border ${
          themeMode === 'steel'
            ? 'bg-[#1a202a] border-[#3e4c60] text-[#e2e8f0]'
            : isDark
            ? 'bg-[#161b22] border-[#30363d] text-[#8b949e]'
            : 'bg-slate-100 border-slate-300 text-slate-700'
        }`}>
          <Terminal className={`w-3.5 h-3.5 shrink-0 mr-1 ${themeMode === 'steel' ? 'text-[#70b0e0]' : 'text-[#58a6ff]'}`} />
          <span className="opacity-60">kernel-srv</span>
          <span className="opacity-40">/</span>
          <span className={`font-medium ${themeMode === 'steel' ? 'text-[#70b0e0]' : 'text-[#58a6ff]'}`}>{pathSubSegment.split('/')[0]}</span>
          <span className="opacity-40">/</span>
          <span className={`font-semibold truncate ${themeMode === 'steel' ? 'text-slate-100' : isDark ? 'text-white' : 'text-slate-900'}`}>
            {pathSubSegment.split('/')[1]}
          </span>

          <button
            onClick={onRefreshData}
            title="Refresh active view"
            className="ml-auto p-0.5 rounded hover:bg-slate-700/50 opacity-70 hover:opacity-100 transition-colors"
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
          className={`hidden sm:flex items-center space-x-1 px-3 py-1 rounded font-bold text-xs font-mono shadow transition-colors ${
            themeMode === 'steel'
              ? 'bg-gradient-to-r from-slate-600 via-slate-700 to-slate-800 hover:from-slate-500 hover:to-slate-700 text-cyan-200 border border-slate-500/60'
              : 'bg-[#58a6ff] hover:bg-[#79c0ff] text-[#0d1117]'
          }`}
        >
          <span>⚡</span>
          <span>TRANSITION</span>
        </button>

        {/* DARK / STEEL / LIGHT THEME TOGGLE PILL */}
        <div className={`flex rounded p-0.5 border ${
          themeMode === 'steel'
            ? 'bg-[#1a202a] border-[#3e4c60]'
            : isDark
            ? 'bg-[#161b22] border-[#30363d]'
            : 'bg-slate-200 border-slate-300'
        }`}>
          <button
            onClick={() => handleSelectTheme('dark')}
            className={`px-2 py-0.5 text-[10px] font-bold font-mono rounded transition-colors ${
              themeMode === 'dark' ? 'bg-[#30363d] text-white' : 'text-slate-400 opacity-60 hover:opacity-100'
            }`}
            title="Dark Theme"
          >
            DARK
          </button>
          <button
            onClick={() => handleSelectTheme('steel')}
            className={`px-2 py-0.5 text-[10px] font-bold font-mono rounded transition-colors ${
              themeMode === 'steel'
                ? 'bg-gradient-to-r from-slate-600 to-slate-700 text-cyan-200 border border-slate-500/80 shadow-sm'
                : 'text-slate-400 opacity-60 hover:opacity-100'
            }`}
            title="Industrial Steel Theme"
          >
            STEEL ⚡
          </button>
          <button
            onClick={() => handleSelectTheme('light')}
            className={`px-2 py-0.5 text-[10px] font-bold font-mono rounded transition-colors ${
              themeMode === 'light' ? 'bg-slate-300 text-slate-900 font-bold' : 'text-slate-400 opacity-60 hover:opacity-100'
            }`}
            title="Light Theme"
          >
            LIGHT
          </button>
        </div>

        {/* AVATAR BADGE */}
        <div
          onClick={onOpenSettings}
          className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full border cursor-pointer flex items-center justify-center text-[10px] font-bold transition-colors ${
            themeMode === 'steel'
              ? 'bg-slate-700 border-slate-500 text-cyan-200 hover:bg-slate-600'
              : 'bg-[#30363d] border-transparent hover:bg-[#484f58] text-white'
          }`}
          title="User Session: CX (System Architect)"
        >
          CX
        </div>
      </div>
    </header>
  );
};

