const express = require('express');
const { DatabaseSync } = require('node:sqlite');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', true);

const db = new DatabaseSync('links.db');
db.exec('CREATE TABLE IF NOT EXISTS links (code TEXT PRIMARY KEY, url TEXT NOT NULL, clicks INTEGER DEFAULT 0)');

app.use(express.json());
app.use(express.static('public'));

function makeCode() {
  return Math.random().toString(36).substring(2, 8);
}

app.post('/shorten', function (req, res) {
  const url = req.body.url;
  if (!url || !url.startsWith('http')) {
    return res.status(400).json({ error: 'Enter a full link starting with https://' });
  }
  const code = makeCode();
  db.prepare('INSERT INTO links (code, url) VALUES (?, ?)').run(code, url);
  res.json({ short: req.protocol + '://' + req.get('host') + '/' + code });
});

app.get('/:code', function (req, res) {
  const row = db.prepare('SELECT url FROM links WHERE code = ?').get(req.params.code);
  if (!row) return res.status(404).send('Link not found');
  db.prepare('UPDATE links SET clicks = clicks + 1 WHERE code = ?').run(req.params.code);
  res.redirect(row.url);
});

app.listen(PORT, function () {
  console.log('LinkShort running on port ' + PORT);
});