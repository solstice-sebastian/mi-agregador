/* eslint-disable consistent-return */
require('dotenv').config();
const MongoClient = require('mongodb');
const {
  createReadStream,
  readdirSync,
  unlink,
  appendFile,
  writeFileSync,
  existsSync,
} = require('fs');
const { join } = require('path');
const csv = require('csv-parser');
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
  appendFile(logFilePath, `${message}\n`, (err) => {
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
  db.collection(symbol)
    .insertMany(normalized)
    .then(() => log(`successfully updated previous docs for ${symbol}`))
    .catch(() => log(`error updating previous docs for ${symbol}`));
};

const migrate = async (filePath, symbol, db, onSuccess, onError) => {
  const currentDocs = await db.collection(symbol).countDocuments();
  if (currentDocs > 0) {
    await updateCurrentDocs(symbol, db);
  }
  const tickerRecords = [];
  const headers = 'price,volume,btcVolume,lowTrade,highTrade,localTimestamp,datetime'.split(',');
  createReadStream(filePath)
    .pipe(csv({ headers }))
    .on('data', (chunk) => tickerRecords.push(chunk))
    .on('error', (err) => {
      log(`error reading csv tickers for ${symbol}`);
      log(err);
    })
    .on('end', () => {
      console.log(`finished reading csv tickers for ${symbol}`);
      // const tickerRecords = toObject(data, { headers });
      if (tickerRecords[0].price === 'price') {
        tickerRecords.shift();
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

const runMigration = async () => {
  const db = await getDb();
  const filenames = readdirSync(STORAGE_PATH);
  return new Promise((res) => {
    if (filenames.length === 0) {
      log(`no files to migrate`);
      return res();
    }

    let insertedCount = 0;
    const onSuccess = (symbol, filePath) => {
      insertedCount += 1;
      log(`successfully migrated ${symbol}`);
      removeFile(filePath);
      if (insertedCount === filenames.length) {
        log([``, ``, `====================================`, ``, ``].join('\n'));
        log(`successfully migrated ${insertedCount} symbols`);
        res();
      }
    };

    const onError = (symbol, location, err) => {
      log(`error migrating ${symbol} @ ${location}: `);
      log(err);
    };

    const run = (index) => {
      if (index < filenames.length) {
        const filename = filenames[index];
        const symbol = filename.replace('.csv', '').replace('_', '');
        const filePath = join(STORAGE_PATH, filename);
        migrate(
          filePath,
          symbol,
          db,
          () => {
            onSuccess(symbol, filePath);
            run(index + 1);
          },
          onError
        );
      }
    };
    run(0);
  });
};

module.exports = { runMigration };
