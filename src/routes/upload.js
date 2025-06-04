import express from 'express';
import multer from 'multer';
import auth from '../middleware/auth.js';
import fs from 'fs';
import path from 'path';
import File from '../models/File.js';
import AuditLog from '../models/AuditLog.js';
import requireRole from '../middleware/requireRole.js';

const router = express.Router();

const uploadDir = path.resolve('uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
});

// Datei-Upload (nur Admin)
router.post('/', requireRole('admin'), upload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Keine Datei hochgeladen.' });
  const file = await File.create({
    filename: req.file.filename,
    originalname: req.file.originalname,
    uploader: req.user.email,
    path: req.file.path,
    mimetype: req.file.mimetype,
    size: req.file.size,
  });
  await AuditLog.create({ user: req.user.email, type: 'file_upload', scenario: null, kreis: null, mitgliedEmail: null, empfaenger: null, timestamp: new Date() });
  res.json({ filename: file.filename, url: `/uploads/${file.filename}` });
});

// Galerie: Alle Dateien (nur Admin)
router.get('/', requireRole('admin'), async (req, res) => {
  const files = await File.findAll({ order: [['createdAt', 'DESC']] });
  res.json(files);
});

// Datei-Download (Admin & User)
router.get('/:filename', auth, async (req, res) => {
  const file = await File.findOne({ where: { filename: req.params.filename } });
  if (!file) return res.status(404).json({ message: 'Datei nicht gefunden.' });
  await AuditLog.create({ user: req.user.email, type: 'file_download', scenario: null, kreis: null, mitgliedEmail: null, empfaenger: null, timestamp: new Date() });
  res.download(file.path, file.originalname);
});

// Datei löschen (nur Admin)
router.delete('/:filename', requireRole('admin'), async (req, res) => {
  const file = await File.findOne({ where: { filename: req.params.filename } });
  if (!file) return res.status(404).json({ message: 'Datei nicht gefunden.' });
  fs.unlinkSync(file.path);
  await file.destroy();
  await AuditLog.create({ user: req.user.email, type: 'file_delete', scenario: null, kreis: null, mitgliedEmail: null, empfaenger: null, timestamp: new Date() });
  res.json({ message: 'Datei gelöscht.' });
});

export default router; 