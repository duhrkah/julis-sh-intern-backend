import kreiseRouter from './kreise.js';
import szenarienRouter from './szenarien.js';
import usersRouter from './users.js';
import express from 'express';
import User from '../models/User.js';
import Recipient from '../models/Recipient.js';
import Kreis from '../models/Kreis.js';
import Szenario from '../models/Szenario.js';
import auth from '../middleware/auth.js';
//import pushRoutes from './push.js';

const router = express.Router();

router.use('/kreise', kreiseRouter);
router.use('/szenarien', szenarienRouter);
router.use('/users', usersRouter);
//router.use('/push', pushRoutes);

// Health-Check/Konsistenzprüfung (nur Admin)
router.get('/health', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Nur Admins.' });
  const result = {};
  // Doppelte User-E-Mails
  const users = await User.findAll();
  const userEmails = users.map(u => u.email);
  result.duplicateUserEmails = userEmails.filter((v, i, a) => a.indexOf(v) !== i);
  const recipients = await Recipient.findAll();
  const kreise = await Kreis.findAll();
  const kreisIds = kreise.map(k => k._id.toString());
  result.recipientsWithInvalidKreis = recipients.filter(r => !kreisIds.includes(r.kreis?.toString()));
  // Szenarien ohne Label oder Value
  const szenarien = await Szenario.findAll();
  result.invalidSzenarien = szenarien.filter(s => !s.value || !s.label);
  res.json(result);
});

export default router; 