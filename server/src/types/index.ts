export interface MP {
  id: string;
  name: string;
  mp_name_raw?: string | null;
  state: string;
  district?: string | null;
  constituency_type: string;
  term_start?: number | null;
  term_end?: number | null;
  allocated_amount: number;
  house: string;
  source?: string | null;
  sr_no?: number | null;
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  z_score?: number | null;
  peer_deviation?: number | null;
  dup_flag?: string | null;
  term_flag?: string | null;
  reasons?: any;
  created_at?: string;
  updated_at?: string;
}

export interface District {
  id: string;
  name: string;
  state: string;
  created_at?: string;
}

export interface Work {
  id: string; // Work ID e.g. W0001
  mp_id: string;
  district_id?: string | null;
  state: string;
  mp_name: string;
  work_type: string;
  work_name: string;
  sanctioned_amount: number;
  cost_estimate: number;
  expenditure: number;
  status: 'Sanctioned' | 'In Progress' | 'Completed' | 'Stalled' | 'Tender Stage';
  start_date?: string | null;
  expected_completion_date?: string | null;
  actual_completion_date?: string | null;
  completion_pct: number;
  contractor_name?: string | null;
  start_year?: number | null;
  start_month?: number | null;
  anomaly_type?: 'cost_overrun' | 'duplicate_work' | 'stalled_work' | 'no_progress' | 'unverified_high_value_asset' | 'rapid_full_payment' | 'payment_before_progress' | string | null;
  created_at?: string;
  updated_at?: string;
}

export interface Payment {
  id: string;
  work_id: string;
  amount: number;
  payment_date: string;
  payment_mode: string;
  released_by: string;
  status: string;
  created_at?: string;
}

export interface Asset {
  id: string;
  work_id: string;
  asset_name: string;
  asset_status: 'Created' | 'Verified' | 'Not Verified' | 'Missing';
  verification_date?: string | null;
  verified_by?: string | null;
  geo_lat?: number | null;
  geo_lng?: number | null;
  photo_url?: string | null;
  created_at?: string;
}

export interface Alert {
  id: string;
  entity_type: 'MP' | 'Work';
  entity_id: string;
  alert_type: string;
  risk_score: number;
  severity: 'Critical' | 'High' | 'Medium' | 'Low';
  status: 'Open' | 'Under Review' | 'Resolved' | 'False Positive';
  title: string;
  description?: string | null;
  mp_name?: string | null;
  state?: string | null;
  amount?: number | null;
  created_at?: string;
  resolved_at?: string | null;
  resolved_by?: string | null;
}

export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  role: 'Ministry' | 'State' | 'District' | 'MP';
  scope_id: string;
  created_at?: string;
}

export interface StateStat {
  state: string;
  mp_count: number;
  total: number;
  avg_allocation: number;
  avg_risk_score: number;
  anomalies: number;
  anomaly_pct: string;
}

export interface DashboardSummary {
  total_mps: number;
  total_funds: number;
  anomalies_detected: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  total_alerts: number;
  states_count: number;
  works_anomalies: {
    cost_overruns: number;
    stalled_works: number;
    duplicate_works: number;
    zero_progress: number;
    total_anomalous: number;
  };
}
