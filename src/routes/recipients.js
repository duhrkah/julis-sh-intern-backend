import express from 'express';
import Recipient from '../models/Recipient.js';
import Kreis from '../models/Kreis.js';
import auth from '../middleware/auth.js';
import { body, validationResult } from 'express-validator';
import AuditLog from '../models/AuditLog.js';
import rateLimit from 'express-rate-limit';

const router = express.Router();

// Rate Limiting für Recipients-CRUD
const recipientLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 20, // max. 20 Aktionen pro 15min pro IP
  message: 'Zu viele Aktionen. Bitte warte 15 Minuten.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Alle Empfänger (mit zugehörigem Kreis)
router.get('/', auth, async (req, res) => {
  try {
    const recipients = await Recipient.findAll({ include: Kreis });
    res.json(recipients);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Empfänger anlegen
router.post('/',
  auth,
  recipientLimiter,
  [
    body('name').isString().isLength({ min: 2 }).withMessage('Name erforderlich.'),
    body('email').isEmail().withMessage('Gültige E-Mail erforderlich.'),
    body('kreisId').isInt().withMessage('KreisId erforderlich.'),
    body('rolle').isString().notEmpty().withMessage('Rolle erforderlich.')
  ],
  async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Nur Admins dürfen Empfänger anlegen.' });
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { name, email, kreisId, rolle } = req.body;
    try {
      const kreis = await Kreis.findByPk(kreisId);
      if (!kreis) return res.status(400).json({ message: 'Kreis nicht gefunden.' });
      const recipient = await Recipient.create({ name, email, rolle, KreisId: kreisId });
      const recipientWithKreis = await Recipient.findByPk(recipient.id, { include: Kreis });
      // Audit Log
      await AuditLog.create({ user: req.user.email, empfaenger: recipientWithKreis, type: 'empfaenger' });
      res.status(201).json(recipientWithKreis);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

// Empfänger aktualisieren
router.put('/:id',
  auth,
  recipientLimiter,
  [
    body('name').isString().isLength({ min: 2 }).withMessage('Name erforderlich.'),
    body('email').isEmail().withMessage('Gültige E-Mail erforderlich.'),
    body('kreisId').isInt().withMessage('KreisId erforderlich.'),
    body('rolle').isString().notEmpty().withMessage('Rolle erforderlich.')
  ],
  async (req, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Nur Admins dürfen Empfänger bearbeiten.' });
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    const { name, email, kreisId, rolle } = req.body;
    try {
      const kreis = await Kreis.findByPk(kreisId);
      if (!kreis) return res.status(400).json({ message: 'Kreis nicht gefunden.' });
      const [updatedRows] = await Recipient.update(
        { name, email, rolle, KreisId: kreisId },
        { where: { id: req.params.id } }
      );
      if (!updatedRows) return res.status(404).json({ message: 'Empfänger nicht gefunden' });
      const recipientWithKreis = await Recipient.findByPk(req.params.id, { include: Kreis });
      // Audit Log
      await AuditLog.create({ user: req.user.email, empfaenger: recipientWithKreis, type: 'empfaenger' });
      res.json(recipientWithKreis);
    } catch (err) {
      res.status(400).json({ message: err.message });
    }
  }
);

// Empfänger löschen
router.delete('/:id', auth, recipientLimiter, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Nur Admins dürfen Empfänger löschen.' });
  try {
    const recipient = await Recipient.findByPk(req.params.id, { include: Kreis });
    const deletedRows = await Recipient.destroy({ where: { id: req.params.id } });
    if (!deletedRows) return res.status(404).json({ message: 'Empfänger nicht gefunden' });
    // Audit Log
    await AuditLog.create({ user: req.user.email, empfaenger: recipient, type: 'empfaenger' });
    res.json({ message: 'Empfänger gelöscht' });
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

export default router; 