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
  private config: KernelApiConfig = {
    useMock: true,
    targetHost: '/api/kernel',
  };

  private listeners: Array<(config: KernelApiConfig) => void> = [];

  constructor() {
    const savedMock = localStorage.getItem('kernel_use_mock');
    const savedHost = localStorage.getItem('kernel_target_host');

    this.config.useMock = savedMock !== null ? savedMock === 'true' : true;
    if (savedHost) {
      this.config.targetHost = savedHost;
    }
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
    if (this.config.useMock) {
      return mockKernelEngine.transition(req);
    }
    try {
      const res = await fetch(`${this.getBaseUrl()}/transitions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      return await res.json();
    } catch (err) {
      console.warn('Real kernel-srv transition failed, falling back to mock:', err);
      return mockKernelEngine.transition(req);
    }
  }

  public async getTransition(eventId: string): Promise<TransitionEvent | null> {
    if (this.config.useMock) {
      return mockKernelEngine.getTransition(eventId);
    }
    try {
      const res = await fetch(`${this.getBaseUrl()}/transitions/${encodeURIComponent(eventId)}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      return mockKernelEngine.getTransition(eventId);
    }
  }

  public async getCausalityChain(eventId: string): Promise<CausalityNode[]> {
    if (this.config.useMock) {
      return mockKernelEngine.getCausalityChain(eventId);
    }
    try {
      const res = await fetch(`${this.getBaseUrl()}/transitions/${encodeURIComponent(eventId)}/causality`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      return mockKernelEngine.getCausalityChain(eventId);
    }
  }

  public async issueReceipt(req: IssueReceiptRequest): Promise<Receipt> {
    if (this.config.useMock) {
      return mockKernelEngine.issueReceipt(req);
    }
    try {
      const res = await fetch(`${this.getBaseUrl()}/receipts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(req),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      return mockKernelEngine.issueReceipt(req);
    }
  }

  public async getReceiptChain(receiptId: string): Promise<ReceiptChainNode[]> {
    if (this.config.useMock) {
      return mockKernelEngine.getReceiptChain(receiptId);
    }
    try {
      const res = await fetch(`${this.getBaseUrl()}/receipts/${encodeURIComponent(receiptId)}/chain`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      return mockKernelEngine.getReceiptChain(receiptId);
    }
  }

  public async getPlanReceipts(planNumber: string): Promise<PlanReceipts> {
    if (this.config.useMock) {
      return mockKernelEngine.getPlanReceipts(planNumber);
    }
    try {
      const res = await fetch(`${this.getBaseUrl()}/plans/${encodeURIComponent(planNumber)}/receipts`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      return mockKernelEngine.getPlanReceipts(planNumber);
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
      return await res.json();
    } catch (err) {
      return mockKernelEngine.getAggregateEvents(aggregateType, aggregateId);
    }
  }

  public async getActivePolicy(): Promise<PolicyRule[]> {
    if (this.config.useMock) {
      return mockKernelEngine.getActivePolicy();
    }
    try {
      const res = await fetch(`${this.getBaseUrl()}/policy/active`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      return mockKernelEngine.getActivePolicy();
    }
  }

  public async getPolicyMaturity(): Promise<PolicyMaturity> {
    if (this.config.useMock) {
      return mockKernelEngine.getPolicyMaturity();
    }
    try {
      const res = await fetch(`${this.getBaseUrl()}/policy/maturity`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      return mockKernelEngine.getPolicyMaturity();
    }
  }

  public async getRecentEvents(limit = 10): Promise<RecentEvent[]> {
    if (this.config.useMock) {
      return mockKernelEngine.getRecentEvents(limit);
    }
    try {
      const res = await fetch(`${this.getBaseUrl()}/health/recent-events?limit=${limit}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      return mockKernelEngine.getRecentEvents(limit);
    }
  }

  public async getReceiptIntegrity(): Promise<ReceiptIntegrity> {
    if (this.config.useMock) {
      return mockKernelEngine.getReceiptIntegrity();
    }
    try {
      const res = await fetch(`${this.getBaseUrl()}/health/receipt-integrity`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      return mockKernelEngine.getReceiptIntegrity();
    }
  }

  public async getHealth(): Promise<KernelHealth> {
    if (this.config.useMock) {
      return mockKernelEngine.getHealth();
    }
    try {
      const res = await fetch(`${this.getBaseUrl()}/health`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      const h = await mockKernelEngine.getHealth();
      return { ...h, status: 'degraded' };
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
        if (onError) onError(err);
      };
    } catch (err) {
      if (onError) onError(err);
      // Fallback to mock subscription
      return mockKernelEngine.subscribeSSE(onEvent);
    }

    return () => {
      if (eventSource) {
        eventSource.close();
      }
    };
  }
}

export const kernelApiClient = new KernelApiClient();
