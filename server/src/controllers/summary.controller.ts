import { Request, Response } from 'express';
import { getDb } from '../config/db.js';
import { MP, Work, Alert, DashboardSummary } from '../types/index.js';
import { AIEngineService } from '../services/aiEngine.service.js';

export class SummaryController {
  public static async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const db = await getDb();
      let mpsSql = `SELECT * FROM mps`;
      let worksSql = `SELECT * FROM works`;
      let alertsSql = `SELECT * FROM alerts`;
      const params: any[] = [];

      // Role-based scoping for summary if logged in
      if (req.user && req.user.role === 'State' && req.user.scope_id && req.user.scope_id !== 'ALL') {
        mpsSql += ` WHERE state = $1`;
        worksSql += ` WHERE state = $1`;
        alertsSql += ` WHERE state = $1`;
        params.push(req.user.scope_id);
      }

      const allMPs = await db.query<MP>(mpsSql, params);
      const allWorks = await db.query<Work>(worksSql, params);
      const allAlerts = await db.query<Alert>(alertsSql, params);
      const stateStats = AIEngineService.calculateStateStats(allMPs);

      const totalFunds = allMPs.reduce((s, r) => s + Number(r.allocated_amount), 0);
      const criticalCount = allMPs.filter(r => r.risk_level === 'critical').length;
      const highCount = allMPs.filter(r => r.risk_level === 'high').length;
      const mediumCount = allMPs.filter(r => r.risk_level === 'medium').length;
      const lowCount = allMPs.filter(r => r.risk_level === 'low').length;
      const anomaliesDetected = allMPs.filter(r => Number(r.risk_score) >= 25).length;

      const currentYear = new Date().getFullYear();
      const costOverruns = allWorks.filter(w => Number(w.expenditure) > Number(w.sanctioned_amount) * 1.1).length;
      const stalledWorks = allWorks.filter(w => w.status === 'Stalled').length;
      const dupWorks = allWorks.filter(w => w.anomaly_type === 'duplicate_work').length;
      const zeroProgress = allWorks.filter(w => w.status !== 'Completed' && Number(w.completion_pct) === 0 && Number(w.start_year || 0) < currentYear - 1).length;

      const summary: DashboardSummary = {
        total_mps: allMPs.length,
        total_funds: totalFunds,
        anomalies_detected: anomaliesDetected,
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
        total_alerts: allAlerts.length,
        states_count: stateStats.length,
        works_anomalies: {
          cost_overruns: costOverruns,
          stalled_works: stalledWorks,
          duplicate_works: dupWorks,
          zero_progress: zeroProgress,
          total_anomalous: costOverruns + stalledWorks + dupWorks + zeroProgress
        }
      };

      res.json({
        success: true,
        data: summary,
        user_scope: req.user ? { role: req.user.role, scope: req.user.scope_id } : null
      });
    } catch (err: any) {
      console.error('Error fetching dashboard summary:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getFullDataset(req: Request, res: Response): Promise<void> {
    try {
      const db = await getDb();
      let mpsSql = `SELECT * FROM mps ORDER BY sr_no ASC, name ASC`;
      let worksSql = `SELECT * FROM works ORDER BY id ASC`;
      let alertsSql = `SELECT * FROM alerts ORDER BY CASE WHEN severity = 'Critical' THEN 1 WHEN severity = 'High' THEN 2 WHEN severity = 'Medium' THEN 3 ELSE 4 END, risk_score DESC`;
      const params: any[] = [];

      // Role scoping
      if (req.user && req.user.role === 'State' && req.user.scope_id && req.user.scope_id !== 'ALL') {
        mpsSql = `SELECT * FROM mps WHERE state = $1 ORDER BY sr_no ASC, name ASC`;
        worksSql = `SELECT * FROM works WHERE state = $1 ORDER BY id ASC`;
        alertsSql = `SELECT * FROM alerts WHERE state = $1 ORDER BY CASE WHEN severity = 'Critical' THEN 1 WHEN severity = 'High' THEN 2 WHEN severity = 'Medium' THEN 3 ELSE 4 END, risk_score DESC`;
        params.push(req.user.scope_id);
      }

      const allMPs = await db.query<MP>(mpsSql, params);
      const allWorks = await db.query<Work>(worksSql, params);
      const allAlerts = await db.query<Alert>(alertsSql, params);
      const assets = await db.query(`SELECT * FROM assets`);
      const assetsMap = Object.fromEntries(assets.map(a => [a.work_id, a]));

      // Format MPs
      const scoredRecords = allMPs.map(m => ({
        id: m.id,
        sr_no: m.sr_no,
        state: m.state,
        district: m.district,
        mp_name: m.name,
        name: m.name,
        mp_name_raw: m.mp_name_raw,
        type: m.constituency_type,
        constituency_type: m.constituency_type,
        allocated_amount: Number(m.allocated_amount),
        term_start: m.term_start,
        term_end: m.term_end,
        house: m.house || (m.source === 'RS_Full' ? 'LS' : 'RS'),
        source: m.source,
        risk_score: Number(m.risk_score || 0),
        risk_level: m.risk_level || 'low',
        z_score: m.z_score ? Number(m.z_score) : 0,
        peer_deviation: m.peer_deviation ? Number(m.peer_deviation) : 0,
        dup_flag: m.dup_flag || 'unique',
        term_flag: m.term_flag || 'valid',
        reasons: typeof m.reasons === 'string' ? JSON.parse(m.reasons) : (m.reasons || [])
      }));

      const rsCurrent = scoredRecords.filter(m => m.house === 'RS' || m.source === 'RS_Current');
      const rsFull = scoredRecords.filter(m => m.house === 'LS' || m.source === 'RS_Full');

      // Enrich synthetic works with anomaly analysis
      const syntheticWorks = allWorks.map(w => {
        const asset = assetsMap[w.id];
        const analysis = AIEngineService.analyzeWorkAnomalies(w, asset);
        return {
          work_id: w.id,
          id: w.id,
          mp_id: w.mp_id,
          mp_name: w.mp_name,
          state: w.state,
          district_id: w.district_id,
          work_type: w.work_type,
          work_name: w.work_name,
          sanctioned_amount: Number(w.sanctioned_amount),
          cost_estimate: Number(w.cost_estimate),
          expenditure: Number(w.expenditure),
          status: w.status,
          start_year: w.start_year,
          start_month: w.start_month,
          completion_pct: Number(w.completion_pct),
          anomaly_type: w.anomaly_type,
          contractor_name: w.contractor_name,
          payment_pct: analysis.payment_pct,
          gap_pct: analysis.gap_pct,
          flags: analysis.flags,
          primary_flag: analysis.flags[0] || null,
          asset: asset || null
        };
      });

      // Format alerts
      const formattedAlerts = allAlerts.map(a => ({
        ...a,
        risk_score: Number(a.risk_score),
        amount: a.amount ? Number(a.amount) : null
      }));

      // State statistics
      const stateStats = AIEngineService.calculateStateStats(allMPs);

      // Dashboard Summary
      const totalFunds = scoredRecords.reduce((s, r) => s + r.allocated_amount, 0);
      const criticalCount = scoredRecords.filter(r => r.risk_level === 'critical').length;
      const highCount = scoredRecords.filter(r => r.risk_level === 'high').length;
      const mediumCount = scoredRecords.filter(r => r.risk_level === 'medium').length;
      const lowCount = scoredRecords.filter(r => r.risk_level === 'low').length;
      const anomaliesDetected = scoredRecords.filter(r => r.risk_score >= 25).length;

      const currentYear = new Date().getFullYear();
      const costOverruns = syntheticWorks.filter(w => w.expenditure > w.sanctioned_amount * 1.1).length;
      const stalledWorks = syntheticWorks.filter(w => w.status === 'Stalled').length;
      const dupWorks = syntheticWorks.filter(w => w.anomaly_type === 'duplicate_work' || w.flags.some(f => f.type === 'duplicate_work')).length;
      const zeroProgress = syntheticWorks.filter(w => w.status !== 'Completed' && w.completion_pct === 0 && Number(w.start_year || 0) < currentYear - 1).length;

      const worksSummary = {
        cost_overruns: costOverruns,
        stalled_works: stalledWorks,
        duplicate_works: dupWorks,
        zero_progress: zeroProgress,
        total_anomalous: costOverruns + stalledWorks + dupWorks + zeroProgress
      };

      const summary: DashboardSummary = {
        total_mps: scoredRecords.length,
        total_funds: totalFunds,
        anomalies_detected: anomaliesDetected,
        critical: criticalCount,
        high: highCount,
        medium: mediumCount,
        low: lowCount,
        total_alerts: formattedAlerts.length,
        states_count: stateStats.length,
        works_anomalies: worksSummary
      };

      const statesSet = new Set(scoredRecords.map(m => m.state));

      // Results bundle matching client expectations
      const results = {
        summary,
        state_stats: stateStats,
        scored_records: scoredRecords,
        rs_current_scored: rsCurrent,
        rs_full_scored: rsFull,
        alerts: formattedAlerts,
        works_anomalies: worksSummary,
        works_alerts: formattedAlerts.filter(a => a.entity_type === 'Work'),
        mp_alerts: formattedAlerts.filter(a => a.entity_type === 'MP')
      };

      const dataset = {
        rs_current: rsCurrent,
        rs_full: rsFull,
        synthetic_works: syntheticWorks,
        results,
        user_scope: req.user ? { role: req.user.role, scope: req.user.scope_id } : null,
        metadata: {
          provenance: {
            mode: 'HYBRID_DEMO',
            mp_records: 'Source-derived from official MPLADS allocation limits',
            works_records: 'Simulated demonstration dataset with injected anomaly scenarios',
            payments: 'Simulated milestone ledgers',
            assets: 'Simulated inspection registry with state coordinates'
          },
          rs_count: rsCurrent.length,
          ls_count: rsFull.length,
          total_allocated_current: rsCurrent.reduce((s, r) => s + r.allocated_amount, 0),
          total_allocated_full: rsFull.reduce((s, r) => s + r.allocated_amount, 0),
          works_count: syntheticWorks.length,
          states: Array.from(statesSet).sort()
        }
      };

      res.json({
        success: true,
        data: dataset
      });
    } catch (err: any) {
      console.error('Error fetching full dataset bundle:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
