const fs = require('fs');
const Config = require('./private/config.js');
const Streamer = require('./modules/streamer.js');
const Logger = require('./modules/logger.js');
const Poller = require('./modules/poller.js');
const Ticker = require('./models/ticker.js');

// const Adapter = require('./modules/adapter.js');

const { /* apiKey, apiSecret, */ streamConfig } = Config();

// const headers = {
//   'Content-Type': 'application/json',
//   'X-API-KEY': apiKey,
//   'X-API-SECRET': apiSecret,
// };

// const channelName = 'TRADE-GDAX--BTC--USD';
// const jsonPath = 'data/btc.json';

// start fresh
// fs.writeFileSync(jsonPath, '');
// fs.writeFileSync(csvPath, '');

// const stream = Stream(streamConfig);

// path is relative to the logger file
// const csvLogger = Logger({ path: '../data/btc.csv', outputType: 'csv' });

// const db = Adapter.connectToDb(config);
// const isEmptyFile = true;

// const parse = (data) => {
//   const { label, price, timestamp, type } = data;
//   return { timestamp, price, label, type };
// };

let isEmptyFile = false;

// /**
//  * quick and dirty for now
//  */
// const tempLog = (data) => {
//   if (isEmptyFile) {
//     fs.writeFileSync('data/btc.csv', 'Label,Price,TradeType,Timestamp\n');
//     isEmptyFile = false;
//   } else {
//     const serialized = `${Object.values(parse(data)).join(',')}\n`;
//     // console.log(`serialized:`, serialized);
//     fs.appendFileSync('data/btc.csv', serialized);
//   }
// };

// stream
//   .connect()
//   .then(() => stream.auth())
//   .then(() => stream.subscribe(channelName))
//   .then((channel) => {
//     channel.watch((data) => {
//       csvLogger.log(parse(data));
//     });
//   });

const logFile = 'data/btc.csv';

if (isEmptyFile) {
  const headerRow = `${Object.keys(new Ticker().parse()).join(',')}\n`;
  fs.writeFileSync(logFile, headerRow);
  isEmptyFile = false;
}

const GDAX_BTC_USD_ID = 7435;

// start fresh
const onUpdate = (data) => {
  const tickers = data.map((datum) => new Ticker(datum));
  const btcTicker = tickers.find((ticker) => ticker.id === GDAX_BTC_USD_ID);
  // serialize
  const row = btcTicker.toCSVRow();
  // log to file
  // console.log(`row:`, row);
  fs.appendFileSync(logFile, row);
};

const poller = Poller({ onUpdate });
poller.poll({});
