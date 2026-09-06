import { Request, Response } from 'express';
import { getDb } from '../config/db.js';
import { Work } from '../types/index.js';
import { AIEngineService } from '../services/aiEngine.service.js';

export class WorksController {
  public static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const db = await getDb();
      const {
        anomaly_type,
        state: queryState,
        status,
        mp_id,
        district_id,
        search,
        sort = 'gap_desc',
        limit,
        offset = 0,
        all
      } = req.query;

      let sql = `SELECT * FROM works WHERE 1=1`;
      const params: any[] = [];
      let pIdx = 1;

      // Role-based scoping
      let activeState = queryState;
      if (req.user && req.user.role === 'State' && req.user.scope_id && req.user.scope_id !== 'ALL') {
        activeState = req.user.scope_id;
      }
      if (req.user && req.user.role === 'MP' && req.user.scope_id) {
        sql += ` AND mp_id = $${pIdx++}`;
        params.push(req.user.scope_id);
      }

      if (activeState && activeState !== 'all') {
        sql += ` AND state = $${pIdx++}`;
        params.push(activeState);
      }

      if (status && status !== 'all') {
        sql += ` AND status = $${pIdx++}`;
        params.push(status);
      }

      if (mp_id) {
        sql += ` AND mp_id = $${pIdx++}`;
        params.push(mp_id);
      }

      if (district_id) {
        sql += ` AND district_id = $${pIdx++}`;
        params.push(district_id);
      }

      if (search && String(search).trim()) {
        const pattern = `%${String(search).trim()}%`;
        sql += ` AND (work_name LIKE $${pIdx} OR mp_name LIKE $${pIdx} OR state LIKE $${pIdx} OR contractor_name LIKE $${pIdx} OR id LIKE $${pIdx})`;
        pIdx++;
        params.push(pattern);
      }

      const rows = await db.query<Work>(sql, params);

      // Fetch all assets to enrich anomaly analysis
      const assets = await db.query(`SELECT * FROM assets`);
      const assetsMap = Object.fromEntries(assets.map(a => [a.work_id, a]));

      // Enrich with statistical anomaly analysis (gap_pct, payment_pct, flags)
      let enriched = rows.map(w => {
        const asset = assetsMap[w.id];
        const analysis = AIEngineService.analyzeWorkAnomalies(w, asset);

        return {
          ...w,
          sanctioned_amount: Number(w.sanctioned_amount),
          cost_estimate: Number(w.cost_estimate),
          expenditure: Number(w.expenditure),
          completion_pct: Number(w.completion_pct),
          payment_pct: analysis.payment_pct,
          gap_pct: analysis.gap_pct,
          flags: analysis.flags,
          primary_flag: analysis.flags[0] || null,
          asset: asset || null
        };
      });

      // Anomaly type filtering
      if (anomaly_type && anomaly_type !== 'all') {
        const at = String(anomaly_type);
        if (at === 'anomalous_only') {
          enriched = enriched.filter(w => w.flags.length > 0);
        } else {
          enriched = enriched.filter(w => w.flags.some(f => f.type === at) || w.anomaly_type === at);
        }
      }

      // Sorting
      switch (sort) {
        case 'gap_desc':
          enriched.sort((a, b) => b.gap_pct - a.gap_pct);
          break;
        case 'gap_asc':
          enriched.sort((a, b) => a.gap_pct - b.gap_pct);
          break;
        case 'sanctioned_desc':
          enriched.sort((a, b) => b.sanctioned_amount - a.sanctioned_amount);
          break;
        case 'completion_desc':
          enriched.sort((a, b) => b.completion_pct - a.completion_pct);
          break;
        case 'completion_asc':
          enriched.sort((a, b) => a.completion_pct - b.completion_pct);
          break;
        case 'expenditure_desc':
        default:
          enriched.sort((a, b) => b.expenditure - a.expenditure);
          break;
      }

      const totalCount = enriched.length;

      // Pagination
      if (all !== 'true' && limit) {
        const lim = parseInt(String(limit), 10);
        const off = parseInt(String(offset), 10);
        enriched = enriched.slice(off, off + lim);
      }

      res.json({
        success: true,
        count: totalCount,
        user_scope: req.user ? { role: req.user.role, scope: req.user.scope_id } : null,
        data: enriched
      });
    } catch (err: any) {
      console.error('Error fetching works:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const db = await getDb();
      let sql = `SELECT * FROM works`;
      const params: any[] = [];

      if (req.user && req.user.role === 'State' && req.user.scope_id && req.user.scope_id !== 'ALL') {
        sql += ` WHERE state = $1`;
        params.push(req.user.scope_id);
      }

      const allWorks = await db.query<Work>(sql, params);
      const assets = await db.query(`SELECT * FROM assets`);
      const assetsMap = Object.fromEntries(assets.map(a => [a.work_id, a]));

      let costOverruns = 0;
      let paymentBeforeProgress = 0;
      let rapidFullPayment = 0;
      let unverifiedHighValue = 0;
      let stalledWorks = 0;
      let duplicateWorks = 0;
      let zeroProgress = 0;

      allWorks.forEach(w => {
        const analysis = AIEngineService.analyzeWorkAnomalies(w, assetsMap[w.id]);
        analysis.flags.forEach(f => {
          if (f.type === 'cost_overrun') costOverruns++;
          if (f.type === 'payment_before_progress') paymentBeforeProgress++;
          if (f.type === 'rapid_full_payment') rapidFullPayment++;
          if (f.type === 'unverified_high_value_asset') unverifiedHighValue++;
          if (f.type === 'stalled_work') stalledWorks++;
          if (f.type === 'duplicate_work') duplicateWorks++;
          if (f.type === 'no_progress') zeroProgress++;
        });
      });

      res.json({
        success: true,
        data: {
          total_works: allWorks.length,
          cost_overruns: costOverruns,
          payment_before_progress: paymentBeforeProgress,
          rapid_full_payment: rapidFullPayment,
          unverified_high_value_asset: unverifiedHighValue,
          stalled_works: stalledWorks,
          duplicate_works: duplicateWorks,
          zero_progress: zeroProgress,
          total_anomalous: costOverruns + paymentBeforeProgress + rapidFullPayment + unverifiedHighValue + stalledWorks + duplicateWorks + zeroProgress,
          user_scope: req.user ? { role: req.user.role, scope: req.user.scope_id } : null
        }
      });
    } catch (err: any) {
      console.error('Error fetching works summary:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getById(req: Request, res: Response): Promise<void> {
    try {
      const db = await getDb();
      const { id } = req.params;

      const work = await db.queryOne<Work>(`SELECT * FROM works WHERE id = $1`, [id]);
      if (!work) {
        res.status(404).json({ success: false, error: 'Work not found' });
        return;
      }

      const payments = await db.query(`SELECT * FROM payments WHERE work_id = $1 ORDER BY payment_date ASC`, [id]);
      const asset = await db.queryOne(`SELECT * FROM assets WHERE work_id = $1`, [id]);
      const alerts = await db.query(`SELECT * FROM alerts WHERE entity_id = $1`, [id]);

      const analysis = AIEngineService.analyzeWorkAnomalies(work, asset);

      res.json({
        success: true,
        data: {
          ...work,
          sanctioned_amount: Number(work.sanctioned_amount),
          cost_estimate: Number(work.cost_estimate),
          expenditure: Number(work.expenditure),
          completion_pct: Number(work.completion_pct),
          payment_pct: analysis.payment_pct,
          gap_pct: analysis.gap_pct,
          flags: analysis.flags,
          payments: payments.map(p => ({ ...p, amount: Number(p.amount) })),
          asset,
          alerts
        }
      });
    } catch (err: any) {
      console.error(`Error fetching work ${req.params.id}:`, err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
