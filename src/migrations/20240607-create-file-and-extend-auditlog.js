'use strict';

export async function up(queryInterface, Sequelize) {
  // Tabelle Files anlegen
  await queryInterface.createTable('Files', {
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: Sequelize.INTEGER
    },
    filename: {
      type: Sequelize.STRING,
      allowNull: false
    },
    originalname: {
      type: Sequelize.STRING,
      allowNull: false
    },
    uploader: {
      type: Sequelize.STRING,
      allowNull: false
    },
    path: {
      type: Sequelize.STRING,
      allowNull: false
    },
    mimetype: {
      type: Sequelize.STRING,
      allowNull: false
    },
    size: {
      type: Sequelize.INTEGER,
      allowNull: false
    },
    createdAt: {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.fn('NOW')
    },
    updatedAt: {
      allowNull: false,
      type: Sequelize.DATE,
      defaultValue: Sequelize.fn('NOW')
    }
  });
  // Spalte targetId zu AuditLogs hinzufügen
  await queryInterface.addColumn('AuditLogs', 'targetId', {
    type: Sequelize.INTEGER,
    allowNull: true
  });
}

export async function down(queryInterface, Sequelize) {
  // Rollback: Spalte und Tabelle entfernen
  await queryInterface.removeColumn('AuditLogs', 'targetId');
  await queryInterface.dropTable('Files');
} 