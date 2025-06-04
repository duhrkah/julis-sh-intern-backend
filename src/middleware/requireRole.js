import auth from './auth.js';

export default function requireRole(role) {
  return [
    auth,
    (req, res, next) => {
      if (!req.user || req.user.role !== role) {
        return res.status(403).json({ message: `Nur ${role}s erlaubt.` });
      }
      next();
    }
  ];
} 