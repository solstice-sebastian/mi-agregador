const { roundTimestamp, msToDatetime } = require('@solstice.sebastian/helpers');

const withRoundedTimestamps = (tickers) => {
  return tickers.map((ticker) => {
    const localTimestamp = roundTimestamp(ticker.localTimestamp, 'seconds', 10);
    const datetime = msToDatetime(localTimestamp);
    return {
      ...ticker,
      localTimestamp,
      datetime,
    };
  });
};

module.exports = { withRoundedTimestamps };
