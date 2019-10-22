'use strict';

const topic = 'eko/mqtt/ios';
// const host = 'mqtt://test.mosquitto.org';
// const host = 'mqtt://localhost';
const host = 'ws://localhost:8080';


const mqtt = require('mqtt');

const faker = require('faker');
const client = mqtt.connect(host, {
  clientId: `subscriber${process.env.SUBSCRIBE || 1}`,
  clean: false,
  username: 'eko',
  password: 'token'
});

const ready = new Promise((resolve, reject) => {
  client
    .on('connect', () => {
      console.error(`PUD:: ==> connected`);
      return resolve(true);
    })
    .on('reconnect', () => {
      console.error(`PUD:: ==> reconnecting`);
    })
    .on('close', () => {
      console.error(`PUD:: ==> disconnected`);
    })
    // .on('offline', () => {
    //   console.error(`PUD:: ==> offline`);
    // })
    .on('error', (err) => {
      console.error(`PUD:: ==> error`, err);
      return reject(err);
    })
    .on('message', (topic, message, packet) => {
      console.error(`PUD:: ==> topic: ${topic}, message: ${message}`);
    });
});

async function run() {
  await ready;

  await new Promise((resolve, reject) => {
    client.subscribe(topic, {
      qos: 1
    }, (err, granted) => {
      if (err) return reject(err);

      granted.forEach((grant) => {
        console.error(`subscibed to ${grant.topic} with qos ${grant.qos}`);
      });
      return resolve(true);
    });
  });
}

run()
  .catch(error => {
    console.error(`PUD:: ==> `, error);
  });
