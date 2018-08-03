/**
 * {
 *   "market_history_id": 154664651494,
 *   "exchange": "GDAX",
 *   "marketid": 0,
 *   "label": "BTC/USD",
 *   "tradeid": "5240534181",
 *   "time": "2018-02-26T01:26:52",
 *   "price": 9674.99,
 *   "quantity": 0.5424,
 *   "total": 5247.714576,
 *   "timestamp": "2018-02-26T01:26:52Z",
 *   "time_local": "2018-02-26 01:26:52",
 *   "type": "SELL",
 *   "exchId": 0,
 *   "channel": "TRADE-GDAX--BTC--USD"
 * }
 */

class MarketTrade {
  constructor(data = {}) {
    this.id = data.market_history_id;
    this.exchange = data.exchange;
    this.marketId = data.marketid;
    this.symbol = data.label;
    this.tradeId = data.tradeid;
    this.time = data.time;
    this.price = data.price;
    this.quantity = data.quantity;
    this.amountPaid = data.total;
    this.timestamp = data.timestamp;
    this.localTime = data.time_local;
    this.orderType = data.type;
    this.exchId = data.exchId;
    this.channel = data.channel;
  }

  parse() {
    return Object.assign(
      {},
      {
        exchange: this.exchange,
        symbol: this.symbol,
        price: this.price,
        quantity: this.quantity,
        amountPaid: this.amountPaid,
        timestamp: this.localTime,
        orderType: this.orderType,
      }
    );
  }
}

module.exports = MarketTrade;
