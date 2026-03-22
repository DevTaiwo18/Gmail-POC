const { google } = require('googleapis');

async function getLabelId(auth, labelName) {
  const gmail = google.gmail({ version: 'v1', auth });
  const res = await gmail.users.labels.list({ userId: 'me' });
  const labels = res.data.labels || [];

  const match = labels.find(
    (l) => l.name.toLowerCase() === labelName.toLowerCase()
  );

  if (!match) {
    console.log('\nAvailable labels:');
    labels.forEach((l) => console.log(' -', l.name));
    throw new Error(`Label "${labelName}" not found in your Gmail.`);
  }

  return match.id;
}

async function fetchLabeledEmails(auth, labelName = 'Obai') {
  const gmail = google.gmail({ version: 'v1', auth });

  console.log(`\nLooking for label: "${labelName}"...`);
  const labelId = await getLabelId(auth, labelName);
  console.log(`Found label ID: ${labelId}`);

  const listRes = await gmail.users.messages.list({
    userId: 'me',
    labelIds: [labelId],
    maxResults: 10,
  });

  const messages = listRes.data.messages || [];

  if (messages.length === 0) {
    console.log(`\nNo emails found under the "${labelName}" label.`);
    return;
  }

  console.log(`\nFound ${messages.length} email(s) under "${labelName}":\n`);
  console.log('='.repeat(60));

  for (const msg of messages) {
    const detail = await gmail.users.messages.get({
      userId: 'me',
      id: msg.id,
      format: 'metadata',
      metadataHeaders: ['Subject', 'From', 'Date'],
    });

    const headers = detail.data.payload.headers;
    const get = (name) =>
      headers.find((h) => h.name === name)?.value || '(none)';

    console.log(`From:    ${get('From')}`);
    console.log(`Date:    ${get('Date')}`);
    console.log(`Subject: ${get('Subject')}`);
    console.log(`ID:      ${msg.id}`);
    console.log('-'.repeat(60));
  }
}

module.exports = { fetchLabeledEmails };
