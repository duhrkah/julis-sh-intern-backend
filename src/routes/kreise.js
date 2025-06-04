import express from 'express';
import Kreis from '../models/Kreis.js';
import auth from '../middleware/auth.js';
import { body, validationResult, param } from 'express-validator';
import AuditLog from '../models/AuditLog.js';

const router = express.Router();

// Alle Kreise
router.get('/', auth, async (req, res) => {
  const kreise = await Kreis.findAll({ order: [['order', 'ASC'], ['name', 'ASC']] });
  res.json(kreise);
});

// Kreis anlegen (nur Admin)
router.post('/',
  auth,
  body('name').isString().isLength({ min: 2 }).withMessage('Name zu kurz'),
  async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Nur Admins dürfen Kreise anlegen.' });
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array().map(e => e.msg).join(', ') });
    try {
      const kreis = await Kreis.create(req.body);
      await AuditLog.create({ user: req.user.email, type: 'kreis_create', targetId: kreis.id });
      res.status(201).json(kreis);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

// Kreis bearbeiten (nur Admin)
router.put('/:id',
  auth,
  param('id').isInt().withMessage('Ungültige Kreis-ID'),
  body('name').optional().isString().isLength({ min: 2 }).withMessage('Name zu kurz'),
  async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Nur Admins dürfen Kreise bearbeiten.' });
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array().map(e => e.msg).join(', ') });
    try {
      const [updatedRows, [kreis]] = await Kreis.update(req.body, { where: { id: req.params.id }, returning: true });
      if (!updatedRows) return res.status(404).json({ message: 'Kreis nicht gefunden' });
      await AuditLog.create({ user: req.user.email, type: 'kreis_update', targetId: req.params.id });
      res.json(kreis);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

// Kreis löschen (nur Admin)
router.delete('/:id',
  auth,
  param('id').isInt().withMessage('Ungültige Kreis-ID'),
  async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Nur Admins dürfen Kreise löschen.' });
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array().map(e => e.msg).join(', ') });
    const deletedRows = await Kreis.destroy({ where: { id: req.params.id } });
    if (!deletedRows) return res.status(404).json({ message: 'Kreis nicht gefunden' });
    await AuditLog.create({ user: req.user.email, type: 'kreis_delete', targetId: req.params.id });
    res.json({ message: 'Kreis gelöscht' });
  }
);

// PATCH /order: Reihenfolge speichern
router.patch('/order', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Nur Admins.' });
  const { ids } = req.body;
  if (!Array.isArray(ids)) return res.status(400).json({ message: 'ids muss ein Array sein.' });
  for (let i = 0; i < ids.length; i++) {
    await Kreis.update({ order: i }, { where: { id: ids[i] } });
  }
  res.json({ message: 'Reihenfolge gespeichert.' });
});

export default router; 