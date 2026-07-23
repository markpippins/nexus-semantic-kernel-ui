import React, { useState, useEffect } from 'react';
import {
  ActiveTab,
  RecentEvent,
  PolicyMaturity,
  ReceiptIntegrity,
  KernelHealth,
  TransitionEvent,
  SSEKernelEvent,
  TransitionRequest,
} from './types/kernel';
import { kernelApiClient, KernelApiConfig } from './services/kernelApiClient';
import { mockKernelEngine } from './services/mockKernelEngine';
import { HeaderAddressBar } from './components/HeaderAddressBar';
import { SidebarNav } from './components/SidebarNav';
import { OverviewDashboard } from './components/OverviewDashboard';
import { TransitionsView } from './components/TransitionsView';
import { CausalityView } from './components/CausalityView';
import { ReceiptsView } from './components/ReceiptsView';
import { AggregateExplorerView } from './components/AggregateExplorerView';
import { PolicyEngineView } from './components/PolicyEngineView';
import { SseStreamView } from './components/SseStreamView';
import { MockEngineSettingsModal } from './components/MockEngineSettingsModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [isDark, setIsDark] = useState(true);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Api Configuration
  const [config, setConfig] = useState<KernelApiConfig>(kernelApiClient.getConfig());

  // Kernel state
  const [health, setHealth] = useState<KernelHealth | null>(null);
  const [recentEvents, setRecentEvents] = useState<RecentEvent[]>([]);
  const [policyMaturity, setPolicyMaturity] = useState<PolicyMaturity | null>(null);
  const [receiptIntegrity, setReceiptIntegrity] = useState<ReceiptIntegrity | null>(null);
  const [sseLogs, setSseLogs] = useState<SSEKernelEvent[]>([]);
  const [allEvents, setAllEvents] = useState<TransitionEvent[]>([]);

  // Navigation focus state
  const [selectedEventIdForCausality, setSelectedEventIdForCausality] = useState<string>('evt_9001');
  const [selectedEventIdForReceipt, setSelectedEventIdForReceipt] = useState<string>('');
  const [isSsePaused, setIsSsePaused] = useState(false);

  // Subscribe to API config changes
  useEffect(() => {
    const unsubscribe = kernelApiClient.onConfigChange((newConfig) => {
      setConfig(newConfig);
      refreshData();
    });
    return () => unsubscribe();
  }, []);

  // Fetch initial telemetry
  useEffect(() => {
    refreshData();
  }, []);

  // Subscribe to live SSE stream
  useEffect(() => {
    const unsubscribe = kernelApiClient.subscribeEventStream((event) => {
      if (!isSsePaused) {
        setSseLogs((prev) => [event, ...prev].slice(0, 100));
        refreshData();
      }
    });

    return () => unsubscribe();
  }, [isSsePaused]);

  const refreshData = async () => {
    try {
      const [healthData, eventsData, maturityData, integrityData] = await Promise.all([
        kernelApiClient.getHealth(),
        kernelApiClient.getRecentEvents(20),
        kernelApiClient.getPolicyMaturity(),
        kernelApiClient.getReceiptIntegrity(),
      ]);

      setHealth(healthData);
      setRecentEvents(eventsData);
      setPolicyMaturity(maturityData);
      setReceiptIntegrity(integrityData);

      if (config.useMock) {
        setAllEvents(mockKernelEngine.getAllEvents());
      } else {
        // Map recent events to full transition event model for selection UI
        setAllEvents(
          eventsData.map((e) => ({
            event_id: e.event_id,
            event_type: e.event_type,
            aggregate_type: e.aggregate_type,
            aggregate_id: e.aggregate_id,
            payload: { timestamp: e.committed_at, source: 'LIVE_KERNEL_SRV' },
            committed_at: e.committed_at,
            propagation_lag_ms: e.propagation_lag_ms,
            plan_number: e.plan_number,
          }))
        );
      }
    } catch (err) {
      console.error('Error refreshing kernel-srv data:', err);
    }
  };

  const handleDispatchTransition = async (req: TransitionRequest): Promise<TransitionEvent | null> => {
    try {
      const event = await kernelApiClient.postTransition(req);
      await refreshData();
      return event;
    } catch (err) {
      console.error('Failed to post transition:', err);
      return null;
    }
  };

  const handleUpdateConfig = (useMock: boolean, targetHost: string) => {
    kernelApiClient.setUseMock(useMock);
    kernelApiClient.setTargetHost(targetHost);
  };

  const handleSeedMockData = () => {
    window.location.reload();
  };

  return (
    <div
      id="semantic-kernel-ide-root"
      className={`h-screen flex flex-col font-mono text-xs select-none transition-colors ${
        isDark ? 'bg-[#010409] text-[#c9d1d9]' : 'bg-slate-100 text-slate-900'
      }`}
    >
      {/* ADDRESSBAR & BRANDING HEADER */}
      <HeaderAddressBar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        config={config}
        health={health}
        isDark={isDark}
        setIsDark={setIsDark}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onExecuteQuickTransition={() => setActiveTab('transitions')}
        onRefreshData={refreshData}
      />

      {/* MAIN IDE BODY */}
      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR NAVIGATION */}
        <SidebarNav
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          isDark={isDark}
          health={health}
          eventsCount={recentEvents.length}
          orphanCount={receiptIntegrity?.orphaned_count || 0}
          isCollapsed={isSidebarCollapsed}
          setIsCollapsed={setIsSidebarCollapsed}
        />

        {/* PRIMARY VIEW CONTENT AREA */}
        <main className={`flex-1 overflow-y-auto relative ${isDark ? 'bg-[#010409]' : 'bg-slate-100'}`}>
          {activeTab === 'overview' && (
            <OverviewDashboard
              recentEvents={recentEvents}
              policyMaturity={policyMaturity}
              receiptIntegrity={receiptIntegrity}
              health={health}
              sseLogs={sseLogs}
              isDark={isDark}
              setActiveTab={setActiveTab}
              onSelectEventForCausality={(id) => {
                setSelectedEventIdForCausality(id);
                setActiveTab('causality');
              }}
              onIssueReceipt={(id) => {
                setSelectedEventIdForReceipt(id);
                setActiveTab('receipts');
              }}
            />
          )}

          {activeTab === 'transitions' && (
            <TransitionsView
              events={allEvents}
              isDark={isDark}
              onSubmitTransition={handleDispatchTransition}
              onSelectEventForCausality={(id) => {
                setSelectedEventIdForCausality(id);
                setActiveTab('causality');
              }}
              onIssueReceipt={(id) => {
                setSelectedEventIdForReceipt(id);
                setActiveTab('receipts');
              }}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'causality' && (
            <CausalityView
              selectedEventId={selectedEventIdForCausality}
              allEvents={allEvents}
              isDark={isDark}
              onIssueReceipt={(id) => {
                setSelectedEventIdForReceipt(id);
                setActiveTab('receipts');
              }}
              setActiveTab={setActiveTab}
            />
          )}

          {activeTab === 'receipts' && (
            <ReceiptsView
              initialEventIdToIssue={selectedEventIdForReceipt}
              allEvents={allEvents}
              isDark={isDark}
              onReceiptIssued={refreshData}
            />
          )}

          {activeTab === 'aggregates' && (
            <AggregateExplorerView allEvents={allEvents} isDark={isDark} />
          )}

          {activeTab === 'policy' && <PolicyEngineView isDark={isDark} />}

          {activeTab === 'sse_stream' && (
            <SseStreamView
              logs={sseLogs}
              isDark={isDark}
              onClearLogs={() => setSseLogs([])}
              isPaused={isSsePaused}
              setIsPaused={setIsPaused}
            />
          )}

          {activeTab === 'settings' && (
            <div className="p-6 max-w-3xl mx-auto space-y-6">
              <div className="flex items-center space-x-2 border-b border-[#30363d] pb-3">
                <span className="font-bold text-base text-[#58a6ff]">IDE Configuration & Mocking Scheme</span>
              </div>
              <p className="text-[#8b949e]">
                You can configure the active mocking scheme or link directly to a local <code className="text-[#3fb950]">kernel-srv</code> instance listening on port 8100.
              </p>
              <button
                onClick={() => setIsSettingsOpen(true)}
                className="px-4 py-2 rounded bg-[#58a6ff] hover:bg-[#79c0ff] text-[#0d1117] font-bold"
              >
                Open Settings Configurator
              </button>
            </div>
          )}
        </main>
      </div>

      {/* BOTTOM STATUS FOOTER BAR */}
      <footer
        id="ide-bottom-status-bar"
        className={`h-6 border-t flex items-center px-4 justify-between text-[10px] font-mono shrink-0 select-none z-10 ${
          isDark
            ? 'bg-[#0d1117] border-[#30363d] text-[#8b949e]'
            : 'bg-slate-200 border-slate-300 text-slate-600'
        }`}
      >
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-1.5">
            <span className="w-2 h-2 rounded-full bg-[#3fb950]" />
            <span className="font-bold text-[#c9d1d9]">PG_KERNEL_READY</span>
          </div>
          <div className="hidden sm:flex items-center space-x-1 text-[#8b949e]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#58a6ff]" />
            <span>CPU: 1.4%</span>
          </div>
          <div className="hidden md:flex items-center space-x-1 text-[#8b949e]">
            <span>MEM: 42MB</span>
          </div>
        </div>

        <div className="flex items-center space-x-4 font-mono">
          <div className="flex items-center space-x-1">
            <span className="text-[#8b949e]">PORT:</span>
            <span className="text-[#3fb950] font-bold">8100</span>
          </div>
          <div className="hidden sm:inline text-[#8b949e]">NODE: v24.15.0</div>
          <div className="hidden md:inline text-[#8b949e]">UTF-8</div>
        </div>
      </footer>

      {/* MOCK ENGINE SETTINGS MODAL */}
      <MockEngineSettingsModal
        config={config}
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onUpdateConfig={handleUpdateConfig}
        isDark={isDark}
        onSeedData={handleSeedMockData}
      />
    </div>
  );
}
