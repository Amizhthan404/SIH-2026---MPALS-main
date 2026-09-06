import { Request, Response } from 'express';
import { getDb } from '../config/db.js';
import { Alert } from '../types/index.js';

export class AlertsController {
  public static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const db = await getDb();
      const {
        severity,
        type,
        status,
        state: queryState,
        entity_type,
        search,
        limit,
        offset = 0,
        all
      } = req.query;

      let sql = `SELECT * FROM alerts WHERE 1=1`;
      const params: any[] = [];
      let pIdx = 1;

      // Role-based scoping
      let activeState = queryState;
      if (req.user && req.user.role === 'State' && req.user.scope_id && req.user.scope_id !== 'ALL') {
        activeState = req.user.scope_id;
      }

      if (severity && severity !== 'all') {
        sql += ` AND LOWER(severity) = LOWER($${pIdx++})`;
        params.push(String(severity).toLowerCase());
      }

      if (type && type !== 'all') {
        sql += ` AND alert_type = $${pIdx++}`;
        params.push(type);
      }

      if (status && status !== 'all') {
        sql += ` AND status = $${pIdx++}`;
        params.push(status);
      }

      if (activeState && activeState !== 'all') {
        sql += ` AND state = $${pIdx++}`;
        params.push(activeState);
      }

      if (entity_type) {
        sql += ` AND entity_type = $${pIdx++}`;
        params.push(entity_type);
      }

      if (search && String(search).trim()) {
        const pattern = `%${String(search).trim()}%`;
        sql += ` AND (title LIKE $${pIdx} OR description LIKE $${pIdx} OR mp_name LIKE $${pIdx} OR state LIKE $${pIdx})`;
        pIdx++;
        params.push(pattern);
      }

      // Default sort by severity (Critical first) then risk_score DESC
      sql += ` ORDER BY CASE 
        WHEN severity = 'Critical' THEN 1 
        WHEN severity = 'High' THEN 2 
        WHEN severity = 'Medium' THEN 3 
        ELSE 4 END, risk_score DESC, created_at DESC`;

      if (all !== 'true' && limit) {
        sql += ` LIMIT $${pIdx++} OFFSET $${pIdx++}`;
        params.push(parseInt(String(limit), 10));
        params.push(parseInt(String(offset), 10));
      }

      const rows = await db.query<Alert>(sql, params);
      const formatted = rows.map(a => ({
        ...a,
        risk_score: Number(a.risk_score),
        amount: a.amount ? Number(a.amount) : null
      }));

      res.json({
        success: true,
        count: formatted.length,
        user_scope: req.user ? { role: req.user.role, scope: req.user.scope_id } : null,
        data: formatted
      });
    } catch (err: any) {
      console.error('Error fetching alerts:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getSummary(req: Request, res: Response): Promise<void> {
    try {
      const db = await getDb();
      let sql = `SELECT * FROM alerts`;
      const params: any[] = [];

      if (req.user && req.user.role === 'State' && req.user.scope_id && req.user.scope_id !== 'ALL') {
        sql += ` WHERE state = $1`;
        params.push(req.user.scope_id);
      }

      const allAlerts = await db.query<Alert>(sql, params);

      const bySeverity = {
        critical: allAlerts.filter(a => a.severity.toLowerCase() === 'critical').length,
        high: allAlerts.filter(a => a.severity.toLowerCase() === 'high').length,
        medium: allAlerts.filter(a => a.severity.toLowerCase() === 'medium').length,
        low: allAlerts.filter(a => a.severity.toLowerCase() === 'low').length,
      };

      const byStatus = {
        open: allAlerts.filter(a => a.status === 'Open').length,
        under_review: allAlerts.filter(a => a.status === 'Under Review').length,
        resolved: allAlerts.filter(a => a.status === 'Resolved').length,
        false_positive: allAlerts.filter(a => a.status === 'False Positive').length,
      };

      res.json({
        success: true,
        data: {
          total: allAlerts.length,
          by_severity: bySeverity,
          by_status: byStatus,
          user_scope: req.user ? { role: req.user.role, scope: req.user.scope_id } : null
        }
      });
    } catch (err: any) {
      console.error('Error fetching alerts summary:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async updateStatus(req: Request, res: Response): Promise<void> {
    try {
      const db = await getDb();
      const { id } = req.params;
      const { status } = req.body;

      if (!['Open', 'Under Review', 'Resolved', 'False Positive'].includes(status)) {
        res.status(400).json({ success: false, error: 'Invalid alert status. Allowed: Open, Under Review, Resolved, False Positive' });
        return;
      }

      // Check existing alert
      const existing = await db.queryOne<Alert>(`SELECT * FROM alerts WHERE id = $1`, [id]);
      if (!existing) {
        res.status(404).json({ success: false, error: 'Alert not found' });
        return;
      }

      // If state user, ensure alert is within their state
      if (req.user && req.user.role === 'State' && req.user.scope_id && req.user.scope_id !== 'ALL') {
        if (existing.state !== req.user.scope_id) {
          res.status(403).json({ success: false, error: 'Cannot update alert outside your assigned state scope' });
          return;
        }
      }

      const resolvedBy = req.user?.name ? `${req.user.name} (${req.user.role})` : (req.body.resolved_by || 'Authorized Officer');
      const resolvedAt = (status === 'Resolved' || status === 'False Positive') ? new Date().toISOString() : null;

      await db.query(
        `UPDATE alerts SET status = $1, resolved_at = $2, resolved_by = $3 WHERE id = $4`,
        [status, resolvedAt, resolvedBy, id]
      );

      const updated = await db.queryOne<Alert>(`SELECT * FROM alerts WHERE id = $1`, [id]);
      res.json({ success: true, data: updated, message: `Alert status updated to ${status} by ${resolvedBy}` });
    } catch (err: any) {
      console.error(`Error updating alert ${req.params.id}:`, err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
