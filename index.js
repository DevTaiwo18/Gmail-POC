const { authenticate } = require('./auth');
const { fetchLabeledEmails } = require('./gmail');

async function main() {
  console.log('Gmail OAuth POC — Obai Label Reader');
  console.log('====================================\n');

  const auth = await authenticate();
  await fetchLabeledEmails(auth, 'Obai');
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
