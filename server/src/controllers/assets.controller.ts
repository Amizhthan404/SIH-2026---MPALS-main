import { Request, Response } from 'express';
import { getDb } from '../config/db.js';
import { Asset } from '../types/index.js';

export class AssetsController {
  public static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const db = await getDb();
      const { work_id, status, limit = 100, offset = 0 } = req.query;

      let sql = `SELECT * FROM assets WHERE 1=1`;
      const params: any[] = [];
      let pIdx = 1;

      if (work_id) {
        sql += ` AND work_id = $${pIdx++}`;
        params.push(work_id);
      }

      if (status && status !== 'all') {
        sql += ` AND asset_status = $${pIdx++}`;
        params.push(status);
      }

      sql += ` ORDER BY created_at DESC LIMIT $${pIdx++} OFFSET $${pIdx++}`;
      params.push(parseInt(String(limit), 10));
      params.push(parseInt(String(offset), 10));

      const rows = await db.query<Asset>(sql, params);
      res.json({
        success: true,
        count: rows.length,
        data: rows.map(a => ({
          ...a,
          geo_lat: a.geo_lat ? Number(a.geo_lat) : null,
          geo_lng: a.geo_lng ? Number(a.geo_lng) : null
        }))
      });
    } catch (err: any) {
      console.error('Error fetching assets:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
