const express = require('express');
const path = require('path');
const { Client } = require('pg');
const bodyParser = require('body-parser');
var cors = require('cors');
var aws = require('aws-sdk');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

client.connect();

aws.config.update({
  region: 'us-west-2',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  signature: 'v4'
})

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Put all API endpoints under '/api'
app.get('/api/debug', (req, res) => {
  rows = 0;
  client.query('SELECT table_schema,table_name FROM information_schema.tables;', (err, queryRes) => {
    if (err) throw err;
    for (let row of queryRes.rows) {
      rows += 1
      console.log(JSON.stringify(row));
    }
    client.end();

    res.status(200).json({
      "rows": rows
    });
  });
});

app.get('/api/posts/:event_id', (req, res) => {
  const text = 'SELECT * FROM posts WHERE event_id = $1 ORDER BY last_updated DESC'
  const values = [ req.params.event_id ]
  client.query(text, values, (err, queryRes) => {
    if (err) {
      console.log(err.stack)
      res.send(err.stack)
    } else {
      res.status(200).json({
        "posts": queryRes.rows
      })
    }
  })
});

app.post('/api/posts/create', function (req, res) {
  const text = 'INSERT INTO posts (event_id, name, picture_url, comment, last_updated) VALUES ($1, $2, $3, $4, $5) RETURNING *'
  const values = [req.body.event_id, req.body.name, req.body.picture_url, req.body.comment, Date.now()]
  client.query(text, values, (err, queryRes) => {
    if (err) {
      console.log(err.stack)
      res.send(err.stack)
    } else {
      res.status(200).json(queryRes.rows[0])
    }
  })
});

app.post('/api/create_signed_url', function (req, res) {
  const s3 = new aws.S3();  // Create a new instance of S3
  const s3Params = {
    Bucket: 'virtual-guestbook',
    Key: req.body.file_name,
    Expires: 500,
    ContentType: req.body.file_type,
    ACL: 'public-read'
  };

  s3.getSignedUrl('putObject', s3Params, (err, signed_url) => {
    if (err) {
      console.log(err)
      res.send(err.stack)
    } else {
      res.status(200).json({
        'signed_url': signed_url,
        'object_url': "https://virtual-guestbook.s3-us-west-2.amazonaws.com/" + encodeURIComponent(req.body.file_name)
      });
    }
  });
});

const port = process.env.PORT || 5000;
app.listen(port);

console.log(`Server listening on ${port}`);
