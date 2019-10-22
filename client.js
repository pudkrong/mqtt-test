'use strict';

const CUSTOMER = 'EKO  ABC';
const CUSTOMER_NORMALIZED = CUSTOMER.replace(/\s+/g, '_').toLowerCase();
const TOPIC = 'eko/mqtt/ios';
const MQTT_URI = 'ws://localhost:8080';

const mqtt = require('mqtt');
const RPC = require('mqtt-json-rpc');
const jsonrpc = require('jsonrpc-lite');
const fs = require('fs');
const faker = require('faker');

const ready = new Promise((resolve, reject) => {
  const mqttClient = mqtt.connect(MQTT_URI, {
    clientId: `subscriber${process.env.SUBSCRIBE || 1}`,
    username: CUSTOMER_NORMALIZED,
    password: 'token',
    clean: true
  }).on('connect', () => {
    return resolve(mqttClient);
  }).on('error', (error) => {
    return reject(error);
  }).on('close', () => {
    console.info(`mqtt client is closed`);
  }).on('message', (topic, message) => {
    console.error(`topic: ${topic}, message: ${message}`);
  });
});

async function run () {
  const mqttClient = await ready;
  console.info(`PUD:: ==> mqtt client [${CUSTOMER_NORMALIZED}] is connected`);

  mqttClient.subscribe(TOPIC, {
    qos: 1
  }, (error, granted) => {
    if (error) console.error(`PUD:: ==> subscribe error`, error);

    granted.forEach((grant) => {
      console.error(`subscibed to ${grant.topic} with qos ${grant.qos}`);
    });
  });
}

run()
  .catch(error => {
    console.error(`PUD:: ==> run error`, error);
    process.exit(1);
  });
