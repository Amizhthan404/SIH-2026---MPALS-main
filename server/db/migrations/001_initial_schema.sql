-- Migration: 001_initial_schema.sql
-- Creates mps, districts, works, payments, assets, alerts, users tables

CREATE TABLE IF NOT EXISTS districts (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    state VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_districts_state ON districts(state);
CREATE INDEX IF NOT EXISTS idx_districts_name ON districts(name);

CREATE TABLE IF NOT EXISTS mps (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    mp_name_raw VARCHAR(255),
    state VARCHAR(100) NOT NULL,
    district VARCHAR(100),
    constituency_type VARCHAR(50) NOT NULL DEFAULT 'Elected MP',
    term_start INTEGER,
    term_end INTEGER,
    allocated_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    house VARCHAR(20) NOT NULL DEFAULT 'RS',
    source VARCHAR(50) DEFAULT 'RS_Current',
    sr_no INTEGER,
    risk_score INTEGER DEFAULT 0,
    risk_level VARCHAR(20) DEFAULT 'low',
    z_score NUMERIC(6, 3),
    peer_deviation NUMERIC(8, 2),
    dup_flag VARCHAR(50) DEFAULT 'unique',
    term_flag VARCHAR(50) DEFAULT 'valid',
    reasons TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_mps_state ON mps(state);
CREATE INDEX IF NOT EXISTS idx_mps_risk_level ON mps(risk_level);
CREATE INDEX IF NOT EXISTS idx_mps_risk_score ON mps(risk_score);
CREATE INDEX IF NOT EXISTS idx_mps_constituency_type ON mps(constituency_type);
CREATE INDEX IF NOT EXISTS idx_mps_source ON mps(source);

CREATE TABLE IF NOT EXISTS works (
    id VARCHAR(50) PRIMARY KEY,
    mp_id VARCHAR(50) NOT NULL REFERENCES mps(id) ON DELETE CASCADE,
    district_id VARCHAR(50) REFERENCES districts(id) ON DELETE SET NULL,
    state VARCHAR(100) NOT NULL,
    mp_name VARCHAR(255) NOT NULL,
    work_type VARCHAR(100) NOT NULL,
    work_name VARCHAR(255) NOT NULL,
    sanctioned_amount NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    cost_estimate NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    expenditure NUMERIC(15, 2) NOT NULL DEFAULT 0.00,
    status VARCHAR(50) NOT NULL DEFAULT 'Sanctioned',
    start_date DATE,
    expected_completion_date DATE,
    actual_completion_date DATE,
    completion_pct INTEGER NOT NULL DEFAULT 0,
    contractor_name VARCHAR(255),
    start_year INTEGER,
    start_month INTEGER,
    anomaly_type VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_works_mp_id ON works(mp_id);
CREATE INDEX IF NOT EXISTS idx_works_district_id ON works(district_id);
CREATE INDEX IF NOT EXISTS idx_works_state ON works(state);
CREATE INDEX IF NOT EXISTS idx_works_status ON works(status);
CREATE INDEX IF NOT EXISTS idx_works_anomaly_type ON works(anomaly_type);

CREATE TABLE IF NOT EXISTS payments (
    id VARCHAR(50) PRIMARY KEY,
    work_id VARCHAR(50) NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    amount NUMERIC(15, 2) NOT NULL,
    payment_date DATE NOT NULL,
    payment_mode VARCHAR(50) NOT NULL DEFAULT 'PFMS_EAT',
    released_by VARCHAR(150) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'Released',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_payments_work_id ON payments(work_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);

CREATE TABLE IF NOT EXISTS assets (
    id VARCHAR(50) PRIMARY KEY,
    work_id VARCHAR(50) NOT NULL REFERENCES works(id) ON DELETE CASCADE,
    asset_name VARCHAR(255) NOT NULL,
    asset_status VARCHAR(50) NOT NULL DEFAULT 'Created',
    verification_date DATE,
    verified_by VARCHAR(150),
    geo_lat NUMERIC(10, 6),
    geo_lng NUMERIC(10, 6),
    photo_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_assets_work_id ON assets(work_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON assets(asset_status);

CREATE TABLE IF NOT EXISTS alerts (
    id VARCHAR(100) PRIMARY KEY,
    entity_type VARCHAR(20) NOT NULL,
    entity_id VARCHAR(50) NOT NULL,
    alert_type VARCHAR(50) NOT NULL,
    risk_score INTEGER NOT NULL DEFAULT 0,
    severity VARCHAR(20) NOT NULL DEFAULT 'Medium',
    status VARCHAR(50) NOT NULL DEFAULT 'Open',
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

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    email VARCHAR(150) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    scope_id VARCHAR(100) NOT NULL DEFAULT 'ALL',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
