var debug = require('debug')('httpism:cache');
var fileStore = require('./fileStore');

function createStore(options) {
  var storeOptions = typeof options == 'object' && options.hasOwnProperty('store')? options.store: {type: 'fs', path: 'http-cache'};

  var storeConstructor = storeTypes[storeOptions.type];

  if (!storeConstructor) {
    throw new Error('no such store type: ' + storeOptions.type);
  }

  return storeConstructor(storeOptions);
}

module.exports = function(options) {
  var store = createStore(options);
  var isResponseCachable = typeof options == 'object' && options.hasOwnProperty('isResponseCachable')? options.isResponseCachable: (response) => {
    console.log(response.statusCode);
    return response.statusCode >= 200 && response.statusCode < 400;
  };

  var httpismCache = function(req, next) {
    var url = req.url;

    return store.responseExists(url).then(exists => {
      if (exists) {
        debug('hit', url);
        return store.readResponse(url);
      } else {
        debug('miss', url);
        return next().then(function (response) {
          if (isResponseCachable(response)) {
            console.log('storing', url);
            return store.writeResponse(url, response);
          } else {
            console.log('not storing', url);
            return response;
          }
        });
      }
    });
  };

  httpismCache.middleware = 'cache';
  httpismCache.before = ['debugLog', 'http'];

  return httpismCache;
};

var storeTypes = {
  'fs': fileStore
};
