const express = require('express');
const httpism = require('httpism').raw.client(require('httpism/middleware/basicAuth'))
const http = require('http');
const https = require('https');
const net = require('net');
const logger = require('./logger');
const fs = require('fs')

var proxyLog = logger('proxy');

module.exports = function(httpPort = 8888, httpsPort = httpPort + 1) {
  const httpsHosts = new Set()

  Promise.all([
    httpServer(httpPort, httpsHosts, httpsPort),
    httpsServer(httpsPort),
  ]).then(() => {
    console.log(`proxy running on http://localhost:${httpPort}`)
  })

  var proxy = {httpism, httpsHosts};

  return proxy;
};

function handleError (req, res, url, error) {
  const message = error && error.stack || error
  proxyLog(req, message, {url});
  res.statusCode = 500
  res.setHeader('content-type', 'text/plain')
  res.end(message)
}

function httpServer (port, httpsHosts, httpsPort) {
  function forwardProxyRequest (req, res) {
    proxyLog(req);
    httpism.request(req.method, req.url, req, {headers: req.headers, responseBody: 'stream', response: true, exceptions: false }).then(function (response) {
      res.statusCode = response.statusCode
      Object.keys(response.headers).forEach(function (header) {
        res.setHeader(header, response.headers[header]);
      });
      response.body.pipe(res);
    }, function (error) {
      return handleError(req, res, req.url, error)
    });
  }

  var server = http.createServer(forwardProxyRequest)

  server.on('connect', (req, socket, head) => {
    var addr = req.url.split(':');
    const host = `${addr[0]}:${addr[1] || 443}`

    if (httpsHosts.has(host)) {
      addr = ['localhost', httpsPort]
    }

    var conn = net.connect(addr[1] || 443, addr[0], function() {
      socket.write('HTTP/' + req.httpVersion + ' 200 OK\r\n\r\n', 'UTF-8', function() {
        conn.pipe(socket);
        socket.pipe(conn);
      });
    });

    conn.on('error', function(e) {
      console.error("Server connection error: " + e, addr);
      socket.end();
    });
  });

  return new Promise((resolve, reject) => server.listen(port, function (err) {
    if (err) reject(err)
    else resolve()
  }))
}

function httpsServer (port) {
  function reverseProxyRequest (req, res) {
    const url = `https://${req.headers.host}${req.url}`

    proxyLog(req, undefined, {url});

    httpism.request(req.method, url, req, {headers: req.headers, responseBody: 'stream', response: true, exceptions: false }).then(function (response) {
      res.statusCode = response.statusCode
      Object.keys(response.headers).forEach(function (header) {
        res.setHeader(header, response.headers[header]);
      });
      response.body.pipe(res);
    }, function (error) {
      return handleError(req, res, url, error)
    });
  }

  const credentials = {
    key: fs.readFileSync(__dirname + '/server.key', 'utf-8'),
    cert: fs.readFileSync(__dirname + '/server.crt', 'utf-8'),
  }

  var server = https.createServer(credentials, reverseProxyRequest)
  return new Promise((resolve, reject) => server.listen(port, function (err) {
    if (err) reject(err)
    else resolve()
  }))
}
