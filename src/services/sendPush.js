// import apn from '@parse/node-apn';
// import path from 'path';

// const apnProvider = new apn.Provider({
//   token: {
//     key: path.resolve('config/AuthKey.p8'), // Passe den Pfad ggf. an
//     keyId: process.env.APN_KEY_ID,
//     teamId: process.env.APN_TEAM_ID,
//   },
//   production: process.env.NODE_ENV === 'production',
// });

// export default async function sendPush(deviceToken, title, body, data = {}) {
//   const note = new apn.Notification();
//   note.alert = { title, body };
//   note.payload = data;
//   note.topic = process.env.APN_BUNDLE_ID; // z. B. com.deinverein.app
//   try {
//     await apnProvider.send(note, deviceToken);
//   } catch (err) {
//     console.error('APNs-Fehler:', err);
//   }
// } 