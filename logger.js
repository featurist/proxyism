var colors = require('colors/safe');

var colorIndex = 0;
var allColors = [
  colors.green,
  colors.yellow,
  colors.blue,
  colors.magenta,
  colors.cyan,
  colors.red
];

function selectColor() {
  return allColors[colorIndex++ % allColors.length];
}

function logger() {
  var color = selectColor();
  return function (req, message, {url} = {}) {
    console.log(req.method + ' ' + (url || req.url) + color(message? ' => ' + message: ''));
  };
}

module.exports = logger;
