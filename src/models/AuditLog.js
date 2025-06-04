import { DataTypes, Model } from 'sequelize';
import { sequelize } from './index.js';

class AuditLog extends Model {}

AuditLog.init({
  user: { type: DataTypes.STRING },
  scenario: { type: DataTypes.STRING },
  kreis: { type: DataTypes.STRING },
  mitgliedEmail: { type: DataTypes.STRING },
  empfaenger: { type: DataTypes.JSON },
  type: { type: DataTypes.ENUM('mitglied', 'empfaenger', 'user_update', 'user_create', 'user_delete') },
  timestamp: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  targetId: { type: DataTypes.INTEGER, allowNull: true },
}, {
  sequelize,
  modelName: 'AuditLog',
  timestamps: true,
});

export default AuditLog; 