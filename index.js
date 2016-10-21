var proxy = require('./proxy');
var logger = require('./logger');
var systemProxy = require('system-proxy');
var proxySettings = require('./windowsProxySettings')('localhost', 8888);
var pathUtils = require('path');

console.log('setting proxy: localhost:8888');
proxySettings.set();

process.on('SIGINT', function() {
  proxySettings.unset().then(function () {
    console.log('resetting proxy');
    process.exit();
  });
});

proxy.getImage = function(fn) {
  this.get('*', function (req, res, next) {
    if (/\.(jpg|png|gif|jpeg|tiff)$/.test(req.url)) {
      return fn(req, res, next);
    } else {
      next();
    }
  });
};

proxy.delay = function(n) {
  var log = logger('delay');
  return function (req, res, next) {
    log(req, 'delay ' + n);
    setTimeout(next, n);
  };
};

proxy.file = function(filename) {
  var log = logger('file');
  var path = pathUtils.resolve(process.cwd(), filename);
  return function (req, res, next) {
    log(req, filename);
    res.sendFile(path);
  };
};

module.exports = proxy;
