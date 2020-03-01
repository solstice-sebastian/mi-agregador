require('dotenv').config();
const { spawn } = require('child_process');
const argv = require('minimist')(process.argv.slice(2));
const { readFileSync, createWriteStream } = require('fs');
const MongoClient = require('mongodb');
const { tunnel } = require('../modules/tunnel');
const { resolve, join } = require('path');
const { msToHumanTime, datetime } = require('@solstice.sebastian/helpers');

const {
  MONGO_URL,
  PRODUCTION_MONGO_URL,
  DB_NAME,
  SSH_USERNAME,
  SSH_KEY_PATH,
  SSH_HOST,
} = process.env;

const LOCAL_URL = `${MONGO_URL}/mi_agregador`;

const dataDir = resolve(__dirname, '..', 'data', 'dumps');

const getConnectionUrl = () => {
  return argv.tunnel ? PRODUCTION_MONGO_URL : LOCAL_URL;
};

const getDb = async () => {
  const mongoUrl = getConnectionUrl();
  const client = await MongoClient.connect(
    mongoUrl,
    { useNewUrlParser: true }
  );
  console.log(`successfully connected to ${mongoUrl}`);
  return client.db(DB_NAME);
};

const dumpToArchive = async (collName) => {
  const startTime = Date.now();
  const promise = new Promise((res) => {
    const filePath = join(dataDir, `${collName}.gz`);
    const cmd = '/usr/local/bin/mongodump';
    const args = [
      `--archive=${filePath}`,
      '--uri',
      getConnectionUrl(),
      '--collection',
      collName,
      '--gzip',
    ];
    const mongodump = spawn(cmd, args);
    mongodump.stdout.pipe(createWriteStream(filePath));
    mongodump.stdout.on('end', () => {
      const now = Date.now();
      const diff = now - startTime;
      console.log(`completed write to ${filePath} in ${msToHumanTime(diff)}`);
      res();
    });
  });
  return promise;
};

const printStats = async (collName, db) => {
  const coll = await db.collection(collName);
  const count = await coll.countDocuments();
  console.log(`dumping ${count} documents for ${collName}`);
  const [newest] = await coll
    .find()
    .sort({ localTimestamp: -1 })
    .limit(1)
    .toArray();
  const [oldest] = await coll
    .find()
    .sort({ localTimestamp: 1 })
    .limit(1)
    .toArray();
  console.log(`from ${oldest.localDatetime} to ${newest.localDatetime}`);
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
  console.log(`dumping ${collNames.length} collections from ${DB_NAME}`);
  for (const collName of collNames) {
    try {
      await printStats(collName, db);
      await dumpToArchive(collName);
    } catch (err) {
      errored.push(collName);
      console.log(`error dumping ${collName}... :(`, err);
    }
  }
  console.log(`successfully mongodump'd ${collNames.length - errored.length} collections`);
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
