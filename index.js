'use strict';

const mosca = require('mosca');
const ascoltatore = {
  type: 'redis',
  host: 'localhost',
  port: 6379,
  db: 10
};

const server = new mosca.Server({
  id: 'My-First-MQTT',
  port: Number(process.env.PORT) || 1883,
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
  logger: {
    level: 'warn'
  },
  // maxInflightMessages: 10
});

const authenticate = (client, username, password, callback) => {
  callback(null, true);
}

server
  .on('ready', () => {
    server.authenticate = authenticate;
    console.error(`MQTT:: ==> ready`);
  })
  .on('clientError', (err, client) => {
    console.error(`MQTT:: ==> client has error (${client.id})`, err);
  })
  .on('clientConnected', (client) => {
    console.error(`MQTT:: ==> client is connected`, client.id);
  })
  .on('clientDisconnected', (client, reason) => {
    console.error(`MQTT:: ==> client is disconnected`, client.id, reason);
    if (reason == 'too many inflight packets') {
      server.persistence.deleteOfflinePacket(client, /.+/, (err, result) => {
        console.error(`PUD:: ==> deleteOfflinePacket`, result.n);
      });
    }
  });