const moment = require('moment');

/**
 * {
 *    "exchmkt_id": "7435",
 *    "mkt_name": "BTC/USD",
 *    "exch_code": "GDAX",
 *    "exch_name": "Global Digital Asset Exchange",
 *    "primary_currency_name": "United States Dollar",
 *    "secondary_currency_name": "Bitcoin",
 *    "server_time": "2016-07-03 16:19:05",
 *    "last_price": "662.51",
 *    "prev_price": "0",
 *    "high_trade": "705.2500000000",
 *    "low_trade": "652.0000000000",
 *    "current_volume": "6545.1788898100",
 *    "fiat_market": "1",
 *    "btc_volume": "6545.178889810000000000"
 * },
 */

class Ticker {
  constructor(data = {}) {
    this.id = +data.exchmkt_id;
    this.symbol = data.mkt_name;
    this.exchangeCode = data.exch_code;
    this.exchangeName = data.exch_name;
    this.primaryCurrencyName = data.primary_currency_name;
    this.secondaryCurrencyName = data.secondary_currency_name;
    this.serverTime = data.server_time;
    this.lastPrice = +data.last_price;
    this.prevPrice = +data.prev_price;
    this.highTrade = +data.high_trade;
    this.lowTrade = +data.low_trade;
    this.volume = +data.current_volume;
    this.fiatMarket = +data.fiat_market;
    this.btcVolume = +data.btc_volume;
  }

  parse(overrides = {}) {
    const toLocalTime = (utc) => {
      return moment(utc)
        .subtract(8, 'hours')
        .format('YYYY-MM-DD HH:mm:ss');
    };

    return Object.assign(
      {},
      {
        id: this.id,
        symbol: this.symbol,
        // exchangeCode: this.exchangeCode,
        timestamp: toLocalTime(this.serverTime), // to local
        lastPrice: this.lastPrice,
        // prevPrice: this.prevPrice,
        // highTrade: this.highTrade,
        // lowTrade: this.lowTrade,
        volume: this.volume,
        btcVolume: this.btcVolume,
      },
      overrides
    );
  }

  toHeaderRow() {
    const data = this.parse();
    delete data.id;
    delete data.symbol;
    return `${Object.keys(data).join(',')}\n`;
  }

  toRow() {
    const data = this.parse();
    delete data.id;
    delete data.symbol;
    return `${Object.values(data).join(',')}\n`;
  }
}

module.exports = Ticker;
