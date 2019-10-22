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
  id: 'My-First-MQTT',
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
  // maxInflightMessages: 10
});

let mqttClient, rpc;
const authenticate = async (client, username, password, callback) => {
  // console.error(`PUD:: ==> client`, client.connection.stream.authorized);
  console.error(`MQTT:: ==> authen client id`, client.id);
  if (client.connection.stream instanceof tls.TLSSocket) {
    client.__type = 'server';
    return callback(null, client.connection.stream.authorized);
  }

  client.__type = 'client';
  password = Buffer.from(password).toString();
  try {
    const result = await rpc.call(`${username}/verify/token`, password, username);
    console.error(`MQTT:: ==> authentication success`, result);

    client.id = `change_client_id_${(new Date()).getTime()}`;
    callback(null, true);
  } catch (error) {
    console.error(`MQTT:: ==> authentication failed`, error);
    client.close(null, error.message);

    callback(null, false);
  }
}

// const ALLOW_CONNECTED_TIME = 60 * 60 * 1000;
const ALLOW_CONNECTED_TIME = 10 * 1000;
let timer;
const setUpTimer = () => {
  if (timer) clearTimeout(timer);

  timer = setTimeout(() => {
    const now = (new Date()).getTime();
    for (let c in server.clients) {
      const client = server.clients[c];
      if ((client.__type != 'server')) {
        if ((now - client.__connectedAt) > ALLOW_CONNECTED_TIME) {
          console.error(`PUD:: ==>  connected too long`, client.id, now, client.__connectedAt);
          client.close(null, 'connected too long');
        }
      }
    }

    setUpTimer();
  }, 5 * 1000);
}

server
  .on('ready', () => {
    mqttClient = mqtt.connect('mqtts://localhost', {
      key: fs.readFileSync('./cert/key1.pem'),
      cert: fs.readFileSync('./cert/cert1.pem'),
      rejectUnauthorized: false,
      clean: true
    });
    mqttClient.on('connect', () => {
      console.error(`PUD:: ==> rpc client connected`);
      rpc = new RPC(mqttClient, { timeout: 5000 });
    }).on('message', (t, m) => {
      // console.error(`PUD:: ==> rpc client message`, t, m);
    }).on('error', (error) => {
      console.error(`PUD:: ==> mqtt client error`, error);
    });

    server.authenticate = authenticate;

    setUpTimer();
    console.error(`MQTT Server:: ==> ready`);
  })
  .on('error', (error) => {
    console.error(`MQTT:: ==> error`, error);
  })
  .on('clientError', (err, client) => {
    console.error(`MQTT:: ==> client has error (${client.id})`, err);
  })
  .on('clientConnected', (client) => {
    client.__connectedAt = (new Date()).getTime();
    console.error(`MQTT:: ==> client is connected`, client.id);
  })
  .on('clientDisconnected', (client, reason) => {
    console.error(`MQTT:: ==> client is disconnected`, client.id);
    switch(reason) {
      case 'too many inflight packets':
        server.persistence.deleteOfflinePacket(client, /.+/, (err, result) => {
          console.error(`PUD:: ==> deleteOfflinePacket`, result.n);
        });
        break;
      case 'new connection request':

        break;
    }
  });
