'use strict';

/** @type {import('sequelize-cli').Migration} */
export async function up(queryInterface, Sequelize) {
  await queryInterface.changeColumn('AuditLogs', 'type', {
    type: Sequelize.ENUM('mitglied', 'empfaenger', 'user_update', 'user_create', 'user_delete'),
    allowNull: true
  });
}

export async function down(queryInterface, Sequelize) {
  await queryInterface.changeColumn('AuditLogs', 'type', {
    type: Sequelize.ENUM('mitglied', 'empfaenger'),
    allowNull: true
  });
}
