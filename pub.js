'use strict';

const topic = 'eko/mqtt/ios';
// const host = 'mqtt://test.mosquitto.org';
// const host = 'mqtt://test.mosquitto.org';
// const host = 'mqtt://localhost:1883';
const host = 'mqtts://localhost:8883';
// const port = 1883;

const mqtt = require('mqtt');
const RPC = require('mqtt-json-rpc');
const jsonrpc = require('jsonrpc-lite');
const fs = require('fs');

const faker = require('faker');
const client = mqtt.connect(host, {
  key: fs.readFileSync('./cert/key1.pem'),
  cert: fs.readFileSync('./cert/cert1.pem'),
  rejectUnauthorized: false,
  clean: true
});

// const client = mqtt.connect(host, {
//   clientId: 'publisher',
//   clean: false, // set to false to receive QoS 1 and 2 messages while offline
// });

const ready = new Promise((resolve, reject) => {
  client
    .on('connect', () => {
      console.error(`PUD:: ==> connected`);
      client.subscribe('$SYS/+/new/clients', (err) => {
        if (err) console.error(`PUD:: ==> subscribe error`);
      });
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

  console.error(`PUD:: ==> register`);
  const rpc = new RPC(client);
  // Prepare server function
  rpc.register('eko/verify/token', async (password) => {
    console.error(`PUD:: ==> rpc is executed`, password);
    await new Promise((resolve) => {
      setTimeout(resolve, 1000);
    });
    if (password == 'token') {
      return { _id: 11111, firstname: 'pud' };
    } else {
      throw new jsonrpc.JsonRpcError('no permission');
    }
  });

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
      setTimeout(resolve, 5000);
    });
  }
}

run()
  .catch(error => {
    console.error(`PUD:: ==> error run`, error);
  });
