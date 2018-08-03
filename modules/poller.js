const fetch = require('node-fetch');

/**
 * @param timeout amount of time inbetween responses and next 'poll'
 * @param onUpdate the callback that the data will be passed to
 */
const Poller = ({ method, headers, endpoint, onUpdate, timeout = 1000 }) => {
  // set the poll machine in motion
  const poll = ({ continuous = true }) => {
    return fetch(endpoint, { method, headers })
      .then((response) => {
        return response.json();
      })
      .then((json) => {
        return onUpdate(json.data);
      })
      .then(() => {
        if (continuous) {
          setTimeout(() => {
            poll(...arguments);
          }, timeout);
        }
      })
      .catch((err) => err);
  };

  return { poll };
};

module.exports = Poller;
