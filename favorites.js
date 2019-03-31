require('dotenv').config();
const { pick } = require('lodash');
const MongoClient = require('mongodb');
const Sentry = require('@sentry/node');
const { msToDatetime, roundTimestamp } = require('@solstice.sebastian/helpers');
const { TickerFetcher } = require('@solstice.sebastian/ticker-fetcher');
const { MS_PER_HOUR, Environment } = require('@solstice.sebastian/constants');
const { runMigration } = require('./migrate');

const apiKey = process.env.API_KEY;
const apiSecret = process.env.API_SECRET;
const { ENVIRONMENT, MONGO_URL, DB_NAME, SENTRY_PROJECT_ID, SENTRY_PUBLIC_KEY } = process.env;

if (ENVIRONMENT === Environment.PRODUCTION) {
  const dsn = `https://${SENTRY_PUBLIC_KEY}@sentry.io/${SENTRY_PROJECT_ID}`;
  Sentry.init({ dsn });
}

const TIME_BETWEEN_REQUESTS = 1000 * 10;

const getDb = async () => {
  const client = await MongoClient.connect(
    MONGO_URL,
    { useNewUrlParser: true }
  );
  return client.db(DB_NAME);
};

const normalize = (record) => {
  const localTimestamp = roundTimestamp(record.localTimestamp);
  const localDatetime = msToDatetime(localTimestamp);
  return {
    ...record,
    localTimestamp,
    localDatetime,
  };
};

const run = async () => {
  let requestsCompleted = 0;
  let lastRequestTimestamp = Date.now();

  const db = await getDb();
  const onUpdate = ({ tickerMap }) => {
    requestsCompleted += 1;
    lastRequestTimestamp = Date.now();
    const localDatetime = msToDatetime(Date.now());
    // log to each file
    tickerMap.forEach((ticker) => {
      const record = pick(ticker, [
        'price',
        'volume',
        'btcVolume',
        'highTrade',
        'lowTrade',
        'localTimestamp',
        'localDatetime',
      ]);
      db.collection(ticker.symbol).insertOne(normalize(record));
    });

    console.log(`requestsCompleted: ${requestsCompleted} @ ${localDatetime}`);
  };

  const fetcher = new TickerFetcher({ apiKey, apiSecret });
  fetcher.start({ timeout: TIME_BETWEEN_REQUESTS, onUpdate });

  const checkLatest = () => {
    if (Date.now() - lastRequestTimestamp > MS_PER_HOUR) {
      throw new Error('no update for last 1 hour');
    }
  };
  // check every 30 mins for last update call
  setInterval(checkLatest, MS_PER_HOUR / 2);
};

runMigration.then(() => {
  run();
});
