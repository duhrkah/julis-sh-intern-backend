import express from 'express';
import AuditLog from '../models/AuditLog.js';
import auth from '../middleware/auth.js';
import requireRole from '../middleware/requireRole.js';

const router = express.Router();

// Alle AuditLogs (nur Admin)
router.get('/', requireRole('admin'), async (req, res) => {
  const logs = await AuditLog.findAll({ order: [['createdAt', 'DESC']], limit: 200 });
  res.json(logs);
});

export default router; 