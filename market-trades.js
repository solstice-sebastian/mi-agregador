const moment = require('moment');
const Streamer = require('./modules/streamer.js');
const Logger = require('./modules/logger.js');
const MarketTrade = require('./models/market-trade.js');

const config = {
  hostname: 'sc-02.coinigy.com',
  port: '443',
  secure: 'true',
};

const humanNow = moment().format('YYYY-MM-DD_HH:MM:ss');
const channelName = 'TRADE-GDAX--BTC--USD';
const logFile = `data/MarketTrades/${channelName}/${humanNow}.csv`;

const headerRow = `${Object.keys(new MarketTrade().parse()).join(',')}\n`;
const logger = Logger({ path: logFile, outputType: 'csv', headerRow });

const stream = Streamer(config);

stream
  .connect()
  .then(() => stream.auth())
  .then(() => stream.subscribe(channelName))
  .then((channel) => {
    channel.watch((data) => {
      const trade = new MarketTrade(data);
      logger.log(trade.parse());
    });
  });
