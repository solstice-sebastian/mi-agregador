const moment = require('moment');
const fs = require('fs');
require('dotenv').config();
// const shell = require('shelljs');
const Poller = require('./modules/poller.js');
const Ticker = require('./models/ticker.js');

const apiKey = process.env.API_KEY;
const apiSecret = process.env.API_SECRET;

const headers = {
  'Content-Type': 'application/json',
  'X-API-KEY': apiKey,
  'X-API-SECRET': apiSecret,
};

const method = 'POST';
const endpoint = 'https://api.coinigy.com/api/v1/userWatchList';
const TIME_BETWEEN_REQUESTS = 1000 * 15;

const dataDir = 'data';
let conflictsCount = 0;
let prevServerTime;

// start clean
// shell.rm('-rf', 'data/');
let requestsCompleted = 0;
let isInitialRun = true;

const logScriptStart = () => {
  const path = 'progress.log';
  if (fs.existsSync(path) === false) {
    fs.writeFileSync(path, '');
  }
  const timestamp = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
  fs.appendFileSync(path, `starting script @ ${timestamp}\n`);
};
logScriptStart();

const onUpdate = (favorites) => {
  requestsCompleted += 1;
  const timestamp = moment(Date.now()).format('YYYY-MM-DD HH:mm:ss');
  // only log new data
  if (favorites[0].server_time === prevServerTime) {
    conflictsCount += 1;
    console.log(`conflictsCount:`, conflictsCount);
  } else {
    // new data
    const tickers = favorites.map((datum) => new Ticker(datum));
    // log to each file
    tickers.forEach((ticker) => {
      const filename = ticker.symbol.replace(/\//g, '_');
      const path = `${dataDir}/${filename}.csv`;

      if (isInitialRun) {
        // make dataDir if it doesnt exists
        if (fs.existsSync(dataDir) === false) {
          fs.mkdirSync(dataDir);
        }

        // create file + headerRow if it doesnt exist
        if (fs.existsSync(path) === false) {
          fs.writeFileSync(path, ticker.toHeaderRow());
        }
      }

      // file already exists - append
      fs.appendFileSync(path, ticker.toRow());
    });
  }

  console.log(`requestsCompleted: ${requestsCompleted} @ ${timestamp}`);
  prevServerTime = favorites[0].server_time;
  isInitialRun = false;
  return Promise.resolve();
};

const poller = Poller({ onUpdate, method, endpoint, headers, timeout: TIME_BETWEEN_REQUESTS });
poller.poll({});
