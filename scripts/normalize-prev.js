require('dotenv').config();
const argv = require('minimist')(process.argv.slice(2));
const { readFileSync } = require('fs');
const MongoClient = require('mongodb');
const { uniqBy } = require('lodash');
const { normalizeRecord } = require('../modules/normalize-record');
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
    const collection = await db.collection(symbol);
    const totalCount = await collection.countDocuments();
    const currentDocs = await collection
      .find({
        $or: [
          { price: { $type: 16 } },
          { btcVolume: { $type: 16 } },
          { volume: { $type: 16 } },
          { lowTrade: { $type: 16 } },
          { highTrade: { $type: 16 } },
        ],
      })
      .toArray();
    console.log(`${symbol}: found ${currentDocs.length} out of ${totalCount} docs with bad types`);
    const normalized = currentDocs.map(normalizeRecord);
    const updatePromises = uniqBy(normalized, 'localTimestamp').map((normalizedRecord) =>
      db
        .collection(symbol)
        .replaceOne({ _id: normalizedRecord._id }, normalizedRecord)
        .catch(() =>
          console.log(`${symbol}: error updating previous docs ${normalizedRecord.localDatetime}`)
        )
    );

    Promise.all(updatePromises).then(() => {
      console.log(`${symbol}: successfully updated ${updatePromises.length} docs`);
      _run(index + 1);
    });
  };
  _run(0);
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
