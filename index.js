const urlUtils = require('url')
const startProxy = require('./proxy');
const logger = require('./logger');
const systemProxy = require('system-proxy');
const pathUtils = require('path');
const cache = require('./cache');
const minimatch = require('minimatch');
const fs = require('fs');
const MemoryStream = require('memorystream');
const {URL} = require('url')
const mimeTypes = require('mime-types')

const port = 8888;
const proxy = startProxy(port);

systemProxy.setProxyOn('localhost', port).then(() => {
  console.log(`set proxy: http://localhost:${port}/`);
});

process.on('SIGINT', function() {
  systemProxy.setProxyOff().then(function () {
    console.log('resetting proxy');
    process.exit();
  });
});

function stringStream (s) {
  const streamBody = new MemoryStream()
  streamBody.end(s)
  return streamBody
}

async function coerceResponse (responsePromise) {
  const response = (await responsePromise) || {}

  if (!response.headers) {
    response.headers = {}
  }

  if (typeof response.body === 'string') {
    response.body = stringStream(response.body)
    response.headers['content-type'] = 'text/plain'
  } else if (typeof response.body === 'object' && typeof response.body.pipe !== 'function') {
    response.body = stringStream(JSON.stringify(response.body, null, 2))
    response.headers['content-type'] = 'application/json'
  } else if (response.body === undefined) {
    response.body = stringStream('')
    response.headers['content-type'] = 'text/plain'
  }

  if (!response.statusCode) {
    response.statusCode = 200
  }

  return response
}

proxy.getImage = function (fn) {
  var log = logger('delay');
  this.httpism.use((request, next, httpism) => {
    if (/\.(jpg|png|gif|jpeg|tiff|svg)$/.test(request.url)) {
      log(request, 'get image ' + request.url);
      return coerceResponse(fn(request, next, httpism))
    } else {
      return next()
    }
  })
}

function wait (n) {
  return new Promise(resolve => setTimeout(resolve, n))
}

proxy.delay = function (n, fn) {
  var log = logger('delay');
  return async (request, next, httpism) => {
    await wait(n)
    log(request, 'delay ' + n);

    if (fn) {
      return coerceResponse(fn(request, next, httpism))
    } else {
      return next()
    }
  };
};

proxy.file = function(filename) {
  var log = logger('file');
  var path = pathUtils.resolve(process.cwd(), filename);
  return (request, next) => {
    log(request, filename)
    return {
      statusCode: 200,
      headers: {
        'content-type': mimeTypes.lookup(filename)
      },
      body: fs.createReadStream(path),
    }
  };
};

function addHttpsHost (url) {
  var u = new URL(url)
  if (u.protocol === 'https:') {
    const [hostname, port] = u.host.split(':')
    proxy.httpsHosts.add(`${hostname}:${port || 443}`)
  }
}

proxy.url = function (url, middleware) {
  addHttpsHost(url)
  this.httpism.use(filter(undefined, url, middleware));
}

proxy.baseUrl = function (baseUrl, middleware) {
  addHttpsHost(baseUrl)
  this.httpism.use(filter(undefined, baseUrl, middleware, {baseUrl: true}));
}

proxy.pass = function (baseUrl) {
  var log = logger('pass');

  return (request, next, httpism) => {
    log(request, baseUrl)

    request.headers.host = urlUtils.parse(baseUrl).host
    request.url = baseUrl + (request.relativeUrl ? request.relativeUrl : '')

    return next()
  };
}

function filter(method, url, middleware, {baseUrl = false} = {}) {
  if (!middleware) {
    middleware = url;
    url = method;
    method = undefined;
  }

  return async function (request, next, httpism) {
    const requestUrl = removeUrlParameters(request.url)

    if ((!method || request.method.toLowerCase() == method.toLowerCase()) && (minimatch(requestUrl, url) || (baseUrl && minimatch(requestUrl, url + '/**')))) {
      if (baseUrl) {
        request.relativeUrl = request.url.substring(url.length)
      }

      return coerceResponse(middleware(request, next, httpism))
    } else {
      return next();
    }
  };
}

function removeUrlParameters (url) {
  const urlWithoutParams = new URL(url)
  urlWithoutParams.search = ''
  return urlWithoutParams.href
}

proxy.cache = function(url, options) {
  this.httpism.use(filter(url, cache(options)));
};

module.exports = proxy;
