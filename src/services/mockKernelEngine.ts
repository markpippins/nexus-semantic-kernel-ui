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

class MockKernelEngine {
  private events: TransitionEvent[] = [];
  private receipts: Receipt[] = [];
  private policies: PolicyRule[] = [];
  private subscribers: Array<(event: SSEKernelEvent) => void> = [];
  private isAutoEventBroadcasting = true;
  private autoBroadcastInterval: any = null;
  private startTime = Date.now();

  constructor() {
    this.seedInitialData();
    this.startAutoBroadcaster();
  }

  private seedInitialData() {
    // Initial Policies (Mix of compiled C/C++ native rules and data-driven SQL/JSON rules)
    this.policies = [
      {
        id: 'pol_101',
        rule_name: 'sys_invariant_causality_monotonicity',
        target_aggregate: 'SYSTEM',
        type: 'COMPILED',
        status: 'ACTIVE',
        eval_count: 14205,
        avg_eval_ms: 0.12,
        definition: 'ASSERT event.committed_at >= parent.committed_at AND path_depth <= 64',
        compiled_version: 'v2.4.1-release',
      },
      {
        id: 'pol_102',
        rule_name: 'order_state_transition_validation',
        target_aggregate: 'ORDER',
        type: 'COMPILED',
        status: 'ACTIVE',
        eval_count: 8930,
        avg_eval_ms: 0.28,
        definition: 'MATCH state (INIT -> RESERVED -> AUTHORIZED -> COMMITTED -> FULFILLED)',
        compiled_version: 'v2.4.1-release',
      },
      {
        id: 'pol_103',
        rule_name: 'credit_limit_guardrail',
        target_aggregate: 'ACCOUNT',
        type: 'DATA_DRIVEN',
        status: 'ACTIVE',
        eval_count: 4210,
        avg_eval_ms: 1.45,
        definition: 'SELECT amount FROM kernel.v_aggregate_events WHERE balance - requested >= 0',
      },
      {
        id: 'pol_104',
        rule_name: 'plan_receipt_issuance_gate',
        target_aggregate: 'PLAN_ENGINE',
        type: 'COMPILED',
        status: 'ACTIVE',
        eval_count: 3120,
        avg_eval_ms: 0.19,
        definition: 'FORALL e IN plan.events REQUIRE EXISTS r IN kernel.receipt WHERE r.event_id = e.id',
        compiled_version: 'v2.4.1-release',
      },
      {
        id: 'pol_105',
        rule_name: 'pipeline_stage_integrity_check',
        target_aggregate: 'PIPELINE',
        type: 'DATA_DRIVEN',
        status: 'ACTIVE',
        eval_count: 1890,
        avg_eval_ms: 2.10,
        definition: 'CHECK (payload->>\'stage_id\' IS NOT NULL AND status IN (\'QUEUED\', \'EXEC\', \'DONE\'))',
      },
      {
        id: 'pol_106',
        rule_name: 'idempotency_key_deduplication',
        target_aggregate: 'SYSTEM',
        type: 'COMPILED',
        status: 'ACTIVE',
        eval_count: 22400,
        avg_eval_ms: 0.08,
        definition: 'UNIQUE INDEX ON kernel.transition_event(idempotency_key) WHERE idempotency_key IS NOT NULL',
        compiled_version: 'v2.4.1-release',
      },
      {
        id: 'pol_107',
        rule_name: 'audit_log_retention_policy',
        target_aggregate: 'AUDIT',
        type: 'DATA_DRIVEN',
        status: 'ACTIVE',
        eval_count: 980,
        avg_eval_ms: 3.20,
        definition: 'DELETE FROM kernel.transition_event WHERE committed_at < NOW() - INTERVAL \'90 DAYS\'',
      },
    ];

    // Seed Events & Causality Trees
    const initialEventsData = [
      {
        event_id: 'evt_9001',
        event_type: 'ORDER_INITIALIZED',
        aggregate_type: 'ORDER',
        aggregate_id: 'ord_8841',
        plan_number: 'PLAN-2026-001',
        payload: { customer_id: 'cust_402', amount: 1250.0, currency: 'USD', item_count: 3 },
        causality_parent_id: null,
        lag: 4.2,
      },
      {
        event_id: 'evt_9002',
        event_type: 'POLICY_EVALUATED',
        aggregate_type: 'POLICY_ENGINE',
        aggregate_id: 'pol_102',
        plan_number: 'PLAN-2026-001',
        payload: { policy_id: 'pol_102', result: 'PASSED', execution_time_ms: 0.28 },
        causality_parent_id: 'evt_9001',
        lag: 2.1,
      },
      {
        event_id: 'evt_9003',
        event_type: 'CREDIT_RESERVED',
        aggregate_type: 'ACCOUNT',
        aggregate_id: 'acc_1092',
        plan_number: 'PLAN-2026-001',
        payload: { account_id: 'acc_1092', reserved_amount: 1250.0, balance_after: 8450.0 },
        causality_parent_id: 'evt_9002',
        lag: 3.5,
      },
      {
        event_id: 'evt_9004',
        event_type: 'PAYMENT_AUTHORIZED',
        aggregate_type: 'ORDER',
        aggregate_id: 'ord_8841',
        plan_number: 'PLAN-2026-001',
        payload: { auth_code: 'AUTH_88291X', provider: 'STRIPE_PG', latency_ms: 42 },
        causality_parent_id: 'evt_9003',
        lag: 5.1,
      },
      {
        event_id: 'evt_9005',
        event_type: 'RECEIPT_GENERATED',
        aggregate_type: 'ORDER',
        aggregate_id: 'ord_8841',
        plan_number: 'PLAN-2026-001',
        payload: { receipt_type: 'TRANSACTION_COMMIT', signature_scheme: 'ED25519' },
        causality_parent_id: 'evt_9004',
        lag: 1.8,
      },
      // Second Stream (Pipeline Execution)
      {
        event_id: 'evt_9010',
        event_type: 'PIPELINE_TRIGGERED',
        aggregate_type: 'PIPELINE',
        aggregate_id: 'pipe_v2_99',
        plan_number: 'PLAN-2026-002',
        payload: { pipeline_name: 'SEMA_ETL_NEXUS', triggered_by: 'CRON_SCHEDULER', nodes: 8 },
        causality_parent_id: null,
        lag: 2.9,
      },
      {
        event_id: 'evt_9011',
        event_type: 'STAGE_STARTED',
        aggregate_type: 'PIPELINE',
        aggregate_id: 'pipe_v2_99',
        plan_number: 'PLAN-2026-002',
        payload: { stage_id: 'EXTRACT_PG_WAL', batch_size: 50000 },
        causality_parent_id: 'evt_9010',
        lag: 3.2,
      },
      {
        event_id: 'evt_9012',
        event_type: 'TRANSITION_COMMITTED',
        aggregate_type: 'SYSTEM',
        aggregate_id: 'sys_kernel_root',
        plan_number: 'PLAN-2026-002',
        payload: { transition_code: '0x882F', wal_lsn: '0/1F884210' },
        causality_parent_id: 'evt_9011',
        lag: 1.4,
      },
    ];

    const now = Date.now();
    this.events = initialEventsData.map((e, index) => ({
      event_id: e.event_id,
      event_type: e.event_type,
      aggregate_type: e.aggregate_type,
      aggregate_id: e.aggregate_id,
      payload: e.payload,
      committed_at: new Date(now - (initialEventsData.length - index) * 120000).toISOString(),
      propagation_lag_ms: e.lag,
      causality_parent_id: e.causality_parent_id,
      plan_number: e.plan_number,
      receipt_id: null,
    }));

    // Seed Receipts
    const r1 = this.issueReceiptInternal('evt_9001', 'PLAN-2026-001', 'sys_kernel_authority');
    const r2 = this.issueReceiptInternal('evt_9004', 'PLAN-2026-001', 'sys_kernel_authority');
    const r3 = this.issueReceiptInternal('evt_9005', 'PLAN-2026-001', 'sys_kernel_authority');
    const r4 = this.issueReceiptInternal('evt_9012', 'PLAN-2026-002', 'sys_kernel_authority');

    // Link receipts back to event objects
    if (r1) this.events[0].receipt_id = r1.id;
    if (r2) this.events[3].receipt_id = r2.id;
    if (r3) this.events[4].receipt_id = r3.id;
    if (r4) this.events[7].receipt_id = r4.id;

    // Create an orphan receipt intentionally for integrity check demonstration
    this.receipts.push({
      id: 'rcpt_orphaned_99',
      event_id: 'evt_non_existent_9999',
      issued_at: new Date(now - 300000).toISOString(),
      signature: '0xDE4481...ORPHAN_SIG',
      status: 'ORPHANED',
      plan_number: 'PLAN-2026-OLD',
      issuer: 'sys_kernel_legacy_bridge',
      hash: 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    });
  }

  private issueReceiptInternal(eventId: string, planNumber?: string, issuer = 'kernel.sys_issue_receipt'): Receipt | null {
    const event = this.events.find((e) => e.event_id === eventId);
    if (!event) return null;

    const receiptId = `rcpt_${Math.floor(100000 + Math.random() * 900000)}`;
    const hashHex = Array.from({ length: 64 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
    const signature = `0xSIG_${receiptId}_${hashHex.slice(0, 12).toUpperCase()}`;

    const receipt: Receipt = {
      id: receiptId,
      event_id: eventId,
      issued_at: new Date().toISOString(),
      signature,
      status: 'VALID',
      plan_number: planNumber || event.plan_number || null,
      issuer,
      hash: hashHex,
    };

    this.receipts.unshift(receipt);
    event.receipt_id = receiptId;
    return receipt;
  }

  private startAutoBroadcaster() {
    if (this.autoBroadcastInterval) clearInterval(this.autoBroadcastInterval);
    this.autoBroadcastInterval = setInterval(() => {
      if (!this.isAutoEventBroadcasting || this.subscribers.length === 0) return;

      const eventTypes = [
        { type: 'TRANSITION_COMMITTED', aggType: 'SYSTEM', aggPrefix: 'sys_node' },
        { type: 'ORDER_STATE_CHANGED', aggType: 'ORDER', aggPrefix: 'ord' },
        { type: 'POLICY_CHECK_PASSED', aggType: 'POLICY_ENGINE', aggPrefix: 'pol' },
        { type: 'CREDIT_ADJUSTED', aggType: 'ACCOUNT', aggPrefix: 'acc' },
        { type: 'PIPELINE_BATCH_COMMITTED', aggType: 'PIPELINE', aggPrefix: 'pipe' },
        { type: 'RECEIPT_VERIFIED', aggType: 'RECEIPT_ENGINE', aggPrefix: 'rcpt' },
      ];

      const chosen = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      const randId = Math.floor(1000 + Math.random() * 9000);
      const aggId = `${chosen.aggPrefix}_${randId}`;
      const eventId = `evt_${Math.floor(10000 + Math.random() * 90000)}`;

      // Attach causality to previous event occasionally
      const prevEvent = this.events[0];
      const causalityParent = Math.random() > 0.3 ? prevEvent?.event_id || null : null;

      const lag = +(Math.random() * 6 + 0.8).toFixed(2);
      const newEvent: TransitionEvent = {
        event_id: eventId,
        event_type: chosen.type,
        aggregate_type: chosen.aggType,
        aggregate_id: aggId,
        payload: {
          generated_by: 'MOCK_SSE_ENGINE',
          thread_id: `worker_${Math.floor(Math.random() * 8)}`,
          sequence_lsn: `0/${Math.floor(Math.random() * 0xffffff).toString(16).toUpperCase()}`,
          entropy_tag: Math.random().toString(36).substring(7),
        },
        committed_at: new Date().toISOString(),
        propagation_lag_ms: lag,
        causality_parent_id: causalityParent,
        plan_number: `PLAN-2026-00${Math.floor(1 + Math.random() * 3)}`,
        receipt_id: null,
      };

      this.events.unshift(newEvent);
      if (this.events.length > 200) this.events.pop();

      // Occasionally auto-issue receipt
      if (Math.random() > 0.6) {
        this.issueReceiptInternal(newEvent.event_id, newEvent.plan_number || undefined);
      }

      // Broadcast to SSE listeners
      const sseEvent: SSEKernelEvent = {
        event_id: newEvent.event_id,
        event_type: newEvent.event_type,
        aggregate_type: newEvent.aggregate_type,
        aggregate_id: newEvent.aggregate_id,
        committed_at: newEvent.committed_at,
        propagation_lag_ms: newEvent.propagation_lag_ms,
        payload: newEvent.payload,
      };

      this.subscribers.forEach((cb) => cb(sseEvent));
    }, 3200);
  }

  // --- PUBLIC API WRAPPERS MATCHING kernel-srv ENDPOINTS ---

  public async transition(req: TransitionRequest): Promise<TransitionEvent> {
    const eventId = `evt_${Math.floor(10000 + Math.random() * 90000)}`;
    const lag = +(Math.random() * 4 + 0.5).toFixed(2);

    const event: TransitionEvent = {
      event_id: eventId,
      event_type: req.event_type.toUpperCase().replace(/\s+/g, '_'),
      aggregate_type: req.aggregate_type.toUpperCase(),
      aggregate_id: req.aggregate_id,
      payload: req.payload || {},
      committed_at: new Date().toISOString(),
      propagation_lag_ms: lag,
      causality_parent_id: req.causality_parent_id || null,
      plan_number: req.plan_number || `PLAN-2026-00${Math.floor(1 + Math.random() * 3)}`,
      receipt_id: null,
    };

    this.events.unshift(event);

    // Auto issue receipt if requested implicitly
    if (req.payload?.issue_receipt_immediately) {
      this.issueReceiptInternal(eventId, event.plan_number || undefined);
    }

    // Broadcast SSE
    const sseEvent: SSEKernelEvent = {
      event_id: event.event_id,
      event_type: event.event_type,
      aggregate_type: event.aggregate_type,
      aggregate_id: event.aggregate_id,
      committed_at: event.committed_at,
      propagation_lag_ms: event.propagation_lag_ms,
      payload: event.payload,
    };
    this.subscribers.forEach((cb) => cb(sseEvent));

    return event;
  }

  public async getTransition(eventId: string): Promise<TransitionEvent | null> {
    const evt = this.events.find((e) => e.event_id === eventId);
    if (evt) return evt;

    // Return dummy if requested specific non-seeded event ID
    return {
      event_id: eventId,
      event_type: 'TRANSITION_COMMITTED',
      aggregate_type: 'SYSTEM',
      aggregate_id: 'sys_kernel_dynamic',
      payload: { queried: true, timestamp: new Date().toISOString() },
      committed_at: new Date().toISOString(),
      propagation_lag_ms: 1.85,
      receipt_id: null,
    };
  }

  public async getCausalityChain(eventId: string): Promise<CausalityNode[]> {
    const startEvt = this.events.find((e) => e.event_id === eventId) || this.events[0];
    const nodes: CausalityNode[] = [];

    // Upward parents
    let current: TransitionEvent | undefined = startEvt;
    let depth = 0;
    const path: string[] = [];

    while (current && depth < 6) {
      path.unshift(current.event_id);
      nodes.push({
        event_id: current.event_id,
        event_type: current.event_type,
        aggregate_type: current.aggregate_type,
        aggregate_id: current.aggregate_id,
        depth,
        path: [...path],
        parent_id: current.causality_parent_id || null,
        committed_at: current.committed_at,
        payload_summary: JSON.stringify(current.payload),
        status: 'COMMITTED',
      });

      if (!current.causality_parent_id) break;
      current = this.events.find((e) => e.event_id === current?.causality_parent_id);
      depth++;
    }

    // Downward children
    const children = this.events.filter((e) => e.causality_parent_id === startEvt.event_id);
    children.forEach((child, idx) => {
      nodes.push({
        event_id: child.event_id,
        event_type: child.event_type,
        aggregate_type: child.aggregate_type,
        aggregate_id: child.aggregate_id,
        depth: depth + idx + 1,
        path: [...path, child.event_id],
        parent_id: startEvt.event_id,
        committed_at: child.committed_at,
        payload_summary: JSON.stringify(child.payload),
        status: 'COMMITTED',
      });
    });

    return nodes;
  }

  public async issueReceipt(req: IssueReceiptRequest): Promise<Receipt> {
    const receipt = this.issueReceiptInternal(req.event_id, req.plan_number, req.issuer_identity);
    if (!receipt) {
      throw new Error(`Target event_id '${req.event_id}' not found in kernel transition store.`);
    }
    return receipt;
  }

  public async getReceiptChain(receiptId: string): Promise<ReceiptChainNode[]> {
    const mainReceipt = this.receipts.find((r) => r.id === receiptId) || this.receipts[0];
    const relatedReceipts = this.receipts.filter(
      (r) => r.plan_number === mainReceipt.plan_number || r.id === mainReceipt.id
    );

    return relatedReceipts.map((r, idx) => {
      const targetEvt = this.events.find((e) => e.event_id === r.event_id);
      return {
        receipt_id: r.id,
        event_id: r.event_id,
        event_type: targetEvt?.event_type || 'UNKNOWN_EVENT',
        aggregate_id: targetEvt?.aggregate_id || 'UNKNOWN_AGGREGATE',
        issued_at: r.issued_at,
        hash: r.hash,
        previous_hash: idx > 0 ? relatedReceipts[idx - 1].hash : '0000000000000000000000000000000000000000000000000000000000000000',
        sequence_index: idx + 1,
      };
    });
  }

  public async getPlanReceipts(planNumber: string): Promise<PlanReceipts> {
    const matchingReceipts = this.receipts.filter((r) => r.plan_number === planNumber);
    const matchingEvents = this.events.filter((e) => e.plan_number === planNumber);

    const totalEvents = Math.max(matchingEvents.length, 5);
    const receiptsIssued = matchingReceipts.length;
    const completionPct = Math.min(100, Math.round((receiptsIssued / totalEvents) * 100));

    return {
      plan_number: planNumber,
      plan_name: `System Plan Execution (${planNumber})`,
      total_events: totalEvents,
      receipts_issued: receiptsIssued,
      completion_pct: completionPct,
      status: completionPct >= 100 ? 'COMPLETED' : completionPct > 0 ? 'IN_PROGRESS' : 'PENDING',
      last_updated: new Date().toISOString(),
      receipts: matchingReceipts,
    };
  }

  public async getAggregateEvents(aggregateType: string, aggregateId: string): Promise<AggregateEvent[]> {
    const matched = this.events.filter((e) =>
      e.aggregate_type.toLowerCase() === aggregateType.toLowerCase() &&
      e.aggregate_id.toLowerCase() === aggregateId.toLowerCase()
    );

    if (matched.length === 0) {
      // Fallback: return any matching aggregate_type or all recent events for demonstration
      const typeMatched = this.events.filter((e) => e.aggregate_type.toLowerCase() === aggregateType.toLowerCase());
      const source = typeMatched.length > 0 ? typeMatched : this.events.slice(0, 5);

      return source.map((e, idx) => ({
        aggregate_type: aggregateType.toUpperCase(),
        aggregate_id: aggregateId,
        event_id: e.event_id,
        event_type: e.event_type,
        committed_at: e.committed_at,
        payload: e.payload,
        sequence_number: idx + 1,
      }));
    }

    return matched.map((e, idx) => ({
      aggregate_type: e.aggregate_type,
      aggregate_id: e.aggregate_id,
      event_id: e.event_id,
      event_type: e.event_type,
      committed_at: e.committed_at,
      payload: e.payload,
      sequence_number: idx + 1,
    }));
  }

  public async getActivePolicy(): Promise<PolicyRule[]> {
    return this.policies;
  }

  public async getPolicyMaturity(): Promise<PolicyMaturity> {
    const compiled = this.policies.filter((p) => p.type === 'COMPILED').length;
    const dataDriven = this.policies.filter((p) => p.type === 'DATA_DRIVEN').length;
    const total = compiled + dataDriven;
    const ratio = Math.round((compiled / total) * 100);

    return {
      compiled_count: compiled,
      data_driven_count: dataDriven,
      ratio,
      maturity_grade: ratio >= 70 ? 'ENTERPRISE' : ratio >= 50 ? 'STABLE' : 'TRANSITIONAL',
      total_rules: total,
      breakdown: [
        { aggregate_type: 'SYSTEM', compiled: 2, data_driven: 0, maturity_pct: 100 },
        { aggregate_type: 'ORDER', compiled: 1, data_driven: 0, maturity_pct: 100 },
        { aggregate_type: 'PLAN_ENGINE', compiled: 1, data_driven: 0, maturity_pct: 100 },
        { aggregate_type: 'ACCOUNT', compiled: 0, data_driven: 1, maturity_pct: 0 },
        { aggregate_type: 'PIPELINE', compiled: 0, data_driven: 1, maturity_pct: 0 },
        { aggregate_type: 'AUDIT', compiled: 0, data_driven: 1, maturity_pct: 0 },
      ],
    };
  }

  public async getRecentEvents(limit = 10): Promise<RecentEvent[]> {
    return this.events.slice(0, limit).map((e) => ({
      event_id: e.event_id,
      event_type: e.event_type,
      aggregate_type: e.aggregate_type,
      aggregate_id: e.aggregate_id,
      committed_at: e.committed_at,
      propagation_lag_ms: e.propagation_lag_ms,
      plan_number: e.plan_number,
    }));
  }

  public async getReceiptIntegrity(): Promise<ReceiptIntegrity> {
    const orphans = this.receipts.filter((r) => r.status === 'ORPHANED');
    const total = this.receipts.length;
    const integrityPct = Math.round(((total - orphans.length) / total) * 100);

    return {
      status: orphans.length === 0 ? 'HEALTHY' : orphans.length < 3 ? 'DEGRADED' : 'CRITICAL',
      total_receipts: total,
      orphaned_count: orphans.length,
      orphaned_ids: orphans.map((o) => o.id),
      integrity_pct: integrityPct,
      last_audit_at: new Date().toISOString(),
      orphan_check_details: orphans.map((o) => ({
        receipt_id: o.id,
        event_id: o.event_id,
        issue_reason: `Event '${o.event_id}' missing in kernel.transition_event table back-link.`,
      })),
    };
  }

  public async getHealth(): Promise<KernelHealth> {
    const avgLag = +(this.events.reduce((acc, curr) => acc + curr.propagation_lag_ms, 0) / (this.events.length || 1)).toFixed(2);
    const uptime = Math.floor((Date.now() - this.startTime) / 1000);

    return {
      status: 'healthy',
      db: true,
      pgNotify: true,
      subscribers: Math.max(1, this.subscribers.length),
      uptime_seconds: uptime,
      recent_events_count: this.events.length,
      avg_lag_ms: avgLag,
      kernel_version: 'v2.4.1-pg-semantic-kernel',
    };
  }

  // --- SSE SUBSCRIPTION HANDLER ---
  public subscribeSSE(onMessage: (evt: SSEKernelEvent) => void): () => void {
    this.subscribers.push(onMessage);
    return () => {
      this.subscribers = this.subscribers.filter((s) => s !== onMessage);
    };
  }

  public setAutoBroadcasting(enabled: boolean) {
    this.isAutoEventBroadcasting = enabled;
  }

  public isBroadcastingEnabled(): boolean {
    return this.isAutoEventBroadcasting;
  }

  public getAllEvents(): TransitionEvent[] {
    return [...this.events];
  }

  public getAllReceipts(): Receipt[] {
    return [...this.receipts];
  }
}

export const mockKernelEngine = new MockKernelEngine();
