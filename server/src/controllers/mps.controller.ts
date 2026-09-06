import { Request, Response } from 'express';
import { getDb } from '../config/db.js';
import { MP } from '../types/index.js';

export class MPsController {
  public static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const db = await getDb();
      const {
        state: queryState,
        risk,
        type,
        house,
        source,
        search,
        sort = 'risk_desc',
        limit,
        offset = 0,
        all
      } = req.query;

      let sql = `SELECT * FROM mps WHERE 1=1`;
      const params: any[] = [];
      let pIdx = 1;

      // Role-based scoping
      let activeState = queryState;
      if (req.user && req.user.role === 'State' && req.user.scope_id && req.user.scope_id !== 'ALL') {
        activeState = req.user.scope_id;
      }
      if (req.user && req.user.role === 'MP' && req.user.scope_id) {
        sql += ` AND id = $${pIdx++}`;
        params.push(req.user.scope_id);
      }

      if (activeState && activeState !== 'all') {
        sql += ` AND state = $${pIdx++}`;
        params.push(activeState);
      }

      if (risk && risk !== 'all') {
        sql += ` AND risk_level = $${pIdx++}`;
        params.push(String(risk).toLowerCase());
      }

      if (type && type !== 'all') {
        sql += ` AND constituency_type = $${pIdx++}`;
        params.push(type);
      }

      if (house && house !== 'all') {
        sql += ` AND house = $${pIdx++}`;
        params.push(house);
      }

      if (source && source !== 'all') {
        sql += ` AND source = $${pIdx++}`;
        params.push(source);
      }

      if (search && String(search).trim()) {
        const searchPattern = `%${String(search).trim()}%`;
        sql += ` AND (name LIKE $${pIdx} OR state LIKE $${pIdx} OR mp_name_raw LIKE $${pIdx} OR constituency_type LIKE $${pIdx})`;
        pIdx++;
        params.push(searchPattern);
      }

      // Sorting
      switch (sort) {
        case 'risk_asc':
          sql += ` ORDER BY risk_score ASC, name ASC`;
          break;
        case 'amount_desc':
          sql += ` ORDER BY allocated_amount DESC`;
          break;
        case 'amount_asc':
          sql += ` ORDER BY allocated_amount ASC`;
          break;
        case 'name_asc':
          sql += ` ORDER BY name ASC`;
          break;
        case 'risk_desc':
        default:
          sql += ` ORDER BY risk_score DESC, allocated_amount DESC`;
          break;
      }

      if (all !== 'true' && limit) {
        sql += ` LIMIT $${pIdx++} OFFSET $${pIdx++}`;
        params.push(parseInt(String(limit), 10));
        params.push(parseInt(String(offset), 10));
      }

      const rows = await db.query<MP>(sql, params);

      const formatted = rows.map(r => ({
        ...r,
        allocated_amount: Number(r.allocated_amount),
        risk_score: Number(r.risk_score),
        reasons: typeof r.reasons === 'string' ? JSON.parse(r.reasons) : (r.reasons || [])
      }));

      res.json({
        success: true,
        count: formatted.length,
        user_scope: req.user ? { role: req.user.role, scope: req.user.scope_id } : null,
        data: formatted
      });
    } catch (err: any) {
      console.error('Error fetching MPs:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getById(req: Request, res: Response): Promise<void> {
    try {
      const db = await getDb();
      const { id } = req.params;

      const mp = await db.queryOne<MP>(`SELECT * FROM mps WHERE id = $1`, [id]);
      if (!mp) {
        res.status(404).json({ success: false, error: 'MP record not found' });
        return;
      }

      const works = await db.query(`SELECT * FROM works WHERE mp_id = $1 ORDER BY expenditure DESC`, [id]);
      const alerts = await db.query(`SELECT * FROM alerts WHERE entity_id = $1 ORDER BY risk_score DESC`, [id]);

      res.json({
        success: true,
        data: {
          ...mp,
          allocated_amount: Number(mp.allocated_amount),
          risk_score: Number(mp.risk_score),
          reasons: typeof mp.reasons === 'string' ? JSON.parse(mp.reasons) : (mp.reasons || []),
          works: works.map(w => ({
            ...w,
            sanctioned_amount: Number(w.sanctioned_amount),
            cost_estimate: Number(w.cost_estimate),
            expenditure: Number(w.expenditure)
          })),
          alerts
        }
      });
    } catch (err: any) {
      console.error(`Error fetching MP ${req.params.id}:`, err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getRiskExplanation(req: Request, res: Response): Promise<void> {
    try {
      const db = await getDb();
      const { id } = req.params;

      const mp = await db.queryOne<MP>(`SELECT * FROM mps WHERE id = $1`, [id]);
      if (!mp) {
        res.status(404).json({ success: false, error: 'MP not found' });
        return;
      }

      const statePeers = await db.query<MP>(`SELECT allocated_amount FROM mps WHERE state = $1`, [mp.state]);
      const amounts = statePeers.map(p => Number(p.allocated_amount));
      const stateAvg = amounts.length ? amounts.reduce((a, b) => a + b, 0) / amounts.length : 0;
      const deviationPct = stateAvg > 0 ? ((Number(mp.allocated_amount) - stateAvg) / stateAvg) * 100 : 0;

      const reasons = typeof mp.reasons === 'string' ? JSON.parse(mp.reasons) : (mp.reasons || []);

      const factors = [
        {
          factor: 'Statistical Outlier (Z-Score)',
          score: mp.z_score ? `${mp.z_score} σ` : '0 σ',
          weight: '30%',
          impact: Number(mp.z_score || 0) > 2 ? 'High' : (Number(mp.z_score || 0) > 1.5 ? 'Moderate' : 'Normal'),
          description: Number(mp.z_score || 0) > 2 ? 'Allocation significantly departs from national mean' : 'Allocation is within normal statistical distribution'
        },
        {
          factor: 'State Peer Comparison',
          score: `${deviationPct >= 0 ? '+' : ''}${deviationPct.toFixed(1)}% vs State Avg`,
          weight: '25%',
          impact: Math.abs(deviationPct) > 35 ? 'High' : (Math.abs(deviationPct) > 20 ? 'Medium' : 'Normal'),
          description: `State average allocation is ₹${(stateAvg / 1e7).toFixed(2)} Cr in ${mp.state}`
        },
        {
          factor: 'Term Expiration Horizon',
          score: mp.term_end ? `Term Ends: ${mp.term_end}` : 'Data Completeness Observation',
          weight: '10%',
          impact: mp.term_flag === 'term_expired' ? 'High' : 'Normal',
          description: mp.term_flag === 'term_expired' ? 'Parliamentary tenure completed; active sanctions require audit' : 'Tenure active or standard'
        }
      ];

      res.json({
        success: true,
        data: {
          mp_id: mp.id,
          name: mp.name,
          state: mp.state,
          house: mp.house || 'LS',
          allocated_amount: Number(mp.allocated_amount),
          risk_score: Number(mp.risk_score),
          risk_level: mp.risk_level,
          summary_headline: `Investigation Priority Score: ${mp.risk_score}/100 (${mp.risk_level.toUpperCase()})`,
          disclaimer: 'Anomaly priority score is an investigative triage signal, not a finding of fraud or wrongdoing.',
          factors,
          reasons
        }
      });
    } catch (err: any) {
      console.error(`Error explaining risk for MP ${req.params.id}:`, err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
