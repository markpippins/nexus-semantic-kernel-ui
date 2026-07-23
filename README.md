# `kernel-srv` Downstream Integration & Conversion Guide

This document provides complete instructions for converting the standalone/mock IDE environment into a production-grade live `kernel-srv` (PG Semantic Kernel) instance backed by PostgreSQL, PL/pgSQL view abstractions, and an Express/SSE server bridge listening on port `8100`.

---

## 🏛️ Architecture Overview

The `kernel-srv` engine operates on an **append-only transition log & state view model** backed by PostgreSQL triggers and dynamic asynchronous notification channels.

```
┌─────────────────────────┐          ┌──────────────────────────┐          ┌──────────────────────────┐
│  Client / Semantic IDE  │ ──REST──>│ Express API Server       │ ──SQL───>│ PostgreSQL Database      │
│  (React + Tailwind)     │ <──SSE── │ (port 8100)              │ <─NOTIFY─│ (kernel schema)          │
└─────────────────────────┘          └──────────────────────────┘          └──────────────────────────┘
```

### Core Invariants & Features
1. **Append-Only Transition Log (`kernel.transitions`)**: Every event is written sequentially with monotonic `plan_number` counters and UUID event identifiers.
2. **Deterministic Causality Chains (`kernel.v_causality_chain`)**: Causality is indexed via tree traversal on `parent_event_id` and root event origins.
3. **Receipt & Integrity Audit (`kernel.v_receipt_integrity`)**: Cryptographic receipt verification linking event hashes (`sha256(event_id + payload + timestamp)`) to prevent orphaned or mutated state transitions.
4. **Policy Engine Maturity (`kernel.v_policy_maturity`)**: Calculates the ratio of sub-millisecond compiled native invariants (C/C++ binary) versus data-driven SQL policy rules.
5. **Real-time SSE Notification (`pg_notify 'kernel_transition_committed'`)**: PostgreSQL trigger pushes commit payloads directly to connected SSE listeners.

---

## 🗄️ Database Schemas & DDL (PostgreSQL)

To deploy the production database schema, execute the following SQL scripts on your target PostgreSQL 14+ instance:

```sql
-- Create Kernel Schema
CREATE SCHEMA IF NOT EXISTS kernel;

-- 1. Transitions Table
CREATE TABLE IF NOT EXISTS kernel.transitions (
  event_id VARCHAR(64) PRIMARY KEY,
  event_type VARCHAR(64) NOT NULL,
  aggregate_type VARCHAR(64) NOT NULL,
  aggregate_id VARCHAR(64) NOT NULL,
  parent_event_id VARCHAR(64) REFERENCES kernel.transitions(event_id),
  plan_number BIGINT NOT NULL,
  payload JSONB NOT NULL DEFAULT '{}'::jsonb,
  committed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transitions_agg ON kernel.transitions(aggregate_type, aggregate_id);
CREATE INDEX IF NOT EXISTS idx_transitions_committed ON kernel.transitions(committed_at DESC);

-- 2. Receipts Table
CREATE TABLE IF NOT EXISTS kernel.receipts (
  receipt_id VARCHAR(64) PRIMARY KEY,
  event_id VARCHAR(64) NOT NULL REFERENCES kernel.transitions(event_id),
  merkle_root VARCHAR(128) NOT NULL,
  signature_hash VARCHAR(128) NOT NULL,
  verified_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. Policy Rules Table
CREATE TABLE IF NOT EXISTS kernel.policies (
  id VARCHAR(64) PRIMARY KEY,
  rule_name VARCHAR(128) NOT NULL,
  target_aggregate VARCHAR(64) NOT NULL,
  rule_type VARCHAR(16) NOT NULL CHECK (rule_type IN ('COMPILED', 'DATA_DRIVEN')),
  eval_count BIGINT DEFAULT 0,
  avg_eval_ms NUMERIC(6, 3) DEFAULT 0.050,
  definition TEXT NOT NULL,
  active BOOLEAN DEFAULT TRUE
);

-- Insert Default Policy Rules
INSERT INTO kernel.policies (id, rule_name, target_aggregate, rule_type, eval_count, avg_eval_ms, definition, active)
VALUES
  ('pol_101', 'invariant_aggregate_id_format', 'ALL', 'COMPILED', 142050, 0.012, 'Regex check: ^[a-z0-9_-]{3,64}$', true),
  ('pol_102', 'strict_monotonic_plan_counter', 'TRANSITION', 'COMPILED', 98210, 0.024, 'Ensure plan_number > MAX(plan_number)', true),
  ('pol_103', 'causality_depth_limit', 'CAUSALITY', 'COMPILED', 65400, 0.018, 'Max depth recursion <= 32 nodes', true),
  ('pol_104', 'receipt_merkle_checksum', 'RECEIPT', 'COMPILED', 45120, 0.035, 'SHA256 merkle checksum verification', true),
  ('pol_105', 'non_zero_payload_guard', 'PAYMENT', 'COMPILED', 31200, 0.008, 'Payload must contain non-null amount', true),
  ('pol_106', 'sql_orphan_receipt_detector', 'RECEIPT', 'DATA_DRIVEN', 12400, 1.250, 'SELECT COUNT(*) FROM receipts WHERE event_id NOT IN (transitions)', true),
  ('pol_107', 'sql_lag_anomaly_filter', 'OBSERVABILITY', 'DATA_DRIVEN', 8900, 2.100, 'Alert when propagation_lag_ms > 150ms', true)
ON CONFLICT (id) DO NOTHING;

-- 4. View: Policy Maturity
CREATE OR REPLACE VIEW kernel.v_policy_maturity AS
WITH stats AS (
  SELECT
    COUNT(*) FILTER (WHERE rule_type = 'COMPILED') AS compiled_count,
    COUNT(*) FILTER (WHERE rule_type = 'DATA_DRIVEN') AS data_driven_count,
    COUNT(*) AS total_count
  FROM kernel.policies
  WHERE active = TRUE
)
SELECT
  compiled_count,
  data_driven_count,
  total_count,
  ROUND((compiled_count::numeric / NULLIF(total_count, 0)) * 100, 1) AS ratio,
  CASE
    WHEN ROUND((compiled_count::numeric / NULLIF(total_count, 0)) * 100, 1) >= 70 THEN 'ENTERPRISE'
    WHEN ROUND((compiled_count::numeric / NULLIF(total_count, 0)) * 100, 1) >= 50 THEN 'MATURE'
    ELSE 'DEVELOPMENT'
  END AS maturity_grade
FROM stats;

-- 5. View: Active Policy
CREATE OR REPLACE VIEW kernel.v_active_policy AS
SELECT
  id,
  rule_name,
  target_aggregate,
  rule_type AS type,
  eval_count,
  avg_eval_ms,
  definition
FROM kernel.policies
WHERE active = TRUE
ORDER BY rule_type ASC, eval_count DESC;

-- 6. View: Receipt Integrity
CREATE OR REPLACE VIEW kernel.v_receipt_integrity AS
SELECT
  (SELECT COUNT(*) FROM kernel.receipts) AS total_receipts,
  (SELECT COUNT(*) FROM kernel.receipts r LEFT JOIN kernel.transitions t ON r.event_id = t.event_id WHERE t.event_id IS NULL) AS orphaned_count,
  (SELECT COUNT(*) FROM kernel.transitions t LEFT JOIN kernel.receipts r ON t.event_id = r.event_id WHERE r.receipt_id IS NULL) AS pending_receipts_count,
  CASE
    WHEN (SELECT COUNT(*) FROM kernel.receipts r LEFT JOIN kernel.transitions t ON r.event_id = t.event_id WHERE t.event_id IS NULL) = 0 THEN 'PASS'
    ELSE 'FAIL'
  END AS status;

-- 7. Trigger Function for Real-Time PG_NOTIFY
CREATE OR REPLACE FUNCTION kernel.fn_notify_transition_committed()
RETURNS trigger AS $$
DECLARE
  payload json;
BEGIN
  payload = json_build_object(
    'event_id', NEW.event_id,
    'event_type', NEW.event_type,
    'aggregate_type', NEW.aggregate_type,
    'aggregate_id', NEW.aggregate_id,
    'parent_event_id', NEW.parent_event_id,
    'plan_number', NEW.plan_number,
    'payload', NEW.payload,
    'committed_at', NEW.committed_at,
    'propagation_lag_ms', GREATEST(0, ROUND(EXTRACT(EPOCH FROM (NOW() - NEW.committed_at)) * 1000))
  );

  PERFORM pg_notify('kernel_transition_committed', payload::text);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_notify_transition ON kernel.transitions;
CREATE TRIGGER trg_notify_transition
AFTER INSERT ON kernel.transitions
FOR EACH ROW EXECUTE FUNCTION kernel.fn_notify_transition_committed();
```

---

## ⚡ Server & SSE Bridge Implementation (`server.ts`)

In production, run `server.ts` with Express and `pg` (PostgreSQL client) to listen for `pg_notify` notifications and stream events over Server-Sent Events (SSE).

### API Contract Reference

| Endpoint | Method | Description |
| :--- | :--- | :--- |
| `/api/kernel/health` | `GET` | Returns status, active subscribers count, database ping, and uptime |
| `/api/kernel/events/recent` | `GET` | Fetches the latest committed transitions (query param: `limit=20`) |
| `/api/kernel/events/stream` | `GET` | Server-Sent Events (SSE) live transition stream |
| `/api/kernel/transitions` | `POST` | Dispatches a new state transition to `kernel.transitions` |
| `/api/kernel/policy/maturity` | `GET` | Returns policy maturity breakdown from `kernel.v_policy_maturity` |
| `/api/kernel/policy/active` | `GET` | Returns active policy invariants from `kernel.v_active_policy` |
| `/api/kernel/receipts/integrity` | `GET` | Returns receipt integrity metrics from `kernel.v_receipt_integrity` |
| `/api/kernel/receipts` | `POST` | Issues a signed cryptographic receipt for a transition |

---

## 🚀 Step-by-Step Downstream Conversion

To switch the IDE frontend from **Standalone Mock Engine** to **Live Backend Mode**:

1. **Deploy PostgreSQL**: Execute the DDL script above in your PostgreSQL database.
2. **Set Environment Variable**: In `.env`, configure the connection string:
   ```env
   DATABASE_URL=postgresql://user:password@localhost:5432/kernel_db
   PORT=8100
   ```
3. **Start the Express Server**:
   ```bash
   npm run dev
   ```
4. **Switch Execution Provider in UI**:
   - Open the **IDE Settings / Configurator** (`⌘8` or gear icon).
   - Change Execution Provider Scheme to **LIVE KERNEL-SRV API**.
   - Verify connection status in the address bar indicator and lower-left status widget.

---

## 🧪 Testing with cURL

Test dispatching a transition manually via cURL:

```bash
curl -X POST http://localhost:8100/api/kernel/transitions \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "ORDER_COMMITTED",
    "aggregate_type": "ORDER",
    "aggregate_id": "ord_8841",
    "payload": {
      "amount": 1250.00,
      "status": "COMMITTED",
      "currency": "USD"
    }
  }'
```

---

## 📁 Repository Structure

```
├── README.md                          # Downstream integration & conversion guide
├── server.ts                          # Express backend API & PostgreSQL LISTEN/NOTIFY SSE bridge
├── src/
│   ├── App.tsx                        # Main IDE layout, tab navigation, footer status bar
│   ├── index.css                      # Tailwind styling & dark theme variables
│   ├── components/
│   │   ├── HeaderAddressBar.tsx       # Immersive UI header with address bar & theme toggle
│   │   ├── SidebarNav.tsx             # Operations & Observability navigation
│   │   ├── OverviewDashboard.tsx      # System health, maturity, metrics, transition table
│   │   ├── TransitionsView.tsx        # Event dispatcher & filterable transition log
│   │   ├── CausalityView.tsx          # Graph visualization of event dependencies
│   │   ├── ReceiptsView.tsx           # Cryptographic receipt audit & orphan detector
│   │   ├── AggregateExplorerView.tsx  # State projector grouped by aggregate_type
│   │   ├── PolicyEngineView.tsx       # Native binary vs SQL policy rules breakdown
│   │   ├── SseStreamView.tsx          # Real-time SSE console terminal
│   │   └── MockEngineSettingsModal.tsx # Execution provider switcher
│   ├── services/
│   │   ├── kernelApiClient.ts         # Unified API client (Mock / Live mode abstraction)
│   │   └── mockKernelEngine.ts        # Built-in state generator & SSE event broadcaster
│   └── types/
│       └── kernel.ts                  # TypeScript interfaces for transitions, policies, receipts
```
