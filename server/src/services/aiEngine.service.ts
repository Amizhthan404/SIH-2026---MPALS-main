import { MP, Work, Alert, StateStat, DashboardSummary } from '../types/index.js';

export interface WorkAnomalyAnalysis {
  payment_pct: number;
  gap_pct: number;
  flags: Array<{
    type: 'payment_before_progress' | 'rapid_full_payment' | 'unverified_high_value_asset' | 'cost_overrun' | 'stalled_work' | 'duplicate_work' | 'no_progress';
    label: string;
    severity: 'Critical' | 'High' | 'Medium' | 'Low';
    icon: string;
    detail: string;
  }>;
}

/**
 * Statistical Anomaly Detection Engine (Rule-based & Anomaly Prioritization)
 * Core Methods: Z-Score Outlier Detection, IQR Fencing, State-level Peer Deviation,
 * Payment-Progress Divergence, and Asset Verification Tracking.
 */
export class AIEngineService {
  private static mean(arr: number[]): number {
    if (!arr.length) return 0;
    return arr.reduce((s, x) => s + x, 0) / arr.length;
  }

  private static stddev(arr: number[]): number {
    if (!arr.length) return 0;
    const m = this.mean(arr);
    return Math.sqrt(arr.reduce((s, x) => s + (x - m) ** 2, 0) / arr.length);
  }

  private static percentile(arr: number[], p: number): number {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const idx = (p / 100) * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
  }

  private static clamp(val: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, val));
  }

  private static fmtAmount(n: number): string {
    if (n >= 1e7) return '₹' + (n / 1e7).toFixed(2) + ' Cr';
    if (n >= 1e5) return '₹' + (n / 1e5).toFixed(2) + ' Lakh';
    return '₹' + n.toLocaleString('en-IN');
  }

  // 1. Z-Score Outlier Detection (30% weight)
  public static zScoreAnalysis(records: MP[]) {
    const amounts = records.map(r => Number(r.allocated_amount));
    const mu = this.mean(amounts);
    const sigma = this.stddev(amounts);

    return records.map(r => {
      const amt = Number(r.allocated_amount);
      const z = sigma > 0 ? Math.abs((amt - mu) / sigma) : 0;
      let flag = 'normal';
      let severity = 0;
      if (z > 3) { flag = 'critical_outlier'; severity = 100; }
      else if (z > 2) { flag = 'high_outlier'; severity = 70; }
      else if (z > 1.5) { flag = 'moderate_outlier'; severity = 40; }

      return { id: r.id, z_score: Number(z.toFixed(3)), flag, z_severity: severity };
    });
  }

  // 2. IQR-Based Outlier Detection (20% weight)
  public static iqrAnalysis(records: MP[]) {
    const amounts = records.map(r => Number(r.allocated_amount)).sort((a, b) => a - b);
    const Q1 = this.percentile(amounts, 25);
    const Q3 = this.percentile(amounts, 75);
    const IQR = Q3 - Q1;
    const lowerFence = Q1 - 1.5 * IQR;
    const upperFence = Q3 + 1.5 * IQR;
    const extremeLower = Q1 - 3 * IQR;
    const extremeUpper = Q3 + 3 * IQR;

    return records.map(r => {
      const amt = Number(r.allocated_amount);
      let iqr_flag = 'normal';
      let iqr_severity = 0;
      if (amt > extremeUpper || amt < extremeLower) {
        iqr_flag = 'extreme_outlier';
        iqr_severity = 90;
      } else if (amt > upperFence || amt < lowerFence) {
        iqr_flag = 'mild_outlier';
        iqr_severity = 50;
      }
      return { id: r.id, Q1, Q3, IQR, lowerFence, upperFence, iqr_flag, iqr_severity };
    });
  }

  // 3. State-Level Peer Comparison (25% weight)
  public static peerAnalysis(records: MP[]) {
    const byState: Record<string, number[]> = {};
    records.forEach(r => {
      if (!byState[r.state]) byState[r.state] = [];
      byState[r.state].push(Number(r.allocated_amount));
    });

    const stateMeans: Record<string, number> = {};
    const stateStd: Record<string, number> = {};

    Object.entries(byState).forEach(([state, vals]) => {
      stateMeans[state] = this.mean(vals);
      stateStd[state] = this.stddev(vals);
    });

    return records.map(r => {
      const sMean = stateMeans[r.state] || 0;
      const amt = Number(r.allocated_amount);
      const pct_dev = sMean > 0 ? ((amt - sMean) / sMean) * 100 : 0;
      let peer_flag = 'normal';
      let peer_severity = 0;

      if (Math.abs(pct_dev) > 60) {
        peer_flag = 'critical_peer_deviation';
        peer_severity = 85;
      } else if (Math.abs(pct_dev) > 35) {
        peer_flag = 'moderate_peer_deviation';
        peer_severity = 50;
      }

      return {
        id: r.id,
        state_mean: sMean,
        pct_deviation: Number(pct_dev.toFixed(1)),
        peer_flag,
        peer_severity
      };
    });
  }

  // 4. Duplicate Allocation Pattern Detection (15% weight)
  public static duplicateDetection(records: MP[]) {
    const amountGroups: Record<string, string[]> = {};
    records.forEach(r => {
      const key = String(Number(r.allocated_amount));
      if (!amountGroups[key]) amountGroups[key] = [];
      amountGroups[key].push(r.id);
    });

    const stateAmountGroups: Record<string, string[]> = {};
    records.forEach(r => {
      const key = `${r.state}::${Number(r.allocated_amount)}`;
      if (!stateAmountGroups[key]) stateAmountGroups[key] = [];
      stateAmountGroups[key].push(r.id);
    });

    return records.map(r => {
      const amtKey = String(Number(r.allocated_amount));
      const stateAmtKey = `${r.state}::${Number(r.allocated_amount)}`;
      const globalGroup = amountGroups[amtKey] || [];
      const stateGroup = stateAmountGroups[stateAmtKey] || [];
      const is_state_dup = stateGroup.length > 1;
      let dup_severity = 0;
      let dup_flag = 'unique';

      if (is_state_dup && stateGroup.length >= 3) {
        dup_flag = 'high_state_duplicate';
        dup_severity = 50;
      } else if (is_state_dup) {
        dup_flag = 'state_duplicate';
        dup_severity = 25;
      }

      return {
        id: r.id,
        dup_flag,
        dup_severity,
        global_dup_count: globalGroup.length,
        state_dup_count: stateGroup.length
      };
    });
  }

  // 5. Term Compliance Check (10% weight)
  public static termComplianceAnalysis(records: MP[]) {
    const currentYear = new Date().getFullYear();
    return records.map(r => {
      let term_flag = 'valid';
      let term_severity = 0;
      if (r.term_end && r.term_end < currentYear - 1) {
        term_flag = 'term_expired';
        term_severity = 60;
      } else if (!r.term_start || !r.term_end) {
        // Data completeness note: DO NOT penalize missing term data as fraud risk
        term_flag = 'no_term_data';
        term_severity = 0;
      } else if (r.term_end < currentYear) {
        term_flag = 'term_recent_expired';
        term_severity = 30;
      }
      return { id: r.id, term_flag, term_severity };
    });
  }

  // Compute composite priority scores for MPs
  public static computeRiskScores(records: MP[]): MP[] {
    const zData = this.zScoreAnalysis(records);
    const iqrData = this.iqrAnalysis(records);
    const peerData = this.peerAnalysis(records);
    const dupData = this.duplicateDetection(records);
    const termData = this.termComplianceAnalysis(records);

    const zMap = Object.fromEntries(zData.map(d => [d.id, d]));
    const iqrMap = Object.fromEntries(iqrData.map(d => [d.id, d]));
    const peerMap = Object.fromEntries(peerData.map(d => [d.id, d]));
    const dupMap = Object.fromEntries(dupData.map(d => [d.id, d]));
    const termMap = Object.fromEntries(termData.map(d => [d.id, d]));

    const scored = records.map(r => {
      const z_s = zMap[r.id]?.z_severity || 0;
      const iqr_s = iqrMap[r.id]?.iqr_severity || 0;
      const peer_s = peerMap[r.id]?.peer_severity || 0;
      const dup_s = dupMap[r.id]?.dup_severity || 0;
      const term_s = termMap[r.id]?.term_severity || 0;

      const raw = 0.35 * z_s + 0.25 * iqr_s + 0.30 * peer_s + 0.05 * dup_s + 0.05 * term_s;
      const risk_score = Math.round(this.clamp(raw, 0, 100));

      let risk_level: 'low' | 'medium' | 'high' | 'critical';
      if (risk_score >= 75) risk_level = 'critical';
      else if (risk_score >= 50) risk_level = 'high';
      else if (risk_score >= 25) risk_level = 'medium';
      else risk_level = 'low';

      const reasons: Array<{ type: string; detail: string }> = [];
      const zd = zMap[r.id];
      const pd = peerMap[r.id];
      const dd = dupMap[r.id];
      const td = termMap[r.id];

      if (zd?.flag !== 'normal') {
        reasons.push({ type: 'statistical_outlier', detail: `Z-score: ${zd.z_score} (${zd.flag.replace(/_/g, ' ')})` });
      }
      if (pd?.peer_flag !== 'normal') {
        reasons.push({ type: 'peer_deviation', detail: `${pd.pct_deviation > 0 ? '+' : ''}${pd.pct_deviation}% vs state average` });
      }
      if (dd?.dup_flag !== 'unique' && dd?.dup_severity > 0) {
        reasons.push({ type: 'duplicate_flag', detail: `Identical allocation repeated across ${dd.state_dup_count} MPs in state` });
      }
      if (td?.term_flag !== 'valid' && td?.term_severity > 0) {
        reasons.push({ type: 'term_compliance', detail: td.term_flag.replace(/_/g, ' ') });
      }

      return {
        ...r,
        risk_score,
        risk_level,
        reasons,
        z_score: zd?.z_score,
        peer_deviation: pd?.pct_deviation,
        dup_flag: dd?.dup_flag,
        term_flag: td?.term_flag
      };
    });

    return scored.sort((a, b) => b.risk_score - a.risk_score);
  }

  // 6. Comprehensive Works Anomaly Analysis (Payment Before Progress, Rapid Full Payment, Unverified High-Value Asset, etc.)
  public static analyzeWorkAnomalies(work: Work, asset?: any): WorkAnomalyAnalysis {
    const sAmt = Number(work.sanctioned_amount) || 0;
    const exp = Number(work.expenditure) || 0;
    const compPct = Number(work.completion_pct) || 0;
    const paidPct = sAmt > 0 ? Number(((exp / sAmt) * 100).toFixed(1)) : 0;
    const gapPct = Number((paidPct - compPct).toFixed(1));

    const flags: WorkAnomalyAnalysis['flags'] = [];

    // Flag 1: Rapid Full Payment (>= 85% paid out while progress <= 20%)
    if (paidPct >= 85 && compPct <= 20) {
      flags.push({
        type: 'rapid_full_payment',
        label: 'Rapid Full Payment',
        severity: 'Critical',
        icon: '⚡',
        detail: `⚠ ${paidPct}% paid out rapidly, but only ${compPct}% physical progress recorded`
      });
    }
    // Flag 2: Payment Before Progress (paid% exceeds completion% by >= 25% or >= 40% paid at <= 10% completion)
    else if (gapPct >= 25 || (paidPct >= 40 && compPct <= 10)) {
      flags.push({
        type: 'payment_before_progress',
        label: 'Payment-Progress Divergence',
        severity: 'High',
        icon: '⚠️',
        detail: `⚠ ${paidPct}% funds released, while only ${compPct}% physical work built (+${gapPct}pp gap)`
      });
    }

    // Flag 3: Unverified High-Value Asset (>= 25 Lakhs and Completed/Stalled, asset not verified)
    const isHighValue = sAmt >= 2500000;
    const isCompletedOrNear = work.status === 'Completed' || compPct >= 80;
    const assetStatus = asset?.asset_status || (work.status === 'Completed' ? 'Verified' : 'Created');
    const isUnverified = assetStatus === 'Not Verified' || assetStatus === 'Missing' || !asset?.verification_date;

    if (isHighValue && isCompletedOrNear && isUnverified) {
      flags.push({
        type: 'unverified_high_value_asset',
        label: 'Unverified High-Value Asset',
        severity: 'Critical',
        icon: '🔍',
        detail: `⚠ High-value project (${this.fmtAmount(sAmt)}) completed but physical asset not verified`
      });
    }

    // Flag 4: Cost Overrun
    if (exp > sAmt * 1.1) {
      const overrunPct = (((exp - sAmt) / sAmt) * 100).toFixed(1);
      flags.push({
        type: 'cost_overrun',
        label: 'Cost Overrun',
        severity: parseFloat(overrunPct) > 25 ? 'High' : 'Medium',
        icon: '💸',
        detail: `⚠ Expenditure ${this.fmtAmount(exp)} exceeds sanctioned ${this.fmtAmount(sAmt)} by ${overrunPct}%`
      });
    }

    // Flag 5: Stalled Work
    if (work.status === 'Stalled') {
      flags.push({
        type: 'stalled_work',
        label: 'Stalled Project',
        severity: 'Medium',
        icon: '⏸',
        detail: `⚠ Work initiated in ${work.start_year || 'N/A'} remains stalled at ${compPct}% completion`
      });
    }

    // Flag 6: Duplicate Work Similarity
    if (work.anomaly_type === 'duplicate_work') {
      flags.push({
        type: 'duplicate_work',
        label: 'Duplicate Work Candidate',
        severity: 'High',
        icon: '📋',
        detail: `⚠ High lexical & sanction overlap detected with neighboring work in ${work.state}`
      });
    }

    // Flag 7: No Progress
    const currentYear = new Date().getFullYear();
    if (work.status !== 'Completed' && compPct === 0 && Number(work.start_year || 0) < currentYear - 1) {
      flags.push({
        type: 'no_progress',
        label: 'Zero Physical Progress',
        severity: 'Low',
        icon: '⏳',
        detail: `⚠ Work sanctioned in ${work.start_year} shows 0% completion with no progress milestone`
      });
    }

    return {
      payment_pct: paidPct,
      gap_pct: gapPct,
      flags
    };
  }

  // Generate alerts from scored MPs and works with dynamic relative timestamps
  public static generateAlerts(scoredRecords: MP[], works: Work[], assetsMap: Record<string, any> = {}): Alert[] {
    const alerts: Alert[] = [];
    const now = new Date();

    // 1. MP-based alerts
    scoredRecords.forEach((r, idx) => {
      const reasons = Array.isArray(r.reasons) ? r.reasons : (typeof r.reasons === 'string' ? JSON.parse(r.reasons) : []);
      reasons.forEach((reason: any) => {
        let severity: 'Critical' | 'High' | 'Medium' | 'Low';
        if (r.risk_score >= 75) severity = 'Critical';
        else if (r.risk_score >= 50) severity = 'High';
        else if (r.risk_score >= 25) severity = 'Medium';
        else severity = 'Low';

        let title = `Anomaly Flagged — ${r.name.split(' ').slice(0, 3).join(' ')}`;
        if (reason.type === 'statistical_outlier') title = `Allocation Outlier: ${r.name.split(' ').slice(0, 3).join(' ')}`;
        else if (reason.type === 'peer_deviation') title = `State Peer Deviation — ${r.state}`;
        else if (reason.type === 'duplicate_flag') title = `Duplicate Allocation Pattern`;
        else if (reason.type === 'term_compliance') title = `Term Audit Flag: ${r.name.split(' ').slice(0, 3).join(' ')}`;

        const alertTime = new Date(now.getTime() - (idx * 4 + 5) * 60000);

        alerts.push({
          id: `ALERT_${r.id}_${reason.type}`,
          entity_type: 'MP',
          entity_id: r.id,
          alert_type: reason.type,
          risk_score: r.risk_score,
          severity,
          status: 'Open',
          title,
          description: reason.detail,
          mp_name: r.name,
          state: r.state,
          amount: Number(r.allocated_amount),
          created_at: alertTime.toISOString()
        });
      });
    });

    // 2. Works-based alerts including payment and asset flags
    works.forEach((w, idx) => {
      const asset = assetsMap[w.id];
      const analysis = this.analyzeWorkAnomalies(w, asset);

      analysis.flags.forEach(f => {
        const alertTime = new Date(now.getTime() - (idx * 3 + 12) * 60000);

        let riskScore = 40;
        if (f.severity === 'Critical') riskScore = 82;
        else if (f.severity === 'High') riskScore = 65;
        else if (f.severity === 'Medium') riskScore = 45;
        else riskScore = 20;

        alerts.push({
          id: `ALERT_WORK_${w.id}_${f.type}`,
          entity_type: 'Work',
          entity_id: w.id,
          alert_type: f.type,
          risk_score: riskScore,
          severity: f.severity,
          status: f.severity === 'Critical' ? 'Open' : 'Under Review',
          title: `${f.label}: ${w.work_name}`,
          description: f.detail,
          mp_name: w.mp_name,
          state: w.state,
          amount: Number(w.expenditure || w.sanctioned_amount),
          created_at: alertTime.toISOString()
        });
      });
    });

    const severityOrder = { Critical: 0, High: 1, Medium: 2, Low: 3 };
    return alerts.sort((a, b) => (severityOrder[a.severity] ?? 3) - (severityOrder[b.severity] ?? 3));
  }

  // Calculate state stats
  public static calculateStateStats(records: MP[]): StateStat[] {
    const byState: Record<string, { state: string; mps: MP[]; total: number; anomalies: number; risk_sum: number }> = {};

    records.forEach(r => {
      const amt = Number(r.allocated_amount);
      const score = Number(r.risk_score || 0);
      if (!byState[r.state]) {
        byState[r.state] = { state: r.state, mps: [], total: 0, anomalies: 0, risk_sum: 0 };
      }
      byState[r.state].mps.push(r);
      byState[r.state].total += amt;
      byState[r.state].anomalies += (score >= 25 ? 1 : 0);
      byState[r.state].risk_sum += score;
    });

    return Object.values(byState).map(s => {
      const count = s.mps.length;
      return {
        state: s.state,
        mp_count: count,
        total: s.total,
        avg_allocation: count > 0 ? s.total / count : 0,
        avg_risk_score: count > 0 ? s.risk_sum / count : 0,
        anomalies: s.anomalies,
        anomaly_pct: count > 0 ? (s.anomalies / count * 100).toFixed(1) : '0.0'
      };
    }).sort((a, b) => b.total - a.total);
  }
}
