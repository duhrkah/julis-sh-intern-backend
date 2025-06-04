import { DataTypes, Model } from 'sequelize';
import sequelize from './sequelize.js';

class PushToken extends Model {}

PushToken.init({
  userId: {
    type: DataTypes.INTEGER.UNSIGNED,
    allowNull: false,
    references: { model: 'Users', key: 'id' },
    onDelete: 'CASCADE',
  },
  deviceToken: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
}, {
  sequelize,
  modelName: 'PushToken',
  timestamps: true,
});

export default PushToken; 