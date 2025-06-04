import { DataTypes, Model } from 'sequelize';
import bcrypt from 'bcryptjs';
import sequelize from './sequelize.js';

class User extends Model {
  async comparePassword(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
  }
  setResetToken(token, expires) {
    this.resetToken = token;
    this.resetTokenExpires = expires;
  }
  clearResetToken() {
    this.resetToken = null;
    this.resetTokenExpires = null;
  }
}

User.init({
  email: { type: DataTypes.STRING, allowNull: false, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  role: { type: DataTypes.ENUM('admin', 'lgst', 'vorstand', 'user'), defaultValue: 'user' },
  resetToken: { type: DataTypes.STRING },
  resetTokenExpires: { type: DataTypes.DATE },
  msId: { type: DataTypes.STRING, allowNull: true },
}, {
  sequelize,
  modelName: 'User',
  timestamps: true,
  hooks: {
    beforeSave: async (user) => {
      if (user.changed('password')) {
        user.password = await bcrypt.hash(user.password, 10);
      }
    },
  },
});

export default User; 