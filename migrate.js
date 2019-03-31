require('dotenv').config();
const MongoClient = require('mongodb');
const { readFile, readdirSync, unlink, appendFile, writeFileSync, existsSync } = require('fs');
const { join } = require('path');
const { toObject } = require('csvjson');
const { msToDatetime } = require('@solstice.sebastian/helpers');
const { normalizeRecord } = require('./modules/normalize-record');

const { MONGO_URL, DB_NAME, STORAGE_PATH } = process.env;

const logFilePath = join(__dirname, `./migration${msToDatetime(Date.now())}.log`);
if (existsSync(logFilePath) === false) {
  writeFileSync(logFilePath);
}

const log = (message) => {
  console.log(message);
  appendFile(logFilePath, message, (err) => {
    if (err) {
      console.log(`error appending to logfile`, err);
    }
  });
};

const getDb = async () => {
  const client = await MongoClient.connect(
    MONGO_URL,
    { useNewUrlParser: true }
  );
  return client.db(DB_NAME);
};

const indexCollection = (symbol, db) => {
  db.collection(symbol)
    .createIndex({ localTimestamp: -1, localDatetime: -1 })
    .then(() => log(`successfully indexed ${symbol}`))
    .catch((err) => {
      log(`error indexing ${symbol}`);
      log(err);
    });
};

const updateCurrentDocs = async (symbol, db) => {
  const currentDocs = await db
    .collection(symbol)
    .find({})
    .toArray();
  const normalized = currentDocs.map(normalizeRecord);
  await db.collection(symbol).drop();
  db.collection(symbol).insertMany(normalized);
};

const migrate = async (filePath, symbol, db, onSuccess, onError) => {
  const currentDocs = await db.collection(symbol).countDocuments();
  if (currentDocs > 0) {
    await updateCurrentDocs(symbol, db);
  }
  readFile(filePath, { encoding: 'utf8' }, (err, csvData) => {
    const headers = 'price,volume,btcVolume,lowTrade,highTrade,localTimestamp,datetime';
    const tickerRecords = toObject(csvData, { headers });
    if (tickerRecords[0].price === 'price') {
      tickerRecords.shift();
    }
    if (err) {
      return onError(symbol, `readFile`, err);
    }

    const normalized = tickerRecords.map(normalizeRecord);
    return db
      .collection(symbol)
      .insertMany(normalized)
      .then(() => {
        onSuccess(symbol, filePath);
        indexCollection(symbol, db);
      })
      .catch(() => onError(symbol, 'insertMany'));
  });
};

const removeFile = (filePath) => {
  unlink(filePath, (err) => {
    if (err) {
      log(`error removing file @ ${filePath}`);
    } else {
      log(`successfully removed file @ ${filePath}`);
    }
  });
};

const run = async () => {
  const db = await getDb();
  const filenames = readdirSync(STORAGE_PATH);
  let insertedCount = 0;

  const onSuccess = (symbol, filePath) => {
    insertedCount += 1;
    log(`successfully migrated ${symbol}`);
    removeFile(filePath);
    if (insertedCount === filenames.length) {
      log([``, ``, `====================================`, ``, ``].join('\n'));
      log(`successfully migrated ${insertedCount} symbols`);
      process.exit(0);
    }
  };

  const onError = (symbol, location, err) => {
    log(`error migrating ${symbol} @ ${location}: `);
    log(err);
  };

  filenames.forEach((filename) => {
    const symbol = filename.replace('.csv', '').replace('_', '');
    const filePath = join(STORAGE_PATH, filename);
    migrate(filePath, symbol, db, onSuccess, onError);
  });
};

run();
