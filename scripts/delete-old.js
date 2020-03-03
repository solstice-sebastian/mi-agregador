require('dotenv').config();
const argv = require('minimist')(process.argv.slice(2));
const { readFileSync } = require('fs');
const MongoClient = require('mongodb');
const { tunnel } = require('../modules/tunnel');
const { msToHumanTime } = require('@solstice.sebastian/helpers');

const {
  MONGO_URL,
  PRODUCTION_MONGO_URL,
  DB_NAME,
  SSH_USERNAME,
  SSH_KEY_PATH,
  SSH_HOST,
} = process.env;

const LOCAL_URL = `${MONGO_URL}/mi_agregador`;

const LATEST_DATE = '2020-02-28';
const LATEST_TIMESTAMP = new Date(LATEST_DATE).getTime();

const getConnectionUrl = () => {
  return argv.tunnel ? PRODUCTION_MONGO_URL : LOCAL_URL;
};

const getDb = async () => {
  const mongoUrl = getConnectionUrl();
  const client = await MongoClient.connect(mongoUrl, { useNewUrlParser: true });
  console.log(`successfully connected to ${mongoUrl}`);
  return client.db(DB_NAME);
};

const deleteOld = async (collName, db) => {
  const startTime = Date.now();
  const coll = await db.collection(collName);
  const result = await coll.deleteMany({ localTimestamp: { $lt: LATEST_TIMESTAMP } });
  console.log(
    `deleted ${result.deletedCount} ${collName} documents in ${msToHumanTime(
      Date.now() - startTime
    )}`
  );
};

const run = async () => {
  const db = await getDb();
  let collNames;
  if (argv.collections) {
    collNames = argv.collection.split(',');
  } else if (argv.collection) {
    collNames = [argv.collection];
  } else {
    const collList = await db.listCollections().toArray();
    collNames = collList.map((c) => c.name);
  }
  const errored = [];
  console.log(`deleting ${collNames.length} collections from ${DB_NAME}`);
  for (const collName of collNames) {
    try {
      await deleteOld(collName, db);
    } catch (err) {
      errored.push(collName);
      console.log(`error deleting ${collName}... :(`, err);
    }
  }
  console.log(`successfully deleted ${collNames.length - errored.length} collections`);
  console.log(`errored collections => [${errored.join(', ')}]`);
  process.exit(1);
};

if (argv.tunnel) {
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
