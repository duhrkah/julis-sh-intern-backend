import express from 'express';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import { body, validationResult, param } from 'express-validator';
import AuditLog from '../models/AuditLog.js';
import requireRole from '../middleware/requireRole.js';

const router = express.Router();

// Alle User (nur Admin)
router.get('/', requireRole('admin'), async (req, res) => {
  const users = await User.findAll({ attributes: { exclude: ['password'] } });
  res.json(users);
});

// User löschen (nur Admin)
router.delete('/:id', requireRole('admin'), param('id').isInt().withMessage('Ungültige User-ID'), async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ message: errors.array().map(e => e.msg).join(', ') });
  const deletedRows = await User.destroy({ where: { id: req.params.id } });
  if (!deletedRows) return res.status(404).json({ message: 'User nicht gefunden' });
  await AuditLog.create({ user: req.user.email, type: 'user_delete', targetId: req.params.id });
  res.json({ message: 'User gelöscht' });
});

// User bearbeiten (nur Admin)
router.put('/:id',
  requireRole('admin'),
  param('id').isInt().withMessage('Ungültige User-ID'),
  body('role').optional().isIn(['admin', 'lgst', 'vorstand', 'user']).withMessage('Ungültige Rolle'),
  body('email').optional().isEmail().withMessage('Ungültige E-Mail'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array().map(e => e.msg).join(', ') });
    const { password, ...rest } = req.body;
    let update = { ...rest };
    if (password) update.password = password;
    const [updatedRows] = await User.update(update, { where: { id: req.params.id } });
    if (!updatedRows) return res.status(404).json({ message: 'User nicht gefunden' });
    const user = await User.findByPk(req.params.id, { attributes: { exclude: ['password'] } });
    await AuditLog.create({ user: req.user.email, type: 'user_update', targetId: req.params.id });
    res.json(user);
  }
);

// User anlegen (nur Admin)
router.post('/',
  requireRole('admin'),
  body('email').isEmail().withMessage('Ungültige E-Mail'),
  body('password').isLength({ min: 6 }).withMessage('Passwort zu kurz'),
  body('role').isIn(['admin', 'lgst', 'vorstand', 'user']).withMessage('Ungültige Rolle'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ message: errors.array().map(e => e.msg).join(', ') });
    const { email, password, role } = req.body;
    const exists = await User.findOne({ where: { email } });
    if (exists) return res.status(400).json({ message: 'Nutzer existiert bereits.' });
    const user = new User({ email, password, role });
    await user.save();
    await AuditLog.create({ user: req.user.email, type: 'user_create', targetId: user.id });
    res.status(201).json({ message: 'Nutzer angelegt.' });
  }
);

export default router; 