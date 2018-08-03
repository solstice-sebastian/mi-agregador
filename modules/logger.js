const fs = require('fs');
const moment = require('moment');
const shell = require('shelljs');

const DATA_TYPE_JSON = 'json';
const DATA_TYPE_CSV = 'csv';

const humanNow = moment().format('YYYY-MM-DD_HH:MM:ss');

const Logger = ({
  path = `../data/${humanNow}.txt`,
  outputType = DATA_TYPE_JSON,
  encoding = 'utf8',
  headerRow = '',
  newFile = true,
}) => {
  if (fs.existsSync(path) === false) {
    // create the path
    const filename = path.split('/').pop();
    shell.mkdir('-p', path.replace(`/${filename}`, ''));
    // create file
    fs.writeFileSync(path, '');
  }

  // add headerRow?
  if (newFile && outputType === DATA_TYPE_CSV) {
    fs.appendFileSync(path, headerRow);
  }

  // no deserialization needed for csv since we just append
  const deserialize = () => {
    const data = fs.readFileSync(path, encoding);
    if (data.length > 0) {
      return JSON.parse(data);
    }
    return [];
  };

  const serialize = (deserialized) => {
    if (outputType === DATA_TYPE_JSON) {
      return JSON.stringify(deserialized);
    }

    // csv row
    return `${Object.values(deserialized).join(',')}\n`;
  };

  const log = (data) => {
    if (outputType === DATA_TYPE_CSV) {
      const serialized = serialize(data);
      fs.appendFileSync(path, serialized);
    } else if (outputType === DATA_TYPE_JSON) {
      // get old data
      const prev = deserialize(path);

      // combine prev/curr
      const agg = prev.concat([data]);
      const serialized = serialize(agg);
      fs.writeFileSync(path, serialized, encoding);
    } else {
      throw new Error('Logger: incorrect datatype');
    }
  };

  return { log };
};

module.exports = Logger;
