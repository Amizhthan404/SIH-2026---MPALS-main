-- ============================================================
-- MPLADS AI Monitoring Platform - PostgreSQL Schema
-- Ministry of Statistics & Programme Implementation (MoSPI)
-- ============================================================

-- Enable UUID extension if available (optional)
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. DISTRICTS TABLE
-- For grouping works and enabling district-level authority scoping
CREATE TABLE IF NOT EXISTS districts (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    state VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_districts_state ON districts(state);
CREATE INDEX IF NOT EXISTS idx_districts_name ON districts(name);

-- 2. MPS TABLE (Members of Parliament)
CREATE TABLE IF NOT EXISTS mps (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    mp_name_raw VARCHAR(255),
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100),
    constituency_type VARCHAR(50) NOT NULL DEFAULT 'Elected MP', -- Elected MP / Nominated MP
    term_start INTEGER,
    term_end INTEGER,
    allocated_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    house VARCHAR(20) NOT NULL DEFAULT 'RS', -- RS (Rajya Sabha) / LS (Lok Sabha)
    source VARCHAR(50) DEFAULT 'RS_Current', -- RS_Current / RS_Full
    sr_no INTEGER,
    risk_score INTEGER DEFAULT 0,
    risk_level VARCHAR(20) DEFAULT 'low', -- low / medium / high / critical
    z_score NUMERIC(6, 3),
    peer_deviation NUMERIC(8, 2),
    dup_flag VARCHAR(50) DEFAULT 'unique',
    term_flag VARCHAR(50) DEFAULT 'valid',
    reasons TEXT, -- JSON text representation of anomaly reason objects
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mps_state ON mps(state);
CREATE INDEX IF NOT EXISTS idx_mps_risk_level ON mps(risk_level);
CREATE INDEX IF NOT EXISTS idx_mps_risk_score ON mps(risk_score);
CREATE INDEX IF NOT EXISTS idx_mps_constituency_type ON mps(constituency_type);
CREATE INDEX IF NOT EXISTS idx_mps_source ON mps(source);

-- 3. WORKS TABLE (MPLADS Sanctioned Works)
CREATE TABLE IF NOT EXISTS works (
    id VARCHAR(50) PRIMARY KEY, -- Work ID e.g. W0001
    mp_id VARCHAR(50) NOT NULL REFERENCES mps(id) ON DELETE CASCADE,
    district_id VARCHAR(50) REFERENCES districts(id) ON DELETE SET NULL,
    state VARCHAR(100) NOT NULL,
    mp_name VARCHAR(255) NOT NULL,
    work_type VARCHAR(100) NOT NULL,
    work_name VARCHAR(255) NOT NULL,
    sanctioned_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    cost_estimate NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    expenditure NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'Sanctioned', -- Sanctioned / In Progress / Completed / Stalled / Tender Stage
    start_date DATE,
    expected_completion_date DATE,
    actual_completion_date DATE,
    completion_pct INTEGER NOT NULL DEFAULT 0,
    contractor_name VARCHAR(255),
    start_year INTEGER,
    start_month INTEGER,
    anomaly_type VARCHAR(50), -- cost_overrun / duplicate_work / stalled_work / no_progress / NULL
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_works_mp_id ON works(mp_id);
CREATE INDEX IF NOT EXISTS idx_works_district_id ON works(district_id);
CREATE INDEX IF NOT EXISTS idx_works_state ON works(state);
CREATE INDEX IF NOT EXISTS idx_works_status ON works(status);
CREATE INDEX IF NOT EXISTS idx_works_anomaly_type ON works(anomaly_type);

-- 4. PAYMENTS TABLE (Disbursements per Work)
CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(50) PRIMARY KEY,
    work_id VARCHAR(50) NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_mode VARCHAR(50) NOT NULL DEFAULT 'PFMS_EAT', -- PFMS_EAT / Direct Bank Transfer / RTGS
    released_by VARCHAR(150) NOT NULL, -- District Collector / Chief Planning Officer / State Nodal Authority
    status VARCHAR(50) NOT NULL DEFAULT 'Released',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_work_id ON payments(work_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);

-- 5. ASSETS TABLE (Geo-tagged Assets Created Under Works)
CREATE TABLE IF NOT EXISTS assets (
    id VARCHAR(50) PRIMARY KEY,
    work_id VARCHAR(50) NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    asset_name VARCHAR(255) NOT NULL,
    asset_status VARCHAR(50) NOT NULL DEFAULT 'Created', -- Created / Verified / Not Verified / Missing
    verification_date DATE,
    verified_by VARCHAR(150),
    geo_lat NUMERIC(10, 6),
    geo_lng NUMERIC(10, 6),
    photo_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assets_work_id ON assets(work_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(asset_status);

-- 6. ALERTS TABLE (AI Anomaly & Risk Alerts)
CREATE TABLE IF NOT EXISTS alerts (
    id VARCHAR(100) PRIMARY KEY,
    entity_type VARCHAR(20) NOT NULL, -- MP / Work
    entity_id VARCHAR(50) NOT NULL, -- mps.id or works.id
    alert_type VARCHAR(50) NOT NULL, -- statistical_outlier / peer_deviation / duplicate_flag / term_compliance / cost_overrun / stalled_work / duplicate_work / no_progress
    risk_score INTEGER NOT NULL DEFAULT 0,
    severity VARCHAR(20) NOT NULL DEFAULT 'Medium', -- Low / Medium / High / Critical
    status VARCHAR(50) NOT NULL DEFAULT 'Open', -- Open / Under Review / Resolved / False Positive
    title VARCHAR(255) NOT NULL,
    description TEXT,
    mp_name VARCHAR(255),
    state VARCHAR(100),
    amount NUMERIC(15, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    resolved_at TIMESTAMP WITH TIME ZONE,
    resolved_by VARCHAR(150)
);

CREATE INDEX IF NOT EXISTS idx_alerts_entity ON alerts(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_type ON alerts(alert_type);
CREATE INDEX IF NOT EXISTS idx_alerts_status ON alerts(status);
CREATE INDEX IF NOT EXISTS idx_alerts_state ON alerts(state);

-- 7. USERS TABLE (RBAC Scoped Access)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL, -- Ministry / State / District / MP
    scope_id VARCHAR(100) NOT NULL DEFAULT 'ALL', -- ALL / State Name / District ID / MP ID
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
