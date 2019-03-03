require('dotenv').config();
const fs = require('fs');
const { omit } = require('lodash');
const { msToDatetime } = require('@solstice.sebastian/helpers');
const Ticker = require('@solstice.sebastian/ticker');
const Poller = require('./modules/poller.js');

const apiKey = process.env.API_KEY;
const apiSecret = process.env.API_SECRET;
const { STORAGE_PATH } = process.env;

const headers = {
  'Content-Type': 'application/json',
  'X-API-KEY': apiKey,
  'X-API-SECRET': apiSecret,
};

const method = 'POST';
const endpoint = 'https://api.coinigy.com/api/v1/userWatchList';
const TIME_BETWEEN_REQUESTS = 1000 * 10;

const dataDir = STORAGE_PATH;

let requestsCompleted = 0;
let isInitialRun = true;

const logScriptStart = () => {
  const path = 'progress.log';
  if (fs.existsSync(path) === false) {
    fs.writeFileSync(path, '');
  }
  const timestamp = msToDatetime(Date.now());
  fs.appendFileSync(path, `starting script @ ${timestamp}\n`);
};
logScriptStart();

const toRow = (vals) => `${vals.join(',')}\n`;

const onUpdate = (favorites) => {
  requestsCompleted += 1;
  const timestamp = msToDatetime(Date.now());
  const tickers = favorites.map((datum) => new Ticker(datum));
  // log to each file
  tickers.forEach((ticker) => {
    const filename = ticker.mktName.replace(/\//g, '_');
    const path = `${dataDir}/${filename}.csv`;
    const record = omit(ticker.toRecord(), ['symbol', 'exchangeCode']);

    if (isInitialRun) {
      // make dataDir if it doesnt exists
      if (fs.existsSync(dataDir) === false) {
        console.log(`creating ${dataDir}`);
        fs.mkdirSync(dataDir);
      } else {
        console.log(`${dataDir} already exists`);
      }

      // create file + headerRow if it doesnt exist
      if (fs.existsSync(path) === false) {
        fs.writeFileSync(path, toRow(Object.keys(record)));
      }
    }

    // file already exists - append
    fs.appendFileSync(path, toRow(Object.values(record)));
  });

  console.log(`requestsCompleted: ${requestsCompleted} @ ${timestamp}`);
  isInitialRun = false;
  return Promise.resolve();
};

process.on('error', (error) => {
  console.log('exiting with error:', error);
});

const poller = Poller({ onUpdate, method, endpoint, headers, timeout: TIME_BETWEEN_REQUESTS });
poller.poll({});
