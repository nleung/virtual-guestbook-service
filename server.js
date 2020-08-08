const express = require('express');
const path = require('path');
const { Client } = require('pg');
const bodyParser = require('body-parser');
var cors = require('cors');

const client = new Client({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

client.connect();

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
  const text = 'SELECT * FROM posts WHERE event_id = $1'
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
  const text = 'INSERT INTO posts (event_id, name, picture_url, comment) VALUES ($1, $2, $3, $4) RETURNING *'
  const values = [req.body.event_id, req.body.name, req.body.picture_url, req.body.comment]
  client.query(text, values, (err, queryRes) => {
    if (err) {
      console.log(err.stack)
      res.send(err.stack)
    } else {
      res.status(200).json(queryRes.rows[0])
    }
  })
})

const port = process.env.PORT || 5000;
app.listen(port);

console.log(`Server listening on ${port}`);
