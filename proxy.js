var express = require('express');
var httpism = require('httpism').raw;
var http = require('http');
var net = require('net');
var logger = require('./logger');

var app = express();
var port = process.env.PORT || 8888;

var proxyLog = logger('proxy');

function proxyRequest(req, res) {
  // proxyLog(req);
  httpism.send(req.method, req.url, req, {headers: req.headers, responseBody: 'stream', exceptions: false }).then(function (response) {
    res.status(response.statusCode);
    Object.keys(response.headers).forEach(function (header) {
      res.header(header, response.headers[header]);
    });
    response.body.pipe(res);
  }, function (error) {
    proxyLog(req, error.message);
  });
}

var server = http.createServer(app);

server.on('connect', function(req, socket, head) {
  var addr = req.url.split(':');
  //creating TCP connection to remote server
  var conn = net.connect(addr[1] || 443, addr[0], function() {
    // tell the client that the connection is established
    socket.write('HTTP/' + req.httpVersion + ' 200 OK\r\n\r\n', 'UTF-8', function() {
      // creating pipes in both ends
      conn.pipe(socket);
      socket.pipe(conn);
    });
  });

  conn.on('error', function(e) {
    console.log("Server connection error: " + e, addr);
    socket.end();
  });
});

server.listen(port, function () {
  console.log('http://localhost:' + port + '/');
  app.use(function (req, res) {
    proxyRequest(req, res);
  });
});

var proxy = {};

['get', 'delete', 'post', 'put', 'patch', 'options'].forEach(function (method) {
  proxy[method] = function () {
    app[method].apply(app, arguments);
  };
});

module.exports = proxy;
