import { DataTypes, Model } from 'sequelize';
import { sequelize } from './index.js';

class Szenario extends Model {}

Szenario.init({
  value: { type: DataTypes.STRING, allowNull: false, unique: true },
  label: { type: DataTypes.STRING, allowNull: false },
  order: { type: DataTypes.INTEGER },
}, {
  sequelize,
  modelName: 'Szenario',
  timestamps: true,
});

export default Szenario; 