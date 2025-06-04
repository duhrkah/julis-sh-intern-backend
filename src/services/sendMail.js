import { Client } from '@microsoft/microsoft-graph-client';
import 'isomorphic-fetch';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
dotenv.config();

function getAccessToken() {
  const url = `https://login.microsoftonline.com/${process.env.TENANT_ID}/oauth2/v2.0/token`;
  const params = new URLSearchParams();
  params.append('client_id', process.env.CLIENT_ID);
  params.append('scope', 'https://graph.microsoft.com/.default');
  params.append('client_secret', process.env.CLIENT_SECRET);
  params.append('grant_type', 'client_credentials');
  return fetch(url, { method: 'POST', body: params })
    .then(res => res.json())
    .then(data => data.access_token);
}

export async function sendMail({ to, subject, body, attachments }) {
  attachments = Array.isArray(attachments) ? attachments : [];
  const accessToken = await getAccessToken();
  const client = Client.init({
    authProvider: (done) => done(null, accessToken),
  });

  const message = {
    subject,
    body: {
      contentType: 'HTML',
      content: body,
    },
    toRecipients: to.map(email => ({ emailAddress: { address: email } })),
    attachments: attachments.map(file => ({
      '@odata.type': '#microsoft.graph.fileAttachment',
      name: file.filename,
      contentBytes: fs.readFileSync(path.resolve('uploads', file.filename)).toString('base64'),
    })),
  };

  await client.api('/users/' + process.env.SENDER_MAIL + '/sendMail').post({ message });
}

export function renderTemplate(template, data) {
  const replaced = template.replace(/\{(\w+)\}/g, (_, key) => data[key] || '');
  return replaced.replace(/\n/g, '<br>');
} 