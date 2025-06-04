import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import recipientsRoutes from './routes/recipients.js';
import templatesRoutes from './routes/templates.js';
import uploadRoutes from './routes/upload.js';
import mailRoutes from './routes/mail.js';
import auditlogRoutes from './routes/auditlog.js';
import kreiseRouter from './routes/kreise.js';
import szenarienRouter from './routes/szenarien.js';
import path from 'path';
import usersRouter from './routes/users.js';
import { sequelize } from './models/index.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Security Middlewares
app.use(helmet());
const allowedOrigins = (process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : []).concat(['http://localhost:3000']);

app.use(cors({
  origin: function (origin, callback) {
    // Erlaube Web-Frontend und alle Requests ohne Origin (z. B. von nativen Apps)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
}));
app.use(cookieParser());
app.use(express.json());

// Global Rate Limiting (z. B. 100 Requests pro 15 Minuten pro IP)
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Zu viele Anfragen, bitte später erneut versuchen.'
}));

// Health-Check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Ping-Route für Frontend-Connection-Status
app.get('/api/ping', (req, res) => {
  res.json({ ok: true });
});

// MariaDB Connect
(async () => {
  try {
    await sequelize.authenticate();
    app.listen(PORT, () => console.log(`Server läuft auf Port ${PORT}`));
  } catch (err) {
    console.error('MariaDB Fehler:', err);
  }
})();

app.use('/api/auth', authRoutes);
app.use('/api/recipients', recipientsRoutes);
app.use('/api/templates', templatesRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/mail', mailRoutes);
app.use('/api/auditlog', auditlogRoutes);
app.use('/api/kreise', kreiseRouter);
app.use('/api/szenarien', szenarienRouter);
app.use('/api/users', usersRouter);
app.use('/uploads', express.static(path.resolve('uploads'))); 