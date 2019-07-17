const MongoClient = require('mongodb');
const { readFileSync, readdirSync } = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { normalizeRecord } = require('../modules/normalize-record.js');

dotenv.config({});

const dataDir = path.resolve(__dirname, '..', 'data');
const files = readdirSync(dataDir);

const { MONGO_URL } = process.env;
const dbName = 'mi_agregador';

const getDb = async () => {
  const client = await MongoClient.connect(MONGO_URL, { useNewUrlParser: true });
  return client.db(dbName);
};

const insertedAlready = [];

const run = async () => {
  const db = await getDb();
  const errored = [];

  const _run = async (fileName) => {
    if (fileName === undefined) {
      process.exit(1);
    }
    const symbol = fileName.replace('.json', '');
    if (insertedAlready.includes(symbol) === false) {
      const coll = await db.collection(symbol);
      const inputJson = readFileSync(path.join(dataDir, fileName), { encoding: 'utf8' });
      const jsonData = JSON.parse(inputJson);
      try {
        if (jsonData.length && jsonData.length > 0) {
          await coll.insertMany(jsonData.map(normalizeRecord), { ordered: false });
          console.log(`${symbol}: successfully inserted ${jsonData.length} tickers`);
        }
      } catch (err) {
        console.log(`Error inserting for ${symbol}`, err);
        errored.push(symbol);
      }
    } else {
      console.log(`skipping ${symbol} because already inserted`);
    }
    _run(files.shift());
  };
  _run(files.shift());

  if (errored.length) {
    console.log(`errored => [${errored.join(', ')}]`);
  }
};

run();
