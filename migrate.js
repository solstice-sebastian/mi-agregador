require('dotenv').config();
const MongoClient = require('mongodb');
const { readFile, readdirSync } = require('fs');
const { join } = require('path');
const { toObject } = require('csvjson');
const { withRoundedTimestamps } = require('./modules/with-rounded-timestamps');

const { MONGO_URL, DB_NAME, STORAGE_PATH } = process.env;

const getDb = async () => {
  const client = await MongoClient.connect(
    MONGO_URL,
    { useNewUrlParser: true }
  );
  return client.db(DB_NAME);
};

const migrate = async (filePath, symbol, db, success, errorCb) => {
  const currentDocs = await db.collection(symbol).countDocuments();
  if (currentDocs > 0) {
    await db.collection(symbol).drop();
  }
  readFile(filePath, { encoding: 'utf8' }, (err, csvData) => {
    const headers = 'price,volume,btcVolume,lowTrade,highTrade,localTimestamp,datetime';
    const tickerRecords = toObject(csvData, { headers });
    if (tickerRecords[0].price === 'price') {
      tickerRecords.shift();
    }
    const normalized = withRoundedTimestamps(tickerRecords);
    db.collection(symbol)
      .insertMany(normalized)
      .then(success)
      .catch(() => errorCb(symbol));
  });
};

const run = async () => {
  const db = await getDb();
  const filenames = readdirSync(STORAGE_PATH);
  let insertedCount = 0;
  const success = () => {
    insertedCount += 1;
    if (insertedCount === filenames.length) {
      console.log(`successfully migrated ${insertedCount} symbols`);
      process.exit(0);
    }
  };
  const errorCb = (symbol) => {
    console.log(`error migrating ${symbol}`);
  };
  filenames.forEach((filename) => {
    const symbol = filename.replace('.csv', '').replace('_', '');
    const filePath = join(STORAGE_PATH, filename);
    migrate(filePath, symbol, db, success, errorCb);
  });
};

run();
