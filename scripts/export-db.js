require('dotenv').config();
const argv = require('minimist')(process.argv.slice(2));
const { writeFileSync, readFileSync } = require('fs');
const MongoClient = require('mongodb');
const { tunnel } = require('../modules/tunnel');
const { resolve } = require('path');

const {
  MONGO_URL,
  PRODUCTION_MONGO_URL,
  DB_NAME,
  SSH_USERNAME,
  SSH_KEY_PATH,
  SSH_HOST,
} = process.env;

const dataDir = resolve(__dirname, '..', 'data');

const getDb = async () => {
  const mongoUrl = argv.tunnel ? PRODUCTION_MONGO_URL : MONGO_URL;
  const client = await MongoClient.connect(
    mongoUrl,
    { useNewUrlParser: true }
  );
  console.log(`successfully connected to ${mongoUrl}`);
  return client.db(DB_NAME);
};

const exportJson = async (collName, db) => {
  console.log(`${collName}: fetching data...`);
  const data = await db
    .collection(collName)
    .find({ localTimestamp: { $gt: 1553985900517 } })
    .sort({ localTimestamp: 1 })
    .toArray();

  const outputFile = `${dataDir}/${collName}.json`;
  writeFileSync(outputFile, JSON.stringify(data), 'utf8');
  console.log(`${collName}: exported ${data.length} docs successfully`);
};

const run = async () => {
  const db = await getDb();
  const collList = await db.listCollections().toArray();
  const collNames = collList.map((c) => c.name);
  const errored = [];
  console.log(`exporting ${collList.length} collections from ${DB_NAME}`);
  for (const collName of collNames) {
    try {
      await exportJson(collName, db);
    } catch (err) {
      errored.push(collName);
      console.log(`error exporting ${collName}... :(`);
    }
  }
  console.log(`successfully exported ${collList.length - errored.length} collections`);
  console.log(`errored collections => [${errored.join(', ')}]`);
  process.exit(1);
};

tunnel({
  username: SSH_USERNAME,
  privateKey: readFileSync(SSH_KEY_PATH, 'utf8'),
  host: SSH_HOST,
}).then(() => {
  run();
});
