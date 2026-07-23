export interface TransitionRequest {
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  payload: Record<string, any>;
  idempotency_key?: string;
  causality_parent_id?: string;
  plan_number?: string;
}

export interface TransitionEvent {
  event_id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  payload: Record<string, any>;
  committed_at: string;
  propagation_lag_ms: number;
  receipt_id?: string | null;
  causality_parent_id?: string | null;
  plan_number?: string | null;
}

export interface CausalityNode {
  event_id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  depth: number;
  path: string[];
  parent_id: string | null;
  committed_at: string;
  payload_summary: string;
  status: 'COMMITTED' | 'PROCESSING' | 'FLAGGED';
}

export interface IssueReceiptRequest {
  event_id: string;
  plan_number?: string;
  issuer_identity?: string;
}

export interface Receipt {
  id: string;
  event_id: string;
  issued_at: string;
  signature: string;
  status: 'VALID' | 'REVOKED' | 'ORPHANED';
  plan_number: string | null;
  issuer: string;
  hash: string;
}

export interface ReceiptChainNode {
  receipt_id: string;
  event_id: string;
  event_type: string;
  aggregate_id: string;
  issued_at: string;
  hash: string;
  previous_hash: string;
  sequence_index: number;
}

export interface PlanReceipts {
  plan_number: string;
  plan_name: string;
  total_events: number;
  receipts_issued: number;
  completion_pct: number;
  status: 'IN_PROGRESS' | 'COMPLETED' | 'FAILED' | 'PENDING';
  last_updated: string;
  receipts: Receipt[];
}

export interface AggregateEvent {
  aggregate_type: string;
  aggregate_id: string;
  event_id: string;
  event_type: string;
  committed_at: string;
  payload: Record<string, any>;
  sequence_number: number;
}

export interface PolicyRule {
  id: string;
  rule_name: string;
  target_aggregate: string;
  type: 'COMPILED' | 'DATA_DRIVEN';
  status: 'ACTIVE' | 'DISABLED' | 'INSPECTION';
  eval_count: number;
  avg_eval_ms: number;
  definition: string;
  compiled_version?: string;
}

export interface PolicyMaturity {
  compiled_count: number;
  data_driven_count: number;
  ratio: number; // percentage compiled vs total
  maturity_grade: 'ENTERPRISE' | 'STABLE' | 'TRANSITIONAL' | 'EXPERIMENTAL';
  total_rules: number;
  breakdown: Array<{
    aggregate_type: string;
    compiled: number;
    data_driven: number;
    maturity_pct: number;
  }>;
}

export interface RecentEvent {
  event_id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  committed_at: string;
  propagation_lag_ms: number;
  plan_number: string | null;
}

export interface ReceiptIntegrity {
  status: 'HEALTHY' | 'DEGRADED' | 'CRITICAL';
  total_receipts: number;
  orphaned_count: number;
  orphaned_ids: string[];
  integrity_pct: number;
  last_audit_at: string;
  orphan_check_details: Array<{
    receipt_id: string;
    event_id: string;
    issue_reason: string;
  }>;
}

export interface KernelHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  db: boolean;
  pgNotify: boolean;
  subscribers: number;
  uptime_seconds: number;
  recent_events_count: number;
  avg_lag_ms: number;
  kernel_version: string;
}

export interface SSEKernelEvent {
  event_id: string;
  event_type: string;
  aggregate_type: string;
  aggregate_id: string;
  committed_at: string;
  propagation_lag_ms: number;
  payload: Record<string, any>;
}

export type ActiveTab =
  | 'overview'
  | 'transitions'
  | 'causality'
  | 'receipts'
  | 'aggregates'
  | 'policy'
  | 'sse_stream'
  | 'settings';
