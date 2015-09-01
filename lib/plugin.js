var _ = require('lodash');
var Sauce = require('./sauce');
var Q = require('q');


function expandCredentials(opts) {
  if (!opts.username) {
    opts.username = process.env.SAUCE_USERNAME;
  }
  if (!opts.accessKey) {
    opts.accessKey = process.env.SAUCE_ACCESS_KEY;
  }
  if (!opts.username || !opts.accessKey) {
    throw Error('Missing Sauce credentials. Did you forget to set SAUCE_USERNAME and/or SAUCE_ACCESS_KEY?');
  }
}

module.exports = function(gemini, opts) {
  var sauce = Sauce();

  expandCredentials(opts);

  gemini.on('startRunner', function(runner) {
    var deferred = Q.defer();

    sauce.start(opts, function(config) {

      _.forEach(gemini.config._browsers, function(browser) {
        browser.gridUrl = config.gridUrl;
        browser.desiredCapabilities['tunnel-identifier'] = config.tunnelId;
      });

      deferred.resolve();
    });

    return deferred.promise;
  });

  gemini.on('endRunner', function(runner, data) {
    var deferred = Q.defer();

    sauce.stop(function() {
      deferred.resolve();
    });

    return deferred.promise;
  });
};
