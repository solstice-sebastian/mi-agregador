const { msToDatetime } = require('@solstice.sebastian/helpers');

const withRoundedTimestamps = (tickers, seconds = 10) => {
  return tickers.map((ticker) => {
    const date = new Date(ticker.datetime);
    date.setSeconds(Math.round(date.getSeconds() / seconds) * seconds);
    const localTimestamp = date.getTime();
    const datetime = msToDatetime(localTimestamp);
    return {
      ...ticker,
      localTimestamp,
      datetime,
    };
  });
};

module.exports = { withRoundedTimestamps };
