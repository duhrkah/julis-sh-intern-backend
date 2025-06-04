import express from 'express';
import { PushToken } from '../models/index.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Device-Token registrieren
router.post('/register', auth, async (req, res) => {
  const userId = req.user.id;
  const { deviceToken } = req.body;
  if (!deviceToken) return res.status(400).json({ error: 'deviceToken erforderlich' });
  try {
    await PushToken.upsert({ userId, deviceToken });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Speichern des Tokens' });
  }
});

// Device-Token abmelden
router.post('/unregister', auth, async (req, res) => {
  const userId = req.user.id;
  const { deviceToken } = req.body;
  if (!deviceToken) return res.status(400).json({ error: 'deviceToken erforderlich' });
  try {
    await PushToken.destroy({ where: { userId, deviceToken } });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: 'Fehler beim Entfernen des Tokens' });
  }
});

export default router; 