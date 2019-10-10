const stream = require('stream');
const fs = require('fs');
const crypto = require('crypto');
const pipeline = stream.pipeline;

function* gen () {
  // const r = fs.createReadStream('/tmp/x');
  const r = fs.createReadStream('/tmp/pud.txt');
  const w = fs.createWriteStream('/tmp/y');
  const en = crypto.createCipher('aes192', 'aaaa');
  const pl = pipeline(
    r,
    // en,
    w,
    (err) => {
      if (err) w.emit('error', err);
    }
  );

  yield pl;
}

function run() {
  return new Promise((resolve, reject) => {
    const g = gen();
    const s = g.next();

    s.value
    .on('error', (err) => {
      return reject(err);
    })
    .on('finish', () => {
      return resolve('finished');
    });
  });
}

(async () => {
  try {
    const result = await run();
    console.error(`PUD:: ==> `, result);
  } catch (err)
  {
    console.log('ERROR', err)
  }
}
)()

