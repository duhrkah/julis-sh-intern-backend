'use strict';
export async function up(queryInterface, Sequelize) {
  await queryInterface.createTable('PushTokens', {
    id: { allowNull: false, autoIncrement: true, primaryKey: true, type: Sequelize.INTEGER },
    userId: { 
      type: Sequelize.INTEGER.UNSIGNED, 
      allowNull: false, 
      references: { model: 'Users', key: 'id' },
      onDelete: 'CASCADE' 
    },
    deviceToken: { type: Sequelize.STRING, allowNull: false, unique: true },
    createdAt: { allowNull: false, type: Sequelize.DATE },
    updatedAt: { allowNull: false, type: Sequelize.DATE }
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.dropTable('PushTokens');
}