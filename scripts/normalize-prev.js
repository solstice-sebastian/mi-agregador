require('dotenv').config();
const { readFileSync } = require('fs');
const MongoClient = require('mongodb');
const { uniqBy } = require('lodash');
const { normalizeRecord } = require('../modules/normalize-record');
const { tunnel } = require('../modules/tunnel');

const { PRODUCTION_MONGO_URL, DB_NAME, SSH_USERNAME, SSH_KEY_PATH, SSH_HOST } = process.env;

const getDb = async () => {
  const client = await MongoClient.connect(
    PRODUCTION_MONGO_URL,
    { useNewUrlParser: true }
  );
  return client.db(DB_NAME);
};

const indexCollection = async (symbol, db) => {
  return db
    .collection(symbol)
    .createIndex({ localTimestamp: -1, localDatetime: 'text' })
    .then(() => console.log(`successfully indexed ${symbol}`))
    .catch((err) => {
      console.log(`error indexing ${symbol}`);
      console.log(err);
    });
};

const TIME_LIMIT = new Date('2019-03-31 12:40:00').getTime();

const run = async () => {
  const db = await getDb();
  const collList = await db.listCollections().toArray();
  const collNames = collList.map((c) => c.name);

  const _run = async (index = 0) => {
    if (index === collNames.length) {
      console.log('completed updating of previous');
      process.exit(0);
    }
    const symbol = collNames[index];
    const currentDocs = await db
      .collection(symbol)
      .find({ localTimestamp: { $gt: TIME_LIMIT } })
      .toArray();
    const normalized = currentDocs.map(normalizeRecord);
    const updatePromises = uniqBy(normalized, 'localTimestamp').map((normalizedRecord) =>
      db
        .collection(symbol)
        .replaceOne({ _id: normalizedRecord._id }, normalizedRecord)
        .catch(() =>
          console.log(
            `error updating previous docs for ${symbol} ${normalizedRecord.localDatetime}`
          )
        )
    );

    Promise.all(updatePromises).then(() => {
      console.log(`successfully updated prev for ${symbol}`);
      indexCollection(symbol, db).then(() => {
        _run(index + 1);
      });
    });
  };
  _run(0);
};

tunnel({
  username: SSH_USERNAME,
  privateKey: readFileSync(SSH_KEY_PATH, 'utf8'),
  host: SSH_HOST,
}).then(() => {
  run();
});
