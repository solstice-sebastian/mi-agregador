require('dotenv').config();
const { readFileSync } = require('fs');
const MongoClient = require('mongodb');
const { tunnel } = require('../modules/tunnel');

const { PRODUCTION_MONGO_URL, DB_NAME, SSH_USERNAME, SSH_KEY_PATH, SSH_HOST } = process.env;

const getDb = async () => {
  const client = await MongoClient.connect(
    PRODUCTION_MONGO_URL,
    { useNewUrlParser: true }
  );
  return client.db(DB_NAME);
};

const indexCollection = async (collName, db) => {
  return db
    .collection(collName)
    .createIndex({ localTimestamp: -1, localDatetime: 'text' }, { unique: true })
    .then(() => console.log(`successfully indexed ${collName}`))
    .catch((err) => {
      console.log(`error indexing ${collName}`);
      console.log(err);
    });
};

const dedup = (collName, db) => {
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
      db.events.remove({ _id: { $in: doc.dups } });
    });
};

const run = async () => {
  const db = await getDb();
  const collList = await db.listCollections().toArray();
  const collNames = collList.map((c) => c.name);
  for (const collName of collNames) {
    await dedup(collName, db);
    // await db.collection(collName).dropIndexes();
    // await indexCollection(collName, db);
  }
};

tunnel({
  username: SSH_USERNAME,
  privateKey: readFileSync(SSH_KEY_PATH, 'utf8'),
  host: SSH_HOST,
}).then(() => {
  run();
});
