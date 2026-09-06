import { Request, Response } from 'express';
import { getDb } from '../config/db.js';
import { Payment } from '../types/index.js';

export class PaymentsController {
  public static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const db = await getDb();
      const { work_id, limit = 100, offset = 0 } = req.query;

      let sql = `SELECT * FROM payments WHERE 1=1`;
      const params: any[] = [];
      let pIdx = 1;

      if (work_id) {
        sql += ` AND work_id = $${pIdx++}`;
        params.push(work_id);
      }

      sql += ` ORDER BY payment_date DESC LIMIT $${pIdx++} OFFSET $${pIdx++}`;
      params.push(parseInt(String(limit), 10));
      params.push(parseInt(String(offset), 10));

      const rows = await db.query<Payment>(sql, params);
      res.json({
        success: true,
        count: rows.length,
        data: rows.map(p => ({ ...p, amount: Number(p.amount) }))
      });
    } catch (err: any) {
      console.error('Error fetching payments:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
