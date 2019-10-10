'use strict';

const topic = 'eko/mqtt/ios';
// const host = 'mqtt://test.mosquitto.org';
// const host = 'mqtt://test.mosquitto.org';
const host = 'mqtt://localhost:1883';
// const port = 1883;

const mqtt = require('mqtt');
const faker = require('faker');
const client = mqtt.connect(host, {
  clientId: 'publisher',
  clean: false, // set to false to receive QoS 1 and 2 messages while offline
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

  let running = 1;
  while (true) {
    await new Promise((resolve, reject) => {
      // const msg = faker.lorem.text();
      const msg = `Message ${running++}`;
      client.publish(topic, msg, {
        qos: 1,
        retain: false
      }, (err) => {
        if (err) return reject(err);

        console.error(`PUD:: ==> publishing message: ${msg}`);
        return resolve(true);
      });
    });

    await new Promise((resolve, reject) => {
      setTimeout(resolve, 1000);
    });
  }
}

run();
