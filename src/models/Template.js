import { DataTypes, Model } from 'sequelize';
import { sequelize } from './index.js';

class Template extends Model {}

Template.init({
  name: { type: DataTypes.STRING, allowNull: false },
  type: { type: DataTypes.ENUM('mitglied', 'empfaenger'), allowNull: false },
  scenario: { type: DataTypes.STRING, allowNull: false },
  kreis: { type: DataTypes.STRING }, // nur für Empfänger-Templates
  subject: { type: DataTypes.STRING, allowNull: false },
  body: { type: DataTypes.TEXT, allowNull: false },
  attachments: { type: DataTypes.JSON },
}, {
  sequelize,
  modelName: 'Template',
  timestamps: true,
});

export default Template; 