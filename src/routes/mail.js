import express from 'express';
import Recipient from '../models/Recipient.js';
import Template from '../models/Template.js';
import { sendMail, renderTemplate } from '../services/sendMail.js';
import auth from '../middleware/auth.js';
import AuditLog from '../models/AuditLog.js';
import Kreis from '../models/Kreis.js';
import { Op } from 'sequelize';
//import sendPush from '../services/sendPush.js';
import User from '../models/User.js';

const router = express.Router();

function safeAttachments(a) {
  if (Array.isArray(a)) return a;
  if (typeof a === 'string') {
    try { const arr = JSON.parse(a); return Array.isArray(arr) ? arr : []; } catch { return []; }
  }
  return [];
}

// Hilfsfunktion: Holt Vorsitzenden/Schatzmeister für einen Kreis
async function getFunktionstraeger(kreisId) {
  const empfaenger = await Recipient.findAll({ where: { KreisId: kreisId } });
  const vorsitzender = empfaenger.find(e => e.rolle === 'Vorsitzender');
  const schatzmeister = empfaenger.find(e => e.rolle === 'Schatzmeister');
  return {
    vorsitzender_name: vorsitzender?.name || '',
    vorsitzender_email: vorsitzender?.email || '',
    schatzmeister_name: schatzmeister?.name || '',
    schatzmeister_email: schatzmeister?.email || '',
  };
}

// Mailversand für Mitglied und Szenario (ohne Speicherung)
router.post('/', auth, async (req, res) => {
  const { mitglied, scenario, attachments = [] } = req.body;
  if (!mitglied) return res.status(400).json({ message: 'Mitgliedsdaten erforderlich' });

  // Verbandswechsel: drei Typen
  if (scenario === 'verbandswechsel_eintritt') {
    // Empfänger: neuer Kreis
    const { kreis_neu } = mitglied;
    if (!kreis_neu) return res.status(400).json({ message: 'Neuer Kreis erforderlich.' });
    const neu = await getFunktionstraeger(kreis_neu);
    let kreisNeuName = '';
    if (kreis_neu) {
      const kreisNeuObj = await Kreis.findByPk(kreis_neu);
      kreisNeuName = kreisNeuObj?.name || '';
    }
    const data = {
      ...mitglied,
      kreis_neu: kreisNeuName,
      vorsitzender_neu: neu.vorsitzender_name,
      schatzmeister_neu: neu.schatzmeister_name,
      vorsitzender_email_neu: neu.vorsitzender_email,
      schatzmeister_email_neu: neu.schatzmeister_email,
    };
    const empfaengerMails = [neu.vorsitzender_email, neu.schatzmeister_email].filter(Boolean);
    let empfaengerTemplate = await Template.findOne({
      where: { type: 'empfaenger', scenario, kreis: kreis_neu }
    });
    if (!empfaengerTemplate) {
      const allTemplates = await Template.findAll({ where: { type: 'empfaenger', scenario } });
      empfaengerTemplate = await Template.findOne({
        where: {
          type: 'empfaenger',
          scenario,
          [Op.or]: [
            { kreis: null },
            { kreis: '' }
          ]
        }
      });
    }
    if (!empfaengerTemplate) return res.status(404).json({ message: 'Kein Empfänger-Template für Verbandswechsel-Eintritt und neuen Kreis gefunden' });
    const subjectEmpfaenger = renderTemplate(empfaengerTemplate.subject, data);
    const bodyEmpfaenger = renderTemplate(empfaengerTemplate.body, data);
    if (empfaengerMails.length > 0) {
      await sendMail({ to: empfaengerMails, subject: subjectEmpfaenger, body: bodyEmpfaenger, attachments: safeAttachments(empfaengerTemplate.attachments) });
      await AuditLog.create({ user: req.user.email, scenario, kreis: kreisNeuName, mitgliedEmail: mitglied.email, empfaenger: empfaengerMails, type: 'empfaenger' });
      // Push an alle LGSt- und Admin-User
      const pushUsers = await User.findAll({ where: { role: ['lgst', 'admin'] } });
      for (const user of pushUsers) {
        const tokens = await user.getPushTokens();
        for (const t of tokens) {
          await sendPush(t.deviceToken, 'Mailversand im LGSt-Bereich', subjectEmpfaenger, { type: 'mail', subject: subjectEmpfaenger });
        }
      }
    }
    // Mitglied-Template
    const mitgliedTemplate = await Template.findOne({ where: { type: 'mitglied', scenario } });
    if (!mitgliedTemplate) return res.status(404).json({ message: 'Kein Mitglieder-Template für Verbandswechsel-Eintritt gefunden' });
    const subjectMitglied = renderTemplate(mitgliedTemplate.subject, data);
    const bodyMitglied = renderTemplate(mitgliedTemplate.body, data);
    await sendMail({ to: [mitglied.email], subject: subjectMitglied, body: bodyMitglied, attachments: safeAttachments(mitgliedTemplate.attachments) });
    await AuditLog.create({ user: req.user.email, scenario, kreis: kreisNeuName, mitgliedEmail: mitglied.email, empfaenger: [mitglied.email], type: 'mitglied' });
    return res.json({ message: 'Mails versendet' });
  }

  if (scenario === 'verbandswechsel_austritt') {
    // Empfänger: alter Kreis
    const { kreis_alt } = mitglied;
    if (!kreis_alt) return res.status(400).json({ message: 'Alter Kreis erforderlich.' });
    const alt = await getFunktionstraeger(kreis_alt);
    let kreisAltName = '';
    if (kreis_alt) {
      const kreisAltObj = await Kreis.findByPk(kreis_alt);
      kreisAltName = kreisAltObj?.name || '';
    }
    const data = {
      ...mitglied,
      kreis_alt: kreisAltName,
      vorsitzender_alt: alt.vorsitzender_name,
      schatzmeister_alt: alt.schatzmeister_name,
      vorsitzender_email_alt: alt.vorsitzender_email,
      schatzmeister_email_alt: alt.schatzmeister_email,
    };
    const empfaengerMails = [alt.vorsitzender_email, alt.schatzmeister_email].filter(Boolean);
    let empfaengerTemplate = await Template.findOne({
      where: { type: 'empfaenger', scenario, kreis: kreis_alt }
    });
    if (!empfaengerTemplate) {
      empfaengerTemplate = await Template.findOne({
        where: {
          type: 'empfaenger',
          scenario,
          [Op.or]: [
            { kreis: null },
            { kreis: '' }
          ]
        }
      });
    }
    if (!empfaengerTemplate) return res.status(404).json({ message: 'Kein Empfänger-Template für Verbandswechsel-Austritt und alten Kreis gefunden' });
    const subjectEmpfaenger = renderTemplate(empfaengerTemplate.subject, data);
    const bodyEmpfaenger = renderTemplate(empfaengerTemplate.body, data);
    if (empfaengerMails.length > 0) {
      await sendMail({ to: empfaengerMails, subject: subjectEmpfaenger, body: bodyEmpfaenger, attachments: safeAttachments(empfaengerTemplate.attachments) });
      await AuditLog.create({ user: req.user.email, scenario, kreis: kreisAltName, mitgliedEmail: mitglied.email, empfaenger: empfaengerMails, type: 'empfaenger' });
      // Push an alle LGSt- und Admin-User
      const pushUsers = await User.findAll({ where: { role: ['lgst', 'admin'] } });
      for (const user of pushUsers) {
        const tokens = await user.getPushTokens();
        for (const t of tokens) {
          await sendPush(t.deviceToken, 'Mailversand im LGSt-Bereich', subjectEmpfaenger, { type: 'mail', subject: subjectEmpfaenger });
        }
      }
    }
    // Mitglied-Template
    const mitgliedTemplate = await Template.findOne({ where: { type: 'mitglied', scenario } });
    if (!mitgliedTemplate) return res.status(404).json({ message: 'Kein Mitglieder-Template für Verbandswechsel-Austritt gefunden' });
    const subjectMitglied = renderTemplate(mitgliedTemplate.subject, data);
    const bodyMitglied = renderTemplate(mitgliedTemplate.body, data);
    await sendMail({ to: [mitglied.email], subject: subjectMitglied, body: bodyMitglied, attachments: safeAttachments(mitgliedTemplate.attachments) });
    await AuditLog.create({ user: req.user.email, scenario, kreis: kreisAltName, mitgliedEmail: mitglied.email, empfaenger: [mitglied.email], type: 'mitglied' });
    return res.json({ message: 'Mails versendet' });
  }

  if (scenario === 'verbandswechsel_intern') {
    // Empfänger: alter und neuer Kreis
    const { kreis_alt, kreis_neu } = mitglied;
    if (!kreis_alt || !kreis_neu) return res.status(400).json({ message: 'Alter und neuer Kreis erforderlich.' });
    const alt = await getFunktionstraeger(kreis_alt);
    let kreisAltName = '';
    if (kreis_alt) {
      const kreisAltObj = await Kreis.findByPk(kreis_alt);
      kreisAltName = kreisAltObj?.name || '';
    }
    const neu = await getFunktionstraeger(kreis_neu);
    let kreisNeuName = '';
    if (kreis_neu) {
      const kreisNeuObj = await Kreis.findByPk(kreis_neu);
      kreisNeuName = kreisNeuObj?.name || '';
    }
    const data = {
      ...mitglied,
      kreis_alt: kreisAltName,
      kreis_neu: kreisNeuName,
      vorsitzender_alt: alt.vorsitzender_name,
      schatzmeister_alt: alt.schatzmeister_name,
      vorsitzender_neu: neu.vorsitzender_name,
      schatzmeister_neu: neu.schatzmeister_name,
      vorsitzender_email_alt: alt.vorsitzender_email,
      schatzmeister_email_alt: alt.schatzmeister_email,
      vorsitzender_email_neu: neu.vorsitzender_email,
      schatzmeister_email_neu: neu.schatzmeister_email,
    };
    const empfaengerMails = [alt.vorsitzender_email, alt.schatzmeister_email, neu.vorsitzender_email, neu.schatzmeister_email].filter(Boolean);
    let empfaengerTemplate = await Template.findOne({
      where: { type: 'empfaenger', scenario, kreis: kreis_neu }
    });
    if (!empfaengerTemplate) {
      const allTemplates = await Template.findAll({ where: { type: 'empfaenger', scenario } });
      empfaengerTemplate = await Template.findOne({
        where: {
          type: 'empfaenger',
          scenario,
          [Op.or]: [
            { kreis: null },
            { kreis: '' }
          ]
        }
      });
    }
    if (!empfaengerTemplate) return res.status(404).json({ message: 'Kein Empfänger-Template für Verbandswechsel-Intern und neuen Kreis gefunden' });
    const subjectEmpfaenger = renderTemplate(empfaengerTemplate.subject, data);
    const bodyEmpfaenger = renderTemplate(empfaengerTemplate.body, data);
    if (empfaengerMails.length > 0) {
      await sendMail({ to: empfaengerMails, subject: subjectEmpfaenger, body: bodyEmpfaenger, attachments: safeAttachments(empfaengerTemplate.attachments) });
      await AuditLog.create({ user: req.user.email, scenario, kreis: kreisNeuName, mitgliedEmail: mitglied.email, empfaenger: empfaengerMails, type: 'empfaenger' });
      // Push an alle LGSt- und Admin-User
      const pushUsers = await User.findAll({ where: { role: ['lgst', 'admin'] } });
      for (const user of pushUsers) {
        const tokens = await user.getPushTokens();
        for (const t of tokens) {
          await sendPush(t.deviceToken, 'Mailversand im LGSt-Bereich', subjectEmpfaenger, { type: 'mail', subject: subjectEmpfaenger });
        }
      }
    }
    // Mitglied-Template
    const mitgliedTemplate = await Template.findOne({ where: { type: 'mitglied', scenario } });
    if (!mitgliedTemplate) return res.status(404).json({ message: 'Kein Mitglieder-Template für Verbandswechsel-Intern gefunden' });
    const subjectMitglied = renderTemplate(mitgliedTemplate.subject, data);
    const bodyMitglied = renderTemplate(mitgliedTemplate.body, data);
    await sendMail({ to: [mitglied.email], subject: subjectMitglied, body: bodyMitglied, attachments: safeAttachments(mitgliedTemplate.attachments) });
    await AuditLog.create({ user: req.user.email, scenario, kreis: kreisNeuName, mitgliedEmail: mitglied.email, empfaenger: [mitglied.email], type: 'mitglied' });
    return res.json({ message: 'Mails versendet' });
  }

  // Standardfälle: eintritt, austritt, veraenderung
  let kreisName = '';
  if (mitglied.kreis) {
    const kreisObj = await Kreis.findByPk(mitglied.kreis);
    kreisName = kreisObj?.name || '';
  }
  const empfaenger = await getFunktionstraeger(mitglied.kreis);
  const data = {
    ...mitglied,
    kreis: kreisName,
    vorsitzender: empfaenger.vorsitzender_name,
    schatzmeister: empfaenger.schatzmeister_name,
    vorsitzender_email: empfaenger.vorsitzender_email,
    schatzmeister_email: empfaenger.schatzmeister_email,
  };
  const empfaengerMails = [empfaenger.vorsitzender_email, empfaenger.schatzmeister_email].filter(Boolean);
  let empfaengerTemplate = await Template.findOne({
    where: { type: 'empfaenger', scenario, kreis: mitglied.kreis }
  });
  if (!empfaengerTemplate) {
    empfaengerTemplate = await Template.findOne({
      where: {
        type: 'empfaenger',
        scenario,
        [Op.or]: [
          { kreis: null },
          { kreis: '' }
        ]
      }
    });
  }
  if (!empfaengerTemplate) return res.status(404).json({ message: 'Kein Empfänger-Template für dieses Szenario gefunden' });
  const subjectEmpfaenger = renderTemplate(empfaengerTemplate.subject, data);
  const bodyEmpfaenger = renderTemplate(empfaengerTemplate.body, data);
  if (empfaengerMails.length > 0) {
    await sendMail({ to: empfaengerMails, subject: subjectEmpfaenger, body: bodyEmpfaenger, attachments: safeAttachments(empfaengerTemplate.attachments) });
    await AuditLog.create({ user: req.user.email, scenario, kreis: kreisName, mitgliedEmail: mitglied.email, empfaenger: empfaengerMails, type: 'empfaenger' });
    // Push an alle LGSt- und Admin-User
    const pushUsers = await User.findAll({ where: { role: ['lgst', 'admin'] } });
    for (const user of pushUsers) {
      const tokens = await user.getPushTokens();
      for (const t of tokens) {
        await sendPush(t.deviceToken, 'Mailversand im LGSt-Bereich', subjectEmpfaenger, { type: 'mail', subject: subjectEmpfaenger });
      }
    }
  }
  const mitgliedTemplate = await Template.findOne({ where: { type: 'mitglied', scenario } });
  if (!mitgliedTemplate) return res.status(404).json({ message: 'Kein Mitglieder-Template für dieses Szenario gefunden' });
  const subjectMitglied = renderTemplate(mitgliedTemplate.subject, data);
  const bodyMitglied = renderTemplate(mitgliedTemplate.body, data);
  await sendMail({ to: [mitglied.email], subject: subjectMitglied, body: bodyMitglied, attachments: safeAttachments(mitgliedTemplate.attachments) });
  await AuditLog.create({ user: req.user.email, scenario, kreis: kreisName, mitgliedEmail: mitglied.email, empfaenger: [mitglied.email], type: 'mitglied' });
  res.json({ message: 'Mails versendet' });
});

export default router; 