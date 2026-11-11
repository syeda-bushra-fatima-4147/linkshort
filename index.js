
const express = require('express');
const cors = require('cors');
const { DatabaseSync } = require('node:sqlite');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', true);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// SQLite database
const db = new DatabaseSync('links.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS links (
    code TEXT PRIMARY KEY,
    url TEXT NOT NULL,
    clicks INTEGER DEFAULT 0
  )
`);

// Generate short code
function makeCode() {
  return Math.random().toString(36).substring(2, 8);
}

// Shorten URL
app.post('/shorten', function (req, res) {
  const url = req.body.url;

  if (!url || !url.startsWith('http')) {
    return res.status(400).json({
      error: 'Enter a full link starting with https://'
    });
  }

  const code = makeCode();

  try {
    db.prepare(
      'INSERT INTO links (code, url) VALUES (?, ?)'
    ).run(code, url);

    const shortUrl =
      req.protocol + '://' + req.get('host') + '/' + code;

    res.json({
      short: shortUrl,
      shortUrl: shortUrl
    });

  } catch (error) {
    res.status(500).json({
      error: 'Could not create short link'
    });
  }
});

// Redirect shortened URL
app.get('/:code', function (req, res) {
  const row = db.prepare(
    'SELECT url FROM links WHERE code = ?'
  ).get(req.params.code);

  if (!row) {
    return res.status(404).send('Link not found');
  }

  db.prepare(
    'UPDATE links SET clicks = clicks + 1 WHERE code = ?'
  ).run(req.params.code);

  res.redirect(row.url);
});

// Start server
app.listen(PORT, function () {
  console.log('LinkShort running on port ' + PORT);
});
