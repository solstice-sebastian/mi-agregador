const socketCluster = require('socketcluster-client');

const Stream = (config) => {
  const SCsocket = socketCluster.connect(config);

  SCsocket.on('error', (err) => {
    console.log(`connect err:`, err);
  });

  const connect = () => {
    return Promise.resolve(() => {
      SCsocket.on('connect', (/* status */) => {
        // console.log(`status:`, status);
      });
      return this;
    });
  };

  const auth = () => {
    return new Promise((res, rej) => {
      SCsocket.emit('auth', config, (err, token) => {
        if (err || !token) {
          rej(err);
        } else {
          res(token);
        }
      });
    });
  };

  const subscribe = (channel) => Promise.resolve(SCsocket.subscribe(channel));

  return { connect, auth, subscribe };
};

module.exports = Stream;
