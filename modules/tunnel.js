/* eslint-disable import/no-extraneous-dependencies */
const tunnelSsh = require('tunnel-ssh');
const { promisify } = require('util');

const tunnel = async ({ username, privateKey, host }) => {
  const pTunnelSsh = promisify(tunnelSsh);
  const config = {
    username,
    privateKey,
    host,
    port: 22,
    dstPort: 27017,
  };
  const tnl = await pTunnelSsh(config);
  return tnl;
};

module.exports = { tunnel };
