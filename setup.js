const { google } = require('googleapis');

const LABEL_NAME = 'Obai';
const FILTER_SUBJECT = 'New Claim Created';

async function getOrCreateLabel(gmail) {
  const res = await gmail.users.labels.list({ userId: 'me' });
  const labels = res.data.labels || [];

  const existing = labels.find(
    (l) => l.name.toLowerCase() === LABEL_NAME.toLowerCase()
  );

  if (existing) {
    console.log(`Label "${LABEL_NAME}" already exists (ID: ${existing.id})`);
    return existing.id;
  }

  const created = await gmail.users.labels.create({
    userId: 'me',
    requestBody: {
      name: LABEL_NAME,
      labelListVisibility: 'labelShow',
      messageListVisibility: 'show',
    },
  });

  console.log(`Label "${LABEL_NAME}" created (ID: ${created.data.id})`);
  return created.data.id;
}

async function getOrCreateFilter(gmail, labelId) {
  const res = await gmail.users.settings.filters.list({ userId: 'me' });
  const filters = res.data.filter || [];

  const existing = filters.find(
    (f) =>
      f.criteria?.subject === FILTER_SUBJECT &&
      f.action?.addLabelIds?.includes(labelId)
  );

  if (existing) {
    console.log(`Filter already exists (ID: ${existing.id})`);
    return;
  }

  await gmail.users.settings.filters.create({
    userId: 'me',
    requestBody: {
      criteria: {
        subject: FILTER_SUBJECT,
      },
      action: {
        addLabelIds: [labelId],
        removeLabelIds: [],
      },
    },
  });

  console.log(`Filter created — emails with subject "${FILTER_SUBJECT}" will go to "${LABEL_NAME}"`);
}

async function backfillExistingEmails(gmail, labelId) {
  const res = await gmail.users.messages.list({
    userId: 'me',
    q: `subject:"${FILTER_SUBJECT}"`,
    maxResults: 500,
  });

  const messages = res.data.messages || [];

  if (messages.length === 0) {
    console.log('No existing emails to backfill.');
    return;
  }

  console.log(`Backfilling ${messages.length} existing email(s) to "${LABEL_NAME}"...`);

  for (const msg of messages) {
    await gmail.users.messages.modify({
      userId: 'me',
      id: msg.id,
      requestBody: {
        addLabelIds: [labelId],
      },
    });
  }

  console.log('Backfill complete.');
}

async function setupGmail(auth) {
  const gmail = google.gmail({ version: 'v1', auth });

  console.log('\nSetting up Gmail...');
  const labelId = await getOrCreateLabel(gmail);
  await getOrCreateFilter(gmail, labelId);
  await backfillExistingEmails(gmail, labelId);
  console.log('Setup complete.\n');

  return labelId;
}

module.exports = { setupGmail };
