'use strict';

const CUSTOMER = 'EKO  ABC';
const CUSTOMER_NORMALIZED = CUSTOMER.replace(/\s+/g, '_').toLowerCase();
const TOPIC = 'eko/mqtt/ios';
// const MQTT_URI = 'mqtt://test.mosquitto.org';
const MQTT_URI = 'mqtt://localhost';
// const MQTT_URI = 'ws://localhost:8080';

const util = require('util');
const mqtt = require('mqtt');
const RPC = require('mqtt-json-rpc');
const jsonrpc = require('jsonrpc-lite');
const fs = require('fs');
const faker = require('faker');
const Leader = require('redis-leader');
const ioredis = require('ioredis');

const ready = new Promise((resolve, reject) => {
  const mqttClient = mqtt.connect(MQTT_URI, {
    key: fs.readFileSync('./cert/key1.pem'),
    cert: fs.readFileSync('./cert/cert1.pem'),
    rejectUnauthorized: false,
    clean: true
  }).on('connect', () => {
    return resolve(mqttClient);
  }).on('error', (error) => {
    return reject(error);
  }).on('close', () => {
    console.info(`mqtt client is closed`);
  });
});

async function run () {
  const mqttClient = await ready;
  console.info(`PUD:: ==> mqtt client is ready`);

  // Setup election
  const redis = new ioredis.Cluster([
    { host: 'localhost', port: 17000 },
    { host: 'localhost', port: 17001 },
    { host: 'localhost', port: 17002 },
    { host: 'localhost', port: 17004 },
    { host: 'localhost', port: 17005 },
  ]);
  const leader = new Leader(redis, {
    key: CUSTOMER,
    ttl: 5000
  });
  leader
    .on('elected', () => {
      console.info(`PUD:: ==> I am a leader`);
    })
    .elect();
  leader.isLeaderAsync = util.promisify(leader.isLeader.bind(leader));
  // END::Setup election

  const rpc = new RPC(mqttClient, { timeout: 5000 });
  rpc.register(`${CUSTOMER_NORMALIZED}/verify/token`, async (password) => {
    const isLeader = await leader.isLeaderAsync().catch(err => false);
    if (!isLeader) return;

    console.info(`PUD:: ==> rpc is being called`);
    if (password == 'token') {
      return { _id: 11111, firstname: 'pud' };
    } else {
      throw new jsonrpc.JsonRpcError('no permission');
    }
  });

  // Publishing data
  let number = 1;
  while (!true) {
    const msg = `message ${number++}`;
    console.info(`PUD:: ==> publishing`, msg);
    mqttClient.publish(TOPIC, msg, {
      qos: 1,
      retain: false
    });

    await new Promise(r => { setTimeout(r, 3000); });
  }
}

run()
  .catch(error => {
    console.error(`PUD:: ==> run error`, error);
    process.exit(1);
  });

