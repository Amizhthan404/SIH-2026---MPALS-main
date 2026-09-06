import { Request, Response } from 'express';
import { getDb } from '../config/db.js';
import { MP, StateStat } from '../types/index.js';
import { AIEngineService } from '../services/aiEngine.service.js';

export class StatesController {
  public static async getAll(req: Request, res: Response): Promise<void> {
    try {
      const db = await getDb();
      const allMPs = await db.query<MP>(`SELECT * FROM mps`);
      const stateStats = AIEngineService.calculateStateStats(allMPs);

      res.json({
        success: true,
        count: stateStats.length,
        data: stateStats
      });
    } catch (err: any) {
      console.error('Error fetching states:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getByState(req: Request, res: Response): Promise<void> {
    try {
      const db = await getDb();
      const { state } = req.params;

      const mps = await db.query<MP>(`SELECT * FROM mps WHERE state = $1`, [state]);
      const works = await db.query(`SELECT * FROM works WHERE state = $1`, [state]);
      const alerts = await db.query(`SELECT * FROM alerts WHERE state = $1`, [state]);
      const districts = await db.query(`SELECT * FROM districts WHERE state = $1`, [state]);

      res.json({
        success: true,
        data: {
          state,
          mps_count: mps.length,
          works_count: works.length,
          alerts_count: alerts.length,
          total_allocated: mps.reduce((s, m) => s + Number(m.allocated_amount), 0),
          total_expenditure: works.reduce((s, w) => s + Number(w.expenditure), 0),
          districts,
          mps,
          works,
          alerts
        }
      });
    } catch (err: any) {
      console.error(`Error fetching state ${req.params.state}:`, err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
