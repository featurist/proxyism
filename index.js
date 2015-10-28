var proxy = require('./proxy');
var logger = require('./logger');

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
  var path = process.cwd() + '/' + filename;
  return function (req, res, next) {
    log(req, filename);
    res.sendFile(path);
  };
};

module.exports = proxy;
