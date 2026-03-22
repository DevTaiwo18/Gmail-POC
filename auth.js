require('dotenv').config();
const { google } = require('googleapis');
const http = require('http');
const url = require('url');
const fs = require('fs');

const TOKENS_FILE = './tokens.json';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI
);

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

function getAuthUrl() {
  return oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
    prompt: 'consent',
  });
}

function saveTokens(tokens) {
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
  console.log('Tokens saved to tokens.json');
}

function loadTokens() {
  if (fs.existsSync(TOKENS_FILE)) {
    const tokens = JSON.parse(fs.readFileSync(TOKENS_FILE));
    oauth2Client.setCredentials(tokens);
    return true;
  }
  return false;
}

function waitForCallback() {
  return new Promise((resolve, reject) => {
    const server = http.createServer(async (req, res) => {
      const parsedUrl = url.parse(req.url, true);

      if (parsedUrl.pathname === '/oauth/callback') {
        const code = parsedUrl.query.code;

        if (!code) {
          res.end('No code received. Try again.');
          reject(new Error('No auth code in callback'));
          server.close();
          return;
        }

        try {
          const { tokens } = await oauth2Client.getToken(code);
          oauth2Client.setCredentials(tokens);
          saveTokens(tokens);

          res.end('<h1>Auth successful!</h1><p>You can close this tab and return to the terminal.</p>');
          server.close();
          resolve(oauth2Client);
        } catch (err) {
          res.end('Error getting token: ' + err.message);
          reject(err);
          server.close();
        }
      } else {
        res.end('Waiting for OAuth callback...');
      }
    });

    server.listen(3000, () => {
      console.log('Listening on http://localhost:3000 for OAuth callback...');
    });
  });
}

async function authenticate() {
  if (loadTokens()) {
    console.log('Loaded existing tokens from tokens.json');
    return oauth2Client;
  }

  const authUrl = getAuthUrl();
  console.log('\nOpen this URL in your browser to authorize:\n');
  console.log(authUrl);
  console.log('\nWaiting for you to complete the auth flow...\n');

  return waitForCallback();
}

module.exports = { authenticate, oauth2Client };
