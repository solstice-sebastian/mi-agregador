require('dotenv').config();
const MongoClient = require('mongodb');
const { readFileSync } = require('fs');
const { tunnel } = require('../modules/tunnel');

const {
  MONGO_URL,
  PRODUCTION_MONGO_URL,
  DB_NAME,
  SSH_USERNAME,
  SSH_KEY_PATH,
  SSH_HOST,
} = process.env;

tunnel({
  username: SSH_USERNAME,
  privateKey: readFileSync(SSH_KEY_PATH, 'utf8'),
  host: SSH_HOST,
})
  .then(async () => {
    const mongoUrl = PRODUCTION_MONGO_URL;
    const client = await MongoClient.connect(mongoUrl, { useNewUrlParser: true });
    const db = await client.db(DB_NAME);
    const testColl = await db.collection('ADABTC');
    const count = await testColl.countDocuments();
    console.log(`found ${count} documents for ADABTC`);
  })
  .catch((err) => {
    console.log('unable to ssh tunnel in');
    console.log(err);
  });
