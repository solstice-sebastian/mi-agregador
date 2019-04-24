/* eslint-disable consistent-return */
require('dotenv').config();
const argv = require('minimist')(process.argv.slice(2));
const { readFileSync } = require('fs');
const MongoClient = require('mongodb');
const { tunnel } = require('../modules/tunnel');

const {
  MONGO_URL,
  PRODUCTION_MONGO_URL,
  DB_NAME,
  SSH_USERNAME,
  SSH_KEY_PATH,
  SSH_HOST,
} = process.env;

const isTunneling = argv.tunnel;

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

  const deleteInvalid = async (index) => {
    if (index === collections.length) {
      process.exit(1);
    }
    const symbol = collections[index].name;
    try {
      const result = await db.collection(symbol).deleteMany({ localDatetime: 'Invalid date' });
      if (result.result.ok) {
        console.log(`successfully deleted ${result.deletedCount} documents from ${symbol}`);
      }
    } catch (err) {
      console.log(`error cleaning up from ${symbol} with err: `, err);
      throw err;
    }
    try {
      const result2 = await db.collection(symbol).ensureIndex({ localTimestamp: -1 });
      if (result2) {
        console.log(`successfully indexed ${symbol}`);
      }
    } catch (err) {
      console.log(`error indexing ${symbol} with err: `, err);
      throw err;
    }
    setTimeout(() => {
      deleteInvalid(index + 1);
    }, 5000);
  };
  deleteInvalid(0);
};
if (isTunneling) {
  console.log('tunneling into production...');
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

module.exports = { deleteInvalid: run };
