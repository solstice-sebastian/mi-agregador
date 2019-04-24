/* eslint-disable consistent-return */
require('dotenv').config();
const argv = require('minimist')(process.argv.slice(2));
const { readFileSync } = require('fs');
const MongoClient = require('mongodb');
const { msToHumanTime } = require('@solstice.sebastian/helpers');
const { tunnel } = require('../modules/tunnel');

const {
  MONGO_URL,
  PRODUCTION_MONGO_URL,
  DB_NAME,
  SSH_USERNAME,
  SSH_KEY_PATH,
  SSH_HOST,
} = process.env;

const isTunneling = Object.keys(argv).includes('tunnel');

const getDb = async () => {
  const mongoUrl = isTunneling ? PRODUCTION_MONGO_URL : MONGO_URL;
  const client = await MongoClient.connect(
    mongoUrl,
    { useNewUrlParser: true }
  );
  return client.db(DB_NAME);
};

const run = async () => {
  const db = await getDb();
  const collections = await db.listCollections().toArray();
  const symbols = collections.map((coll) => coll.name);

  const _run = async (index) => {
    if (index === symbols.length) {
      console.log('completed successfully');
      process.exit(1);
    }

    const symbol = symbols[index];
    const collection = await db.collection(symbol);
    const indexResult = await collection.ensureIndex({ localTimestamp: -1 });
    if (indexResult) {
      console.log(`indexed ${symbol} with ${indexResult}`);
    }
    const docs = await collection
      .find({})
      .sort({ localTimestamp: -1 })
      .toArray();
    let largestDiff = 0;
    for (let i = 0; i < docs.length - 1; i += 1) {
      const first = docs[i];
      const second = docs[i + 1];
      if (first.localTimestamp - second.localTimestamp) {
        largestDiff = first.localTimestamp - second.localTimestamp;
      }
    }
    console.log(`largestDiff for ${symbol} = ${largestDiff} => ${msToHumanTime(largestDiff)}`);
    _run(index + 1);
  };
  _run(0);
};

if (isTunneling) {
  tunnel({
    username: SSH_USERNAME,
    privateKey: readFileSync(SSH_KEY_PATH, 'utf8'),
    host: SSH_HOST,
  }).then(() => {
    run();
  });
} else {
  run();
}

module.exports = { dropInvalid: run };
