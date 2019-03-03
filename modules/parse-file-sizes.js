const fs = require('fs');

const filePath = '/Users/aric/Downloads/file-sizes.txt';
const outputPath = '/Users/aric/Downloads/file-sizes.csv';

const unitMap = {
  K: 1000,
  M: 1000 * 1000,
  G: 1000 * 1000 * 1000,
};

const data = fs.readFileSync(filePath, 'utf8');
const csv = data
  .split('\n')
  .reduce((acc, row) => {
    const [size, filename] = row.split('\t');
    if (parseFloat(size) > 0) {
      const unit = size.replace(/\d/g, '').replace(/\./g, '');
      const value = parseFloat(size);
      acc.push(`${value * unitMap[unit]},${size},${filename}`);
    }
    return acc;
  }, [])
  .join('\n');

fs.writeFileSync(outputPath, csv, 'utf8');
