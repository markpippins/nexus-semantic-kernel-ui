import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Settings,
} from 'lucide-react';
import { ActiveTab, KernelHealth } from '../types/kernel';

interface SidebarNavProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isDark: boolean;
  health: KernelHealth | null;
  eventsCount: number;
  orphanCount: number;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
}

export const SidebarNav: React.FC<SidebarNavProps> = ({
  activeTab,
  setActiveTab,
  isDark,
  health,
  eventsCount,
  orphanCount,
  isCollapsed,
  setIsCollapsed,
}) => {
  const operationsNav = [
    {
      id: 'overview' as ActiveTab,
      label: 'Telemetry & Overview',
      emoji: '🩺',
    },
    {
      id: 'transitions' as ActiveTab,
      label: 'Transitions',
      emoji: '⚡',
      badge: eventsCount > 0 ? eventsCount : undefined,
    },
    {
      id: 'receipts' as ActiveTab,
      label: 'Receipts & Integrity',
      emoji: '📄',
      badge: orphanCount > 0 ? `${orphanCount} ORPHAN` : undefined,
      badgeColor: 'bg-[#f85149]/20 text-[#f85149] border-[#f85149]/40',
    },
    {
      id: 'causality' as ActiveTab,
      label: 'Causality Graph',
      emoji: '📅',
    },
  ];

  const observabilityNav = [
    {
      id: 'policy' as ActiveTab,
      label: 'Policy Engine',
      emoji: '🛡️',
    },
    {
      id: 'aggregates' as ActiveTab,
      label: 'Aggregate Events',
      emoji: '📈',
    },
    {
      id: 'sse_stream' as ActiveTab,
      label: 'SSE Stream Console',
      emoji: '📻',
      badge: 'LIVE',
      badgeColor: 'bg-[#3fb950]/20 text-[#3fb950] border-[#3fb950]/40',
    },
    {
      id: 'settings' as ActiveTab,
      label: 'IDE Configuration',
      emoji: '⚙️',
    },
  ];

  const renderNavItem = (item: { id: ActiveTab; label: string; emoji: string; badge?: string | number; badgeColor?: string }) => {
    const isActive = activeTab === item.id;
    return (
      <button
        key={item.id}
        onClick={() => setActiveTab(item.id)}
        title={isCollapsed ? item.label : undefined}
        className={`w-full flex items-center px-4 py-2 text-xs font-mono transition-colors ${
          isActive
            ? isDark
              ? 'bg-[#1f2937] text-[#58a6ff] border-r-2 border-[#58a6ff] font-semibold'
              : 'bg-cyan-100 text-cyan-900 border-r-2 border-cyan-600 font-semibold'
            : isDark
            ? 'text-[#8b949e] hover:bg-[#161b22] hover:text-[#c9d1d9]'
            : 'text-slate-600 hover:bg-slate-200 hover:text-slate-900'
        }`}
      >
        <span className="mr-3 text-sm shrink-0">{item.emoji}</span>
        {!isCollapsed && (
          <div className="flex-1 flex items-center justify-between truncate">
            <span className="truncate">{item.label}</span>
            {item.badge !== undefined && (
              <span
                className={`ml-1.5 px-1.5 py-0.5 rounded text-[9px] font-mono border font-bold ${
                  item.badgeColor ||
                  (isDark
                    ? 'bg-[#30363d] text-[#c9d1d9] border-[#484f58]'
                    : 'bg-slate-200 text-slate-800 border-slate-300')
                }`}
              >
                {item.badge}
              </span>
            )}
          </div>
        )}
      </button>
    );
  };

  return (
    <aside
      id="ide-sidebar-nav"
      className={`relative flex flex-col border-r transition-all duration-200 select-none ${
        isCollapsed ? 'w-16' : 'w-52 sm:w-56'
      } ${
        isDark ? 'bg-[#0d1117] border-[#30363d] text-[#c9d1d9]' : 'bg-slate-50 border-slate-300 text-slate-700'
      }`}
    >
      {/* COLLAPSE / EXPAND TOGGLE BAR */}
      <div
        className={`h-8 flex items-center px-3 border-b text-xs font-mono justify-between ${
          isDark ? 'border-[#30363d] text-[#8b949e]' : 'border-slate-200 text-slate-500'
        }`}
      >
        {!isCollapsed && <span className="uppercase text-[9px] font-bold tracking-widest text-[#8b949e]">IDE PANELS</span>}
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="p-1 rounded hover:bg-[#161b22] text-[#8b949e] hover:text-white transition-colors ml-auto"
          title={isCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
        >
          {isCollapsed ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
        </button>
      </div>

      {/* NAV SECTIONS */}
      <div className="flex-1 py-3 space-y-4 overflow-y-auto">
        {/* OPERATIONS GROUP */}
        <div>
          {!isCollapsed && (
            <div className="px-4 mb-1 text-[10px] font-bold text-[#8b949e] tracking-widest uppercase">
              Operations
            </div>
          )}
          <div className="space-y-0.5">{operationsNav.map(renderNavItem)}</div>
        </div>

        {/* OBSERVABILITY GROUP */}
        <div>
          {!isCollapsed && (
            <div className="px-4 mb-1 text-[10px] font-bold text-[#8b949e] tracking-widest uppercase">
              Observability
            </div>
          )}
          <div className="space-y-0.5">{observabilityNav.map(renderNavItem)}</div>
        </div>
      </div>

      {/* BOTTOM SSE STREAM STATUS CARD */}
      {!isCollapsed && (
        <div className="p-3 border-t border-[#30363d] mt-auto">
          <div className="bg-[#161b22] rounded-lg p-3 border border-[#30363d]">
            <div className="text-[10px] text-[#8b949e] uppercase mb-1 font-bold tracking-wider">
              SSE STREAM
            </div>
            <div className="flex items-center text-xs font-bold text-[#3fb950] font-mono">
              <span className="w-2 h-2 bg-[#3fb950] rounded-full mr-2 shadow-[0_0_8px_rgba(63,185,80,0.5)] animate-pulse"></span>
              CONNECTED
            </div>
            <div className="mt-1 text-[9px] text-[#8b949e] font-mono flex justify-between">
              <span>Channel:</span>
              <span className="text-[#58a6ff]">kernel_ch</span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
};

