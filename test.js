'use strict';

const mongo = require('mongodb');
const MongoClient = mongo.MongoClient;

MongoClient.connect('mongodb://localhost:27017', (err, client) => {
  if (err) return console.error(`PUD:: ==> `, err);

  console.error(`PUD:: ==> connected`);
  const db = client.db('mqtt');

  db.collection('retained').findOne({}, (err, data) => {
    if (err) {
      console.error(`PUD:: ==> `, err);
      client.close();
    }

    console.log(data.payload.toString());
    client.close();
  });
});