
const express = require('express');
const cors = require('cors');
const { MongoClient } = require('mongodb');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', true);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// MongoDB connection
const client = new MongoClient(process.env.MONGO_URI);

let linksCollection;

// Generate short code
function makeCode() {
  return Math.random().toString(36).substring(2, 8);
}

// Start server after MongoDB connects
async function startServer() {
  try {
    await client.connect();

    console.log('MongoDB connected successfully!');

    const database = client.db('linkshort');

    linksCollection = database.collection('links');

    await linksCollection.createIndex(
      { code: 1 },
      { unique: true }
    );

    // Shorten URL
    app.post('/shorten', async function (req, res) {
      try {
        const url = req.body.url;

        if (!url || !url.startsWith('http')) {
          return res.status(400).json({
            error: 'Enter a full link starting with https://'
          });
        }

        const code = makeCode();

        await linksCollection.insertOne({
          code: code,
          url: url,
          clicks: 0
        });

        const shortUrl =
          req.protocol + '://' + req.get('host') + '/' + code;

        res.json({
          short: shortUrl,
          shortUrl: shortUrl
        });

      } catch (error) {
        console.error('Shorten error:', error);

        res.status(500).json({
          error: 'Could not create short link'
        });
      }
    });

    // Redirect shortened URL
    app.get('/:code', async function (req, res) {
      try {
        const code = req.params.code;

        const row = await linksCollection.findOne({
          code: code
        });

        if (!row) {
          return res.status(404).send('Link not found');
        }

        await linksCollection.updateOne(
          { code: code },
          { $inc: { clicks: 1 } }
        );

        res.redirect(row.url);

      } catch (error) {
        console.error('Redirect error:', error);

        res.status(500).send('Server error');
      }
    });

    // Start server
    app.listen(PORT, function () {
      console.log('LinkShort running on port ' + PORT);
    });

  } catch (error) {
    console.error('MongoDB connection failed:', error);
    process.exit(1);
  }
}

startServer();
