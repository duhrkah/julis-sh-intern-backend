import { DataTypes, Model } from 'sequelize';
import { sequelize } from './index.js';
import Kreis from './Kreis.js';

class Recipient extends Model {}

Recipient.init({
  name: { type: DataTypes.STRING, allowNull: false },
  email: { type: DataTypes.STRING, allowNull: false },
  rolle: { type: DataTypes.STRING, allowNull: false },
}, {
  sequelize,
  modelName: 'Recipient',
  timestamps: true,
});

Recipient.belongsTo(Kreis, { foreignKey: { name: 'KreisId', allowNull: false }, onDelete: 'CASCADE' });

export default Recipient; 