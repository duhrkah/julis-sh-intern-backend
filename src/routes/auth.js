import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import auth from '../middleware/auth.js';
import crypto from 'crypto';
import { Op } from 'sequelize';
import { BearerStrategy } from 'passport-azure-ad';
import { jwtDecode } from 'jwt-decode';
import { sendMail } from '../services/sendMail.js';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';

const router = express.Router();

// Strenges Rate Limiting für Login
const isDev = process.env.NODE_ENV === 'development';
const loginLimiter = isDev ? (req, res, next) => next() : rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Zu viele fehlgeschlagene Login-Versuche. Bitte warte 15 Minuten.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Account Lockout Map (in-memory, für Demo-Zwecke)
const failedLogins = new Map();
const LOCKOUT_TIME = 15 * 60 * 1000; // 15 Minuten

// Login
router.post('/login',
  loginLimiter,
  body('email').isEmail().withMessage('Ungültige E-Mail'),
  body('password').isLength({ min: 6 }).withMessage('Passwort zu kurz'),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ message: errors.array().map(e => e.msg).join(', ') });
    }
    const { email, password } = req.body;
    const ip = req.ip;
    const now = Date.now();
    // Account Lockout prüfen
    if (failedLogins.has(ip) && failedLogins.get(ip).until > now) {
      return res.status(429).json({ message: 'Account temporär gesperrt. Bitte warte einige Minuten.' });
    }
    const user = await User.findOne({ where: { email } });
    if (!user) {
      failedLogins.set(ip, { count: (failedLogins.get(ip)?.count || 0) + 1, until: now });
      return res.status(400).json({ message: 'Ungültige Zugangsdaten' });
    }
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      const entry = failedLogins.get(ip) || { count: 0, until: now };
      entry.count++;
      if (entry.count >= 5) {
        entry.until = now + LOCKOUT_TIME;
      }
      failedLogins.set(ip, entry);
      return res.status(400).json({ message: 'Ungültige Zugangsdaten' });
    }
    failedLogins.delete(ip); // Reset bei Erfolg
    const token = jwt.sign({ id: user.id, role: user.role, email: user.email }, process.env.JWT_SECRET, { expiresIn: '15m' });
    res.json({ token, user: { email: user.email, role: user.role } });
  }
);

// Registrierung (nur Admin)
router.post('/register', auth, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ message: 'Nur Admins dürfen neue Nutzer anlegen.' });
  const { email, password, role } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'Email und Passwort erforderlich.' });
  const exists = await User.findOne({ where: { email } });
  if (exists) return res.status(400).json({ message: 'Nutzer existiert bereits.' });
  const user = new User({ email, password, role: role || 'user' });
  await user.save();
  res.status(201).json({ message: 'Nutzer angelegt.' });
});

// Passwort-Reset anfordern
router.post('/request-reset', async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ where: { email } });
  if (!user) return res.status(200).json({ message: 'Falls die E-Mail existiert, wurde eine Reset-Mail versendet.' });
  const token = crypto.randomBytes(32).toString('hex');
  const expires = new Date(Date.now() + 1000 * 60 * 60); // 1h
  await user.setResetToken(token, expires);
  await user.save();
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
  await sendMail({
    to: [user.email],
    subject: 'Passwort zurücksetzen',
    body: `<p>Hallo,<br>du hast einen Passwort-Reset angefordert.<br>Klicke auf folgenden Link, um ein neues Passwort zu setzen:<br><a href="${resetUrl}">${resetUrl}</a><br>Der Link ist 1 Stunde gültig.</p>`,
    attachments: []
  });
  res.json({ message: 'Falls die E-Mail existiert, wurde eine Reset-Mail versendet.' });
});

// Passwort mit Token zurücksetzen
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  const user = await User.findOne({ where: { resetToken: token, resetTokenExpires: { [Op.gt]: new Date() } } });
  if (!user) return res.status(400).json({ message: 'Token ungültig oder abgelaufen.' });
  await user.update({ password, resetToken: null, resetTokenExpires: null });
  res.json({ message: 'Passwort erfolgreich zurückgesetzt.' });
});

// Microsoft SSO-Login
router.post('/microsoft', async (req, res) => {
  const { token } = req.body;
  const ip = req.ip;
  const now = new Date().toISOString();
  let email = null;
  try {
    if (!token) {
      console.log(`[${now}] [MS-Login] Versuch ohne Token von IP ${ip}`);
      return res.status(400).json({ message: 'Kein Token übergeben.' });
    }
    const decoded = jwtDecode(token);
    email = decoded.preferred_username || decoded.email;
    const displayName = decoded.name || decoded.displayName || email;
    const allowedDomain = process.env.MS_ALLOWED_DOMAIN || '@julis-sh.de';
    console.log(`[${now}] [MS-Login] Loginversuch von IP ${ip}, Email: ${email}`);
    if (!email || !email.endsWith(allowedDomain)) {
        console.log(`[${now}] [MS-Login] Abgelehnt: Nicht erlaubte Domain (${email}) von IP ${ip}`);
        return res.status(403).json({ message: 'Nur Organisation-Accounts erlaubt.' });
    }
    // Rolle aus Azure-Token bestimmen
    const msRoles = decoded.roles || [];
    let role = 'user';
    if (msRoles.includes('admin')) role = 'admin';
    else if (msRoles.includes('lgst')) role = 'lgst';
    else if (msRoles.includes('vorstand')) role = 'vorstand';
    // User suchen oder anlegen
    let user = await User.findOne({ where: { email } });
    if (!user) {
      user = await User.create({ email, password: crypto.randomBytes(32).toString('hex'), role });
      console.log(`[${now}] [MS-Login] Neuer User angelegt: ${email} mit Rolle ${role}`);
    } else if (user.role !== role) {
      user.role = role;
      await user.save();
      console.log(`[${now}] [MS-Login] Rolle für ${email} auf ${role} synchronisiert`);
    }
    // Rolle immer aus DB
    const appToken = jwt.sign({ id: user.id, role: user.role, email: user.email, displayName }, process.env.JWT_SECRET, { expiresIn: '15m' });
    res.json({ token: appToken, user: { email: user.email, role: user.role, displayName } });
  } catch (err) {
    console.log(`[${now}] [MS-Login] Fehler bei Loginversuch von IP ${ip}, Email: ${email}, Fehler: ${err.message}`);
    res.status(401).json({ message: 'Microsoft-Token ungültig.' });
  }
});

// Token erneuern (Sliding Expiration)
router.post('/renew', auth, async (req, res) => {
  const user = await User.findByPk(req.user.id);
  if (!user) return res.status(401).json({ message: 'User nicht gefunden' });
  const displayName = user.displayName || user.email;
  const token = jwt.sign({ id: user.id, role: user.role, email: user.email, displayName }, process.env.JWT_SECRET, { expiresIn: '15m' });
  res.json({ token });
});

export default router; 