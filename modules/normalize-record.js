const { roundTimestamp, msToDatetime } = require('@solstice.sebastian/helpers');
const { omit } = require('lodash');

const normalizeRecord = (record) => {
  const localTimestamp = roundTimestamp(record.localTimestamp, 'seconds', 10);
  const localDatetime = msToDatetime(localTimestamp);
  return {
    ...omit(record, ['datetime']),
    localTimestamp,
    localDatetime,
  };
};

module.exports = { normalizeRecord };
