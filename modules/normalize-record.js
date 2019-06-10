const { roundTimestamp, msToDatetime } = require('@solstice.sebastian/helpers');
const { omit } = require('lodash');
const { Double } = require('mongodb');

const normalizeRecord = (record) => {
  const localTimestamp = roundTimestamp(record.localTimestamp, 'seconds', 10);
  const localDatetime = msToDatetime(localTimestamp);
  return {
    ...omit(record, ['datetime', '_id']),
    price: new Double(record.price),
    volume: new Double(record.volume),
    btcVolume: new Double(record.btcVolume),
    highTrade: new Double(record.highTrade),
    lowTrade: new Double(record.lowTrade),
    localTimestamp,
    localDatetime,
  };
};

module.exports = { normalizeRecord };
