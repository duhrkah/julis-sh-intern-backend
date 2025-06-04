import { DataTypes, Model } from 'sequelize';
import { sequelize } from './index.js';

class File extends Model {}

File.init({
  filename: { type: DataTypes.STRING, allowNull: false },
  originalname: { type: DataTypes.STRING, allowNull: false },
  uploader: { type: DataTypes.STRING, allowNull: false },
  path: { type: DataTypes.STRING, allowNull: false },
  mimetype: { type: DataTypes.STRING, allowNull: false },
  size: { type: DataTypes.INTEGER, allowNull: false },
}, {
  sequelize,
  modelName: 'File',
  timestamps: true,
});

export default File; 