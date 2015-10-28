var colors = require('colors/safe');

var colorIndex = 0;
var colors = [
  colors.green,
  colors.yellow,
  colors.blue,
  colors.magenta,
  colors.cyan,
  colors.red
];

function selectColor() {
  return colors[colorIndex++ % colors.length];
}

function logger(name) {
  var color = selectColor();
  return function (req, message) {
    console.log(req.method + ' ' + req.url + color(message? ' => ' + message: ''));
  };
}

module.exports = logger;
