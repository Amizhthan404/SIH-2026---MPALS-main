import { Request, Response } from 'express';
import { getDb } from '../config/db.js';
import { District } from '../types/index.js';

export class DistrictsController {
  public static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const db = await getDb();
      const { state, search } = req.query;

      let sql = `SELECT * FROM districts WHERE 1=1`;
      const params: any[] = [];
      let pIdx = 1;

      if (state && state !== 'all') {
        sql += ` AND state = $${pIdx++}`;
        params.push(state);
      }

      if (search && String(search).trim()) {
        sql += ` AND (name LIKE $${pIdx} OR state LIKE $${pIdx})`;
        params.push(`%${String(search).trim()}%`);
        pIdx++;
      }

      sql += ` ORDER BY state ASC, name ASC`;

      const rows = await db.query<District>(sql, params);
      res.json({ success: true, count: rows.length, data: rows });
    } catch (err: any) {
      console.error('Error fetching districts:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getById(req: Request, res: Response): Promise<void> {
    try {
      const db = await getDb();
      const { id } = req.params;

      const district = await db.queryOne<District>(`SELECT * FROM districts WHERE id = $1`, [id]);
      if (!district) {
        res.status(404).json({ success: false, error: 'District not found' });
        return;
      }

      const works = await db.query(`SELECT * FROM works WHERE district_id = $1`, [id]);
      res.json({
        success: true,
        data: {
          ...district,
          works_count: works.length,
          works
        }
      });
    } catch (err: any) {
      console.error(`Error fetching district ${req.params.id}:`, err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
