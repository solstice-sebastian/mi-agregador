const MongoClient = require('mongodb');
const { writeFileSync } = require('fs');
const dotenv = require('dotenv');
const { resolve } = require('path');

dotenv.config({});

const { MONGO_URL } = process.env;
const collName = 'all_results';
const dbName = 'cadence_simulator';
const outputPath = resolve(__dirname, '..', 'data', `${collName}.json`);

const getDb = async () => {
  const client = await MongoClient.connect(
    MONGO_URL,
    { useNewUrlParser: true }
  );
  return client.db(dbName);
};

const run = async () => {
  const db = await getDb();
  const coll = await db.collection(collName);
  const docs = await coll.find({}).toArray();
  const jsonData = JSON.stringify(docs, null, 2);
  writeFileSync(outputPath, jsonData, 'utf8');
  process.exit(1);
};

run();
