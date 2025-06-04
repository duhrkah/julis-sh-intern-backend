import express from 'express';
import Szenario from '../models/Szenario.js';
import auth from '../middleware/auth.js';
import { body, validationResult, param } from 'express-validator';
import AuditLog from '../models/AuditLog.js';

const router = express.Router();

// Alle Szenarien
router.get('/', auth, async (req, res) => {
  const szenarien = await Szenario.findAll({ order: [['order', 'ASC'], ['label', 'ASC']] });
  res.json(szenarien);
});

// Szenario anlegen (nur Admin)
router.post('/',
  auth,
  body('value').isString().isLength({ min: 1 }).withMessage('Wert erforderlich'),
  body('label').isString().isLength({ min: 1 }).withMessage('Label erforderlich'),
  async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Nur Admins dürfen Szenarien anlegen.' });
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array().map(e => e.msg).join(', ') });
    try {
      const szenario = await Szenario.create(req.body);
      await AuditLog.create({ user: req.user.email, type: 'szenario_create', targetId: szenario.id });
      res.status(201).json(szenario);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

// Szenario bearbeiten (nur Admin)
router.put('/:id',
  auth,
  param('id').isInt().withMessage('Ungültige Szenario-ID'),
  body('value').optional().isString().isLength({ min: 1 }).withMessage('Wert erforderlich'),
  body('label').optional().isString().isLength({ min: 1 }).withMessage('Label erforderlich'),
  async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Nur Admins dürfen Szenarien bearbeiten.' });
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array().map(e => e.msg).join(', ') });
    try {
      const [updatedRows, [szenario]] = await Szenario.update(req.body, { where: { id: req.params.id }, returning: true });
      if (!updatedRows) return res.status(404).json({ message: 'Szenario nicht gefunden' });
      await AuditLog.create({ user: req.user.email, type: 'szenario_update', targetId: req.params.id });
      res.json(szenario);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

// Szenario löschen (nur Admin)
router.delete('/:id',
  auth,
  param('id').isInt().withMessage('Ungültige Szenario-ID'),
  async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Nur Admins dürfen Szenarien löschen.' });
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array().map(e => e.msg).join(', ') });
    const deletedRows = await Szenario.destroy({ where: { id: req.params.id } });
    if (!deletedRows) return res.status(404).json({ message: 'Szenario nicht gefunden' });
    await AuditLog.create({ user: req.user.email, type: 'szenario_delete', targetId: req.params.id });
    res.json({ message: 'Szenario gelöscht' });
  }
);

// PATCH /order: Reihenfolge speichern
router.patch('/order', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Nur Admins.' });
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ message: 'ids muss ein Array sein.' });
  for (let i = 0; i < ids.length; i++) {
    await Szenario.update({ order: i }, { where: { id: ids[i] } });
  }
  res.json({ message: 'Reihenfolge gespeichert.' });
});

export default router; 