import express from 'express';
import Template from '../models/Template.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Alle Templates
router.get('/', auth, async (req, res) => {
  const templates = await Template.findAll();
  res.json(templates);
});

// Template anlegen (nur Admin)
router.post('/', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Nur Admins dürfen Templates anlegen.' });
  try {
    const template = await Template.create(req.body);
    res.status(201).json(template);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Template aktualisieren (nur Admin)
router.put('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Nur Admins dürfen Templates bearbeiten.' });
  try {
    const [updatedRows, [template]] = await Template.update(req.body, { where: { id: req.params.id }, returning: true });
    if (!updatedRows) return res.status(404).json({ message: 'Template nicht gefunden' });
    res.json(template);
  } catch (err) {
    res.status(400).json({ message: err.message });
  }
});

// Template löschen (nur Admin)
router.delete('/:id', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Nur Admins dürfen Templates löschen.' });
  const deletedRows = await Template.destroy({ where: { id: req.params.id } });
  if (!deletedRows) return res.status(404).json({ message: 'Template nicht gefunden' });
  res.json({ message: 'Template gelöscht' });
});

export default router; 