import sequelize from './sequelize.js';
import User from './User.js';
import PushToken from './PushToken.js';
import Kreis from './Kreis.js';

PushToken.belongsTo(User, { foreignKey: 'userId' });
User.hasMany(PushToken, { foreignKey: 'userId' });

export { sequelize, User, PushToken, Kreis }; 