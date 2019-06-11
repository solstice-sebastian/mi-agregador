require('dotenv').config();
const argv = require('minimist')(process.argv.slice(2));
const { readFileSync } = require('fs');
const MongoClient = require('mongodb');
const { tunnel } = require('../modules/tunnel');

const {
  PRODUCTION_MONGO_URL,
  MONGO_URL,
  DB_NAME,
  SSH_USERNAME,
  SSH_KEY_PATH,
  SSH_HOST,
} = process.env;

const getDb = async () => {
  const mongoUrl = argv.tunnel ? PRODUCTION_MONGO_URL : MONGO_URL;
  const client = await MongoClient.connect(
    mongoUrl,
    { useNewUrlParser: true }
  );
  return client.db(DB_NAME);
};

const indexCollection = async (collName, db) => {
  console.log(`${collName}: indexing...`);
  return db
    .collection(collName)
    .createIndex({ localTimestamp: -1 }, { unique: true, dropDups: true })
    .catch((err) => {
      console.log(`error indexing ${collName}`);
      console.log(err);
    });
};

const dedup = (collName, db) => {
  console.log(`${collName}: dedupping...`);
  return db
    .collection(collName)
    .aggregate([
      {
        $group: {
          _id: { localTimestamp: '$localTimestamp' },
          dups: { $addToSet: '$_id' },
          count: { $sum: 1 },
        },
      },
      { $match: { count: { $gt: 1 } } },
    ])
    .forEach((doc) => {
      doc.dups.shift();
      db.collection(collName).deleteMany({ _id: { $in: doc.dups } });
    });
};

const dropIndexes = async (collName, db) => {
  const coll = await db.collection(collName);
  const indexes = await coll.listIndexes().toArray();
  const indexesToDrop = indexes.filter((index) => index.name.includes('localTimestamp'));
  if (indexesToDrop.length) {
    for (const index of indexesToDrop) {
      console.log(`${collName}: dropping index ${index.name}`);
      await db.collection(collName).dropIndex(index.name);
    }
  } else {
    console.log(`${collName}: no index found...`);
  }
};

const run = async () => {
  const errored = [];
  const db = await getDb();
  const collList = await db.listCollections().toArray();
  const collNames = collList.map((c) => c.name);
  for (const collName of collNames) {
    try {
      await dedup(collName, db);
      console.log(`${collName}: successfully dedupped`);
      await dropIndexes(collName, db);
      console.log(`${collName}: successfully dropped indexes`);
      await indexCollection(collName, db);
      console.log(`${collName}: successfully indexed`);
    } catch (err) {
      errored.push(collName);
      console.log(`${collName}: Error!`, err);
    }
  }
  if (errored.length) {
    console.log(`errored: [${errored.join(', ')}]`);
  }
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
