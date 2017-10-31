var fs = require('fs-promise');
var pass = require('stream').PassThrough;

function writeStreamToFile(filename, stream) {
  return new Promise((fulfil, reject) => {
    var file = fs.createWriteStream(filename);
    stream.on('error', reject);
    stream.on('end', fulfil);
    stream.pipe(file);
  });
}

module.exports = function (options) {
  var path = typeof options == 'object' && options.hasOwnProperty('path')? options.path: undefined;

  return {
    filename(url) {
      return path + '/' + encodeURIComponent(url);
    },

    responseExists(url) {
      return fs.exists(this.filename(url));
    },

    writeResponse(url, response) {
      var filename = this.filename(url);
      var body = response.body;
      delete response.body;

      var fileStream = new pass;
      var responseStream = new pass;

      body.pipe(fileStream);
      body.pipe(responseStream);

      var responseJson = JSON.stringify(response, null, 2);

      fs.mkdirs(path).then(function () {
        return Promise.all([
          fs.writeFile(filename + '.json', responseJson),
          writeStreamToFile(filename, fileStream)
        ]);
      }).catch(e => {
        console.error(e && e.stack || e);
      });

      response.body = responseStream;
      return response;
    },

    readResponse(url) {
      var filename = this.filename(url);

      return fs.readFile(filename + '.json', 'utf-8').then(contents => {
        var response = JSON.parse(contents);
        response.body = fs.createReadStream(filename);
        return response;
      });
    }
  };
};
