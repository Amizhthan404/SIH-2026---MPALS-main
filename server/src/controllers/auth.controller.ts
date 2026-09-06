import { Request, Response } from 'express';
import { getDb } from '../config/db.js';
import { User } from '../types/index.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../middleware/auth.middleware.js';
import crypto from 'crypto';

export class AuthController {
  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const db = await getDb();
      const { email, password } = req.body;

      if (!email || !password) {
        res.status(400).json({ success: false, error: 'Email and password are required' });
        return;
      }

      // Fetch user by email
      const user = await db.queryOne<User>(
        `SELECT id, name, email, password_hash, role, scope_id, created_at FROM users WHERE LOWER(email) = LOWER($1)`,
        [email.trim()]
      );

      if (!user) {
        res.status(401).json({ success: false, error: 'Invalid email or password' });
        return;
      }

      // Verify password: support bcrypt (primary) and SHA-256 fallback
      let isValid = false;
      if (user.password_hash.startsWith('$2a$') || user.password_hash.startsWith('$2b$')) {
        isValid = bcrypt.compareSync(password, user.password_hash);
      } else {
        // Legacy SHA-256 fallback & upgrade to bcrypt
        const shaHash = crypto.createHash('sha256').update(password).digest('hex');
        if (shaHash === user.password_hash) {
          isValid = true;
          // Transparently upgrade to bcrypt in background
          const newBcryptHash = bcrypt.hashSync(password, 10);
          db.query(`UPDATE users SET password_hash = $1 WHERE id = $2`, [newBcryptHash, user.id]).catch(() => {});
        }
      }

      if (!isValid) {
        res.status(401).json({ success: false, error: 'Invalid email or password' });
        return;
      }

      // Generate signed JWT token
      const token = jwt.sign(
        {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          scope_id: user.scope_id
        },
        JWT_SECRET,
        { expiresIn: '24h' }
      );

      const { password_hash, ...userProfile } = user;

      res.json({
        success: true,
        data: {
          user: userProfile,
          token
        }
      });
    } catch (err: any) {
      console.error('Error during login:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async getMe(req: Request, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ success: false, error: 'Not authenticated' });
      return;
    }
    res.json({
      success: true,
      data: req.user
    });
  }

  public static async getUsers(req: Request, res: Response): Promise<void> {
    try {
      const db = await getDb();
      const users = await db.query<Omit<User, 'password_hash'>>(
        `SELECT id, name, email, role, scope_id, created_at FROM users ORDER BY role ASC, name ASC`
      );
      res.json({ success: true, data: users });
    } catch (err: any) {
      console.error('Error listing users:', err);
      res.status(500).json({ success: false, error: err.message });
    }
  }
}
