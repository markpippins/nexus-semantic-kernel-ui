import { mockKernelEngine } from './mockKernelEngine';
import {
  TransitionRequest,
  TransitionEvent,
  CausalityNode,
  IssueReceiptRequest,
  Receipt,
  ReceiptChainNode,
  PlanReceipts,
  AggregateEvent,
  PolicyRule,
  PolicyMaturity,
  RecentEvent,
  ReceiptIntegrity,
  KernelHealth,
  SSEKernelEvent,
} from '../types/kernel';

export interface KernelApiConfig {
  useMock: boolean;
  targetHost: string; // e.g. "http://localhost:8100" or "/api/kernel"
}

class KernelApiClient {
  // Environment-selected mode is authoritative at startup: the live unit
  // builds/runs with mock NOT selected, so the client boots LIVE instead of
  // defaulting to the mock engine or honoring a stale localStorage override
  // from a previous session. Explicit mock is selected via the .env/build
  // configuration (VITE_KERNEL_USE_MOCK=true) or the in-UI toggle.
  private config: KernelApiConfig = {
    useMock: (import.meta as any).env?.VITE_KERNEL_USE_MOCK === 'true',
    targetHost: (import.meta as any).env?.VITE_KERNEL_SRV_URL || '/api/kernel',
  };

  private listeners: Array<(config: KernelApiConfig) => void> = [];

  constructor() {
    // NOTE: no localStorage restore here — the .env/build-selected mode and
    // target host win at startup. The in-UI toggle still switches the
    // session, but a reload returns to the environment-selected contract.
  }

  public getConfig(): KernelApiConfig {
    return { ...this.config };
  }

  public setUseMock(useMock: boolean) {
    this.config.useMock = useMock;
    localStorage.setItem('kernel_use_mock', String(useMock));
    this.notifyListeners();
  }

  public setTargetHost(targetHost: string) {
    this.config.targetHost = targetHost;
    localStorage.setItem('kernel_target_host', targetHost);
    this.notifyListeners();
  }

  public onConfigChange(listener: (config: KernelApiConfig) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((l) => l(this.getConfig()));
  }

  private getBaseUrl(): string {
    let host = this.config.targetHost.trim();
    if (host.endsWith('/')) {
      host = host.slice(0, -1);
    }
    return host;
  }

  // --- API METHODS ---

  public async postTransition(req: TransitionRequest): Promise<TransitionEvent> {
    const body = {
      actor: req.actor || 'sys_architect',
      event_type: req.event_type,
      aggregate_type: req.aggregate_type,
      aggregate_id: req.aggregate_id,
      payload: req.payload || {},
      authority: req.authority,
      receipt: req.receipt,
      causation_id: req.causation_id || req.causality_parent_id,
      correlation_id: req.correlation_id,
      plan_number: req.plan_number,
    };

    if (this.config.useMock) {
      return mockKernelEngine.transition(body);
    }
    try {
      const res = await fetch(`${this.getBaseUrl()}/transitions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      const data = await res.json();
      return data.transition || data;
    } catch (err) {
      // Live failures stay errors — never silently fall back to mock data.
      throw err;
    }
  }

  public async getTransition(eventId: string): Promise<TransitionEvent | null> {
    if (this.config.useMock) {
      return mockKernelEngine.getTransition(eventId);
    }
    try {
      const res = await fetch(`${this.getBaseUrl()}/transitions/${encodeURIComponent(eventId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.transition || data;
    } catch (err) {
      throw err;
    }
  }

  public async getCausalityChain(eventId: string): Promise<CausalityNode[]> {
    if (this.config.useMock) {
      return mockKernelEngine.getCausalityChain(eventId);
    }
    try {
      const res = await fetch(`${this.getBaseUrl()}/transitions/${encodeURIComponent(eventId)}/causality`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.chain)) return data.chain;
      return [];
    } catch (err) {
      throw err;
    }
  }

  public async issueReceipt(req: IssueReceiptRequest): Promise<Receipt> {
    const hashHex =
      req.receipt_hash ||
      Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

    const body = {
      event_id: req.event_id,
      receipt_type: req.receipt_type || 'TRANSACTION_COMMIT',
      receipt_hash: hashHex,
      issued_by: req.issued_by || req.issuer_identity || 'sys_kernel_authority',
      plan_number: req.plan_number,
      metadata: req.metadata,
    };

    if (this.config.useMock) {
      return mockKernelEngine.issueReceipt(body);
    }
    try {
      const res = await fetch(`${this.getBaseUrl()}/receipts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      return data.receipt || data;
    } catch (err) {
      throw err;
    }
  }

  public async getReceiptChain(receiptId: string): Promise<ReceiptChainNode[]> {
    if (this.config.useMock) {
      return mockKernelEngine.getReceiptChain(receiptId);
    }
    try {
      const res = await fetch(`${this.getBaseUrl()}/receipts/${encodeURIComponent(receiptId)}/chain`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.chain)) return data.chain;
      return [];
    } catch (err) {
      throw err;
    }
  }

  public async getPlanReceipts(planNumber: string): Promise<PlanReceipts> {
    if (this.config.useMock) {
      return mockKernelEngine.getPlanReceipts(planNumber);
    }
    try {
      const res = await fetch(`${this.getBaseUrl()}/plans/${encodeURIComponent(planNumber)}/receipts`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const receipts: Receipt[] = data.receipts || (data.chains ? data.chains.map((c: any) => ({
        id: c.receipt_id || c.id,
        event_id: c.event_id,
        issued_at: c.issued_at || new Date().toISOString(),
        signature: c.signature || c.hash,
        status: 'VALID',
        plan_number: planNumber,
        issuer: c.issued_by || 'kernel_authority',
        hash: c.hash || ''
      })) : []);

      return {
        plan_number: data.plan_number || planNumber,
        plan_name: `System Plan (${data.plan_number || planNumber})`,
        total_events: data.summary?.total_events ?? receipts.length,
        receipts_issued: data.summary?.receipts_issued ?? receipts.length,
        completion_pct: data.summary?.completion_pct ?? (receipts.length > 0 ? 100 : 0),
        status: data.summary?.status || (receipts.length > 0 ? 'COMPLETED' : 'PENDING'),
        last_updated: data.summary?.last_updated || new Date().toISOString(),
        receipts,
        summary: data.summary,
        chains: data.chains,
      };
    } catch (err) {
      throw err;
    }
  }

  public async getAggregateEvents(aggregateType: string, aggregateId: string): Promise<AggregateEvent[]> {
    if (this.config.useMock) {
      return mockKernelEngine.getAggregateEvents(aggregateType, aggregateId);
    }
    try {
      const res = await fetch(
        `${this.getBaseUrl()}/aggregates/${encodeURIComponent(aggregateType)}/${encodeURIComponent(aggregateId)}/events`
      );
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.aggregates)) return data.aggregates;
      if (data && data.aggregates && typeof data.aggregates === 'object') return [data.aggregates];
      return [];
    } catch (err) {
      throw err;
    }
  }

  public async getActivePolicy(): Promise<PolicyRule[]> {
    if (this.config.useMock) {
      return mockKernelEngine.getActivePolicy();
    }
    try {
      const res = await fetch(`${this.getBaseUrl()}/policy/active`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.active_rules)) return data.active_rules;
      return [];
    } catch (err) {
      throw err;
    }
  }

  public async getPolicyMaturity(): Promise<PolicyMaturity> {
    if (this.config.useMock) {
      return mockKernelEngine.getPolicyMaturity();
    }
    try {
      const res = await fetch(`${this.getBaseUrl()}/policy/maturity`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const compiled = data.compiled_enabled ?? data.compiled_count ?? 0;
      const dataDriven = data.data_driven_enabled ?? data.data_driven_count ?? 0;
      const total = data.total_rules ?? (compiled + dataDriven);
      const compiledPct = typeof data.compiled_pct === 'number' ? data.compiled_pct : parseFloat(data.compiled_pct) || Math.round((compiled / (total || 1)) * 100);

      return {
        compiled_count: compiled,
        data_driven_count: dataDriven,
        ratio: compiledPct,
        maturity_grade: compiledPct >= 70 ? 'ENTERPRISE' : compiledPct >= 50 ? 'STABLE' : 'TRANSITIONAL',
        total_rules: total,
        enabled_rules: data.enabled_rules,
        compiled_enabled: compiled,
        data_driven_enabled: dataDriven,
        disabled_rules: data.disabled_rules,
        data_driven_pct: data.data_driven_pct,
        compiled_pct: data.compiled_pct,
        breakdown: data.breakdown || [],
      };
    } catch (err) {
      throw err;
    }
  }

  public async getRecentEvents(limit = 10): Promise<RecentEvent[]> {
    if (this.config.useMock) {
      return mockKernelEngine.getRecentEvents(limit);
    }
    try {
      const res = await fetch(`${this.getBaseUrl()}/health/recent-events?limit=${limit}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (Array.isArray(data)) return data;
      if (data && Array.isArray(data.recent)) return data.recent;
      return [];
    } catch (err) {
      throw err;
    }
  }

  public async getReceiptIntegrity(): Promise<ReceiptIntegrity> {
    if (this.config.useMock) {
      return mockKernelEngine.getReceiptIntegrity();
    }
    try {
      const res = await fetch(`${this.getBaseUrl()}/health/receipt-integrity`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();

      const orphanCount = data.orphan_count ?? data.orphaned_count ?? 0;
      const orphans = data.orphans || [];

      return {
        status: orphanCount === 0 ? 'HEALTHY' : orphanCount < 3 ? 'DEGRADED' : 'CRITICAL',
        total_receipts: data.total_receipts ?? 12,
        orphaned_count: orphanCount,
        orphaned_ids: orphans.map((o: any) => o.receipt_id || o.id),
        integrity_pct: Math.max(0, 100 - orphanCount * 10),
        last_audit_at: new Date().toISOString(),
        orphan_check_details: orphans.map((o: any) => ({
          receipt_id: o.receipt_id || o.id,
          event_id: o.event_id,
          issue_reason: `Orphaned receipt of type '${o.receipt_type || 'UNKNOWN'}' issued by ${o.issued_by || 'UNKNOWN'} missing transition back-link.`,
          created_at: o.created_at,
          receipt_type: o.receipt_type,
          receipt_hash: o.receipt_hash,
          issued_by: o.issued_by,
        })),
        orphan_count: orphanCount,
        orphans,
      };
    } catch (err) {
      throw err;
    }
  }

  public async getHealth(): Promise<KernelHealth> {
    if (this.config.useMock) {
      return mockKernelEngine.getHealth();
    }
    try {
      const res = await fetch(`${this.getBaseUrl()}/health`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      // kernel-srv reports status "ok"; map to the UI vocabulary.
      if (data && typeof data === 'object' && data.status === 'ok') {
        return { ...data, status: 'healthy' };
      }
      return data as KernelHealth;
    } catch (err) {
      throw err;
    }
  }

  // --- REAL-TIME SSE STREAM HANDLER ---
  public subscribeEventStream(
    onEvent: (event: SSEKernelEvent) => void,
    onError?: (err: any) => void
  ): () => void {
    if (this.config.useMock) {
      return mockKernelEngine.subscribeSSE(onEvent);
    }

    // Connect to real SSE stream
    const sseUrl = `${this.getBaseUrl()}/events/stream`;
    let eventSource: EventSource | null = null;

    try {
      eventSource = new EventSource(sseUrl);
      eventSource.addEventListener('kernel_event', (e: MessageEvent) => {
        try {
          const parsed = JSON.parse(e.data);
          onEvent(parsed);
        } catch (err) {
          console.error('Error parsing SSE event data:', err);
        }
      });

      eventSource.onerror = (err) => {
        // Live SSE failures surface as errors — no silent mock stream.
        if (onError) onError(err);
      };
    } catch (err) {
      if (onError) onError(err);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }
}

export const kernelApiClient = new KernelApiClient();
