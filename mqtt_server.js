'use strict';

const tls = require('tls');
const fs = require('fs');
const mqtt = require('mqtt');
const RPC = require('mqtt-json-rpc');

const mosca = require('mosca');
const ascoltatore = {
  type: 'redis',
  host: 'localhost',
  port: 6379,
  db: 10
};

const server = new mosca.Server({
  id: 'MQTT_01',
  backend: ascoltatore,
  persistence: {
    factory: mosca.persistence.Mongo,
    url: 'mongodb://localhost:27017/mqtt',
    ttl: {
      subscriptions: 7 * 24 * 60 * 60 * 1000, // 7 days
      packets: 5 * 60 * 1000, // 5 mins
    },
    mongo: {
      autoReconnect: true,
      keepAlive: true,
      connectTimeoutMS: 30000
    }
  },
  interfaces: [
    {
      type: 'http',
      port: 8080
    },
    {
      type: 'mqtt',
      port: 1883
    },
    {
      type: 'mqtts',
      port: 8883,
      credentials: {
        requestCert: true,
        rejectUnauthorized: true,
        keyPath: './cert/key.pem',
        certPath: './cert/cert.pem',
        caPaths: [
          './cert/cert1.pem'
        ]
      }
    }
  ],
  logger: {
    level: 'warn'
  },
  maxInflightMessages: 1024
});

let rpcReady
const ready = new Promise((resolve, reject) => {
  server
    .on('ready', () =>{
      return resolve(server);
    })
    .on('error', (error) => {
      return reject(error);
    });
});

const authenticate = async (client, username, password, callback) => {
  // Check client id whether it is already connected to this server
  if (server.clients[client.id]) return callback(null, false);

  if (client.connection.stream instanceof tls.TLSSocket) {
    console.info(`MQTT Server:: ==> server [${client.id}] is connecting`);
    if (client.connection.stream.authorized) {
      // Bypass authentication because certification is correct
      client.__type = 'server';
      return callback(null, true);
    } else {
      return callback(null, false);
    }
  }

  // Wait until rpc is ready
  if (!rpcReady) return callback(null, false);
  const rpc = await rpcReady;

  password = Buffer.from(password).toString();
  client.__type = 'client';
  console.info(`MQTT Server:: ==> client [${client.id}] is connecting`);
  rpc.call(`${username}/verify/token`, password)
    .then(result => {
      console.error(`PUD:: ==> rpc ok`, result);
      return callback(null, true);
    })
    .catch(error => {
      console.error(`PUD:: ==> rpc error`, error);
      return callback(null, false);
    });
};

const MQTT_URI = 'mqtts://localhost';
async function run () {
  await ready;
  console.info(`PUD:: ==> MQTT Server is ready`);

  // Attached mqtt authentication
  server.authenticate = authenticate;

  rpcReady = new Promise((resolve, reject) => {
    // Create MQTT RPC
    const mqttClient = mqtt.connect(MQTT_URI, {
      key: fs.readFileSync('./cert/key1.pem'),
      cert: fs.readFileSync('./cert/cert1.pem'),
      rejectUnauthorized: false,
      clean: true
    }).on('connect', () => {
      const rpc = new RPC(mqttClient, { timeout: 5000 });
      console.info(`PUD:: ==> RPC is ready`);
      return resolve(rpc);
    }).on('error', (error) => {
      console.error(`PUD:: ==> mqtt client error`, error);
      return reject(error);
    });
  });
}

run()
  .catch(error => {
    console.error(`PUD:: ==> error`, error);
    process.exit(1);
  });

