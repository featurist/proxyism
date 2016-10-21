var regedit = require('regedit');
var ffi = require('ffi');

var wininet = new ffi.Library('wininet', {
  InternetSetOptionW: ['int32', ['int32', 'int32', 'int32', 'int32']]
});

var INTERNET_OPTION_SETTINGS_CHANGED = 39;
var INTERNET_OPTION_REFRESH = 37;

function updateInternet() {
  wininet.InternetSetOptionW(0, INTERNET_OPTION_SETTINGS_CHANGED, 0, 0);
  wininet.InternetSetOptionW(0, INTERNET_OPTION_REFRESH, 0, 0);
}

var key = 'HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings';

function putValue(settings) {
  return new Promise(function (fulfil, reject) {
    regedit.putValue(settings, function (error, result) {
      if (error) {
        reject(error);
      } else {
        fulfil(result);
      }
    });
  });
}

function list(key) {
  return new Promise(function (fulfil, reject) {
    regedit.list(key, function (error, result) {
      if (error) {
        reject(error);
      } else {
        fulfil(result);
      }
    });
  });
}

module.exports = function (host, port) {
  var haveOriginals = false;
  var originalProxyEnable, originalProxyServer;

  return {
    set: function () {
      var settings = {};
      settings[key] = {
        'ProxyEnable': {
          value: 1,
          type: 'REG_DWORD'
        },
        'ProxyServer': {
          value: 'localhost:8888',
          type: 'REG_SZ'
        }
      };

      if (haveOriginals) {
        return putValue(settings);
      } else {
        return list(key).then(function (values) {
          originalProxyEnable = values[key].values['ProxyEnable'];
          originalProxyServer = values[key].values['ProxyServer'];
          haveOriginals = true;
          return putValue(settings);
        }).then(function () {
          updateInternet();
        });
      }
    },

    unset: function () {
      var settings = {};
      settings[key] = {
        'ProxyEnable': originalProxyEnable,
        'ProxyServer': originalProxyServer
      };
      return putValue(settings).then(function () {
        updateInternet();
      });
    }
  };
};
